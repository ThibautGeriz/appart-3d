import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ApartmentDef } from "../data/apartment";
import { apartmentBounds } from "../apartment/plan";
import { finishSize, surfaceMaterial } from "../apartment/textures";
import { applyWorldUVs } from "../apartment/uv";
import {
  clockToSolarHour,
  dayOfYear,
  daylight,
  solarPosition,
  sunDirection,
  type Rgb,
} from "./sun";

export interface SunState {
  /** 0 = January */
  month: number;
  /** wall-clock hour, e.g. 14.5 = 14:30 */
  hour: number;
}

export interface Lighting {
  setTime(state: SunState): void;
}

const SHADOW_EXTENT = 9; // half-size of the shadow camera, covers the whole plan
const SUN_DISTANCE = 40;

const toColor = (rgb: Rgb) => new THREE.Color(rgb[0], rgb[1], rgb[2]);

/** Deterministic pseudo-random generator, so the surroundings never change. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Street level, the building below us, neighbor blocks and trees. Cheap and static. */
function buildSurroundings(def: ApartmentDef): THREE.Group {
  const group = new THREE.Group();
  const groundY = -def.site.floorElevation;
  const b = apartmentBounds(def);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;

  const groundGeometry = new THREE.PlaneGeometry(800, 800);
  groundGeometry.rotateX(-Math.PI / 2);
  groundGeometry.translate(cx, groundY, cz);
  applyWorldUVs(groundGeometry, finishSize("grass"));
  group.add(new THREE.Mesh(groundGeometry, surfaceMaterial("#8a917c", "grass")));

  const facadeSize = finishSize("facade");

  // Our own building, below the apartment floor (also the balcony slab)
  // One block under each room, so the footprint follows the plan
  const facades: THREE.BufferGeometry[] = def.areas.map(({ rect }) => {
    const [minX, minZ, maxX, maxZ] = rect;
    const block = new THREE.BoxGeometry(
      maxX - minX + 0.5,
      def.site.floorElevation,
      maxZ - minZ + 0.5,
    );
    block.translate((minX + maxX) / 2, groundY / 2 - 0.02, (minZ + maxZ) / 2);
    applyWorldUVs(block, facadeSize, [0, groundY, 0]);
    return block;
  });
  const trees: THREE.BufferGeometry[] = [];

  const random = seeded(42);
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + random() * 0.2;
    const distance = 60 + random() * 60;
    // whole bays (2.5 m) and storeys (3 m), so the façade windows line up
    const w = facadeSize[0] * (5 + Math.floor(random() * 7));
    const d = facadeSize[0] * (4 + Math.floor(random() * 5));
    const h = facadeSize[1] * (3 + Math.floor(random() * 5));
    const block = new THREE.BoxGeometry(w, h, d);
    applyWorldUVs(block, facadeSize, [-w / 2, -h / 2, -d / 2]);
    block.rotateY(angle);
    block.translate(
      cx + Math.cos(angle) * distance,
      groundY + h / 2,
      cz + Math.sin(angle) * distance,
    );
    facades.push(block);
  }
  for (let i = 0; i < 40; i++) {
    const angle = random() * Math.PI * 2;
    const distance = 18 + random() * 30;
    const r = 2 + random() * 2;
    const canopy = new THREE.IcosahedronGeometry(r, 1);
    canopy.translate(
      cx + Math.cos(angle) * distance,
      groundY + 2.5 + r,
      cz + Math.sin(angle) * distance,
    );
    trees.push(canopy);
  }
  group.add(new THREE.Mesh(mergeGeometries(facades), surfaceMaterial("#e3dccf", "facade")));
  group.add(
    new THREE.Mesh(
      mergeGeometries(trees),
      new THREE.MeshLambertMaterial({ color: "#5d7a45", flatShading: true }),
    ),
  );
  return group;
}

const SKY_RADIUS = 450;

/** Gradient sky dome (zenith → horizon → darker below), recolored via uniforms. */
function createSkyDome(): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      zenith: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
    },
    vertexShader: /* glsl */ `
      varying float vHeight;
      void main() {
        vHeight = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 zenith;
      uniform vec3 horizon;
      varying float vHeight;
      void main() {
        float up = clamp(vHeight, 0.0, 1.0);
        vec3 color = vHeight >= 0.0
          ? mix(horizon, zenith, pow(up, 0.6))
          : horizon * mix(0.8, 0.5, clamp(-vHeight * 4.0, 0.0, 1.0));
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 32, 16), material);
  dome.renderOrder = -1;
  return dome;
}

/**
 * Physically placed sun (date, hour, latitude, building orientation) with
 * shadows, sky and hemisphere light. Shadows are static: the shadow map is
 * only re-rendered when the time changes, so the cost per frame stays low.
 */
export function createLighting(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  def: ApartmentDef,
  isTouch: boolean,
): Lighting {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.NeutralToneMapping;

  const b = apartmentBounds(def);
  const center = new THREE.Vector3((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);

  const hemisphere = new THREE.HemisphereLight();
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(isTouch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, {
    left: -SHADOW_EXTENT,
    right: SHADOW_EXTENT,
    top: SHADOW_EXTENT,
    bottom: -SHADOW_EXTENT,
    near: 1,
    far: SUN_DISTANCE * 2,
  });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.target.position.copy(center);
  scene.add(sun, sun.target);

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(4, 16, 8),
    new THREE.MeshBasicMaterial({ color: "#fff4d6", fog: false }),
  );
  scene.add(sunDisc);

  const sky = createSkyDome();
  sky.position.copy(center);
  scene.add(sky);
  scene.fog = new THREE.Fog("#ffffff", 120, SKY_RADIUS);

  scene.add(buildSurroundings(def));

  return {
    setTime({ month, hour }) {
      const day = dayOfYear(month, 21);
      // Legal offset of the viewer's time zone on that date (summer/winter time)
      const utcOffset = -new Date(new Date().getFullYear(), month, 21, 12).getTimezoneOffset() / 60;
      const solarHour = clockToSolarHour(hour, def.site.longitude, utcOffset);
      const position = solarPosition(day, solarHour, def.site.latitude);
      const dir = sunDirection(position, def.site.northAngleDeg);
      const light = daylight(position.elevation);

      sun.position.set(
        center.x + dir.x * SUN_DISTANCE,
        dir.y * SUN_DISTANCE,
        center.z + dir.z * SUN_DISTANCE,
      );
      sun.intensity = light.sun;
      sun.color.copy(toColor(light.sunColor));
      sun.visible = light.sun > 0;
      sunDisc.position.set(center.x + dir.x * 300, dir.y * 300, center.z + dir.z * 300);
      sunDisc.visible = position.elevation > -0.02;

      hemisphere.intensity = light.ambient;
      hemisphere.color.copy(toColor(light.ambientSky));
      hemisphere.groundColor.copy(toColor(light.ambientGround));

      sky.material.uniforms.zenith.value.copy(toColor(light.skyZenith));
      sky.material.uniforms.horizon.value.copy(toColor(light.skyHorizon));
      (scene.fog as THREE.Fog).color.copy(toColor(light.skyHorizon));
      renderer.shadowMap.needsUpdate = true;
    },
  };
}
