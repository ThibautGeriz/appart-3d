import * as THREE from "three";
import type { ApartmentDef, Facing, LightDef } from "../data/apartment";
import { ceilingAt, roomRectsAt } from "../apartment/plan";
import { initRoomMask, setRoomMask } from "./roomMask";
import { facingVector } from "../apartment/facing";

export { facingVector };

const WARM = new THREE.Color("#ffd8a8");
const LIT = new THREE.Color("#fff3df");
const UNLIT = new THREE.Color("#d9d6d0");
const POOL_DESKTOP = 8;
const POOL_TOUCH = 4;

export interface Fixtures {
  group: THREE.Group;
  setOn(on: boolean): void;
  /** move the point-light pool to the fixtures nearest the player */
  update(x: number, z: number): void;
}

/** Where a fixture's light comes from, in 3D. Pure. */
export function lightPosition(def: ApartmentDef, light: LightDef): [number, number, number] {
  if (light.kind === "ceiling") return [light.x, ceilingAt(def, light.x, light.z) - 0.15, light.z];
  const [fx, fz] = facingVector(light.facing);
  const out = light.kind === "strip" ? 0.25 : 0.15;
  return [light.x + fx * out, light.y - 0.05, light.z + fz * out];
}

/** Indices of the `count` lights closest to (x, z), nearest first. Pure. */
export function nearestLights(
  positions: [number, number, number][],
  x: number,
  z: number,
  count: number,
): number[] {
  return positions
    .map((p, i) => ({ i, d: (p[0] - x) ** 2 + (p[2] - z) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map(({ i }) => i);
}

/** Soft glow painted on the wall: an up/down "wash" (sconce) or a downward fade (strip). */
function glowTexture(kind: "sconce" | "strip"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  if (kind === "sconce") {
    // One tall ellipse that fades to zero before every edge (no hard borders)
    ctx.scale(1, 2);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.35, "rgba(255,255,255,0.4)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.35, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 256);
    // fade the ends
    const ends = ctx.createLinearGradient(0, 0, 128, 0);
    ends.addColorStop(0, "rgba(0,0,0,1)");
    ends.addColorStop(0.08, "rgba(0,0,0,0)");
    ends.addColorStop(0.92, "rgba(0,0,0,0)");
    ends.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = ends;
    ctx.fillRect(0, 0, 128, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Plane lying on the wall face, centered at (x, y, z), facing `facing`. */
function onWall(mesh: THREE.Object3D, facing: Facing, x: number, y: number, z: number): void {
  const [fx, fz] = facingVector(facing);
  mesh.position.set(x + fx * 0.004, y, z + fz * 0.004);
  mesh.rotation.y = Math.atan2(fx, fz);
}

/**
 * Light fixtures (ceiling lights, sconces, LED strip): glowing fittings,
 * additive wall-wash decals, and a fixed pool of point lights reassigned to
 * the fixtures nearest the player, so the per-frame cost does not grow with
 * the number of fixtures (and shaders never recompile).
 */
export function buildFixtures(def: ApartmentDef, isTouch: boolean): Fixtures {
  const group = new THREE.Group();
  const fittingMaterial = new THREE.MeshBasicMaterial({ color: LIT.clone() });
  const glowMaterials = {
    sconce: new THREE.MeshBasicMaterial({
      map: glowTexture("sconce"),
      color: WARM,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    strip: new THREE.MeshBasicMaterial({
      map: glowTexture("strip"),
      color: WARM,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };
  const glows: THREE.Mesh[] = [];

  for (const light of def.lights) {
    if (light.kind === "ceiling") {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.025, 24),
        fittingMaterial,
      );
      disc.position.set(light.x, ceilingAt(def, light.x, light.z) - 0.0125, light.z);
      group.add(disc);
    } else if (light.kind === "sconce") {
      const [fx, fz] = facingVector(light.facing);
      const along = fx === 0;
      const fitting = new THREE.Mesh(
        new THREE.BoxGeometry(along ? 0.1 : 0.06, 0.18, along ? 0.06 : 0.1),
        fittingMaterial,
      );
      fitting.position.set(light.x + fx * 0.03, light.y, light.z + fz * 0.03);
      group.add(fitting);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), glowMaterials.sconce);
      onWall(glow, light.facing, light.x, light.y, light.z);
      glows.push(glow);
    } else {
      const [fx, fz] = facingVector(light.facing);
      const along = fx === 0;
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(along ? light.length : 0.03, 0.01, along ? 0.03 : light.length),
        fittingMaterial,
      );
      strip.position.set(light.x + fx * 0.3, light.y - 0.035, light.z + fz * 0.3);
      group.add(strip);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(light.length, 0.75), glowMaterials.strip);
      onWall(glow, light.facing, light.x, light.y - 0.375, light.z);
      glows.push(glow);
    }
  }
  group.add(...glows);

  const positions = def.lights.map((light) => lightPosition(def, light));
  const pool = Array.from(
    { length: Math.min(isTouch ? POOL_TOUCH : POOL_DESKTOP, positions.length) },
    () => {
      const point = new THREE.PointLight(WARM, 0, 5.5, 2);
      group.add(point);
      return point;
    },
  );

  // Each light only lights its own room (no light through walls)
  const rooms = positions.map(([x, , z]) => roomRectsAt(def, x, z));
  initRoomMask(pool.length);

  let on = true;
  let assigned = "";
  return {
    group,
    setOn(value) {
      on = value;
      fittingMaterial.color.copy(on ? LIT : UNLIT);
      for (const glow of glows) glow.visible = on;
      assigned = ""; // force the pool to refresh
    },
    update(x, z) {
      const nearest = nearestLights(positions, x, z, pool.length);
      const key = nearest.join(",");
      if (key === assigned) return;
      assigned = key;
      nearest.forEach((index, i) => {
        const light = def.lights[index];
        pool[i].position.set(...positions[index]);
        setRoomMask(i, rooms[index]);
        // intensity 0 instead of removing the light: the light count stays constant
        pool[i].intensity = on ? (light.kind === "ceiling" ? 3.2 : 1.2) : 0;
      });
    },
  };
}
