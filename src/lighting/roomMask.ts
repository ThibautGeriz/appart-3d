import * as THREE from "three";
import type { Rect } from "../data/apartment";

/**
 * Keep each interior light inside its room.
 *
 * Point lights cast no shadows (too costly on mobile), so without this a lamp
 * lights the floor and walls on the other side of a partition. Each pooled
 * point light gets the rectangles of its room; a small patch of the Lambert
 * shader multiplies the light by "is this fragment inside one of them?".
 * Cheap: two rectangle tests per light per fragment, no extra render pass.
 */

/** Rectangles per light (rooms are at most two areas, e.g. séjour + its lowered band). */
export const MAX_ROOM_RECTS = 2;
/** Walls sit on the area edges: grow the rect a little so the room's own wall faces stay lit. */
const MARGIN = 0.05;
const EVERYWHERE = new THREE.Vector4(-1e5, -1e5, 1e5, 1e5);
const NOWHERE = new THREE.Vector4(1e5, 1e5, -1e5, -1e5);

const uniforms = {
  pointLightRoomA: { value: [] as THREE.Vector4[] },
  pointLightRoomB: { value: [] as THREE.Vector4[] },
  /** baked surfaces: the daylight the lightmap is scaled by (colour × intensity) */
  bakedLight: { value: new THREE.Color(1, 1, 1) },
  /** baked surfaces: the lamps' indirect light, added flat (it does not come from the windows) */
  bakedLamp: { value: new THREE.Color(0, 0, 0) },
};

/** Indirect light of baked surfaces: daylight (scales the lightmap) and the lamps' bounce (flat). */
export function setBakedLight(
  day: THREE.Color,
  dayIntensity: number,
  lamp: THREE.Color,
  lampIntensity: number,
): void {
  uniforms.bakedLight.value.copy(day).multiplyScalar(dayIntensity);
  uniforms.bakedLamp.value.copy(lamp).multiplyScalar(lampIntensity);
}

/**
 * Per-material reflection probe: the room's captured environment, projected
 * onto the room's box (parallax-corrected) so reflections line up with the
 * real walls and windows.
 */
export interface ProbeUniforms {
  probeBoxMin: { value: THREE.Vector3 };
  probeBoxMax: { value: THREE.Vector3 };
  probePosition: { value: THREE.Vector3 };
}

/** Strength of the room probes' light on the furniture. */
const PROBE_INTENSITY = 1.3;

/**
 * Give a material a room probe (envMap + box). The material then takes its
 * indirect light from the probe (or its lightmap): the hemisphere fill is off.
 */
export function setProbe(
  material: THREE.MeshStandardMaterial,
  envMap: THREE.Texture,
  min: THREE.Vector3,
  max: THREE.Vector3,
  position: THREE.Vector3,
): void {
  const u = (material.userData.probe ??= {
    probeBoxMin: { value: new THREE.Vector3() },
    probeBoxMax: { value: new THREE.Vector3() },
    probePosition: { value: new THREE.Vector3() },
  }) as ProbeUniforms;
  u.probeBoxMin.value.copy(min);
  u.probeBoxMax.value.copy(max);
  u.probePosition.value.copy(position);
  if (material.envMap !== envMap) {
    material.envMap = envMap;
    material.needsUpdate = true;
  }
  // one capture point under-reads the light reaching an object: a little more than 1
  material.envMapIntensity = PROBE_INTENSITY;
}

/** Rects as (minX, minZ, maxX, maxZ) vectors, grown by the margin, padded to MAX_ROOM_RECTS. Pure. */
export function maskRects(rects: Rect[]): [number, number, number, number][] {
  if (rects.length === 0)
    return [
      [-1e5, -1e5, 1e5, 1e5],
      [1e5, 1e5, -1e5, -1e5],
    ];
  if (rects.length > MAX_ROOM_RECTS)
    throw new Error(`room has ${rects.length} areas, max ${MAX_ROOM_RECTS}`);
  const grown = rects.map(
    ([minX, minZ, maxX, maxZ]) =>
      [minX - MARGIN, minZ - MARGIN, maxX + MARGIN, maxZ + MARGIN] as [
        number,
        number,
        number,
        number,
      ],
  );
  while (grown.length < MAX_ROOM_RECTS) grown.push([1e5, 1e5, -1e5, -1e5]);
  return grown;
}

/** Size the uniform arrays for the point-light pool (everything unmasked). */
export function initRoomMask(poolSize: number): void {
  uniforms.pointLightRoomA.value = Array.from({ length: poolSize }, () => EVERYWHERE.clone());
  uniforms.pointLightRoomB.value = Array.from({ length: poolSize }, () => NOWHERE.clone());
}

/**
 * Confine pooled point light `index` to these rects. The index is the light's
 * order among the scene's point lights (the pool is the only point lights).
 */
export function setRoomMask(index: number, rects: Rect[]): void {
  const [a, b] = maskRects(rects);
  uniforms.pointLightRoomA.value[index]?.set(...a);
  uniforms.pointLightRoomB.value[index]?.set(...b);
}

const FRAGMENT_HEADER = /* glsl */ `
varying vec3 vRoomMaskWorld;
#if NUM_POINT_LIGHTS > 0
uniform vec4 pointLightRoomA[ NUM_POINT_LIGHTS ];
uniform vec4 pointLightRoomB[ NUM_POINT_LIGHTS ];
float inRoomRect( vec4 r, vec2 p ) {
  return step( r.x, p.x ) * step( p.x, r.z ) * step( r.y, p.y ) * step( p.y, r.w );
}
#endif
`;

const PROBE_FUNCTIONS = /* glsl */ `
uniform vec3 probeBoxMin;
uniform vec3 probeBoxMax;
uniform vec3 probePosition;
// reflection direction → the direction from the probe to where it meets the room's box
vec3 probeBoxProject( vec3 dir ) {
  vec3 p = vRoomMaskWorld;
  vec3 tFar = max( ( probeBoxMax - p ) / dir, ( probeBoxMin - p ) / dir );
  float t = min( min( tFar.x, tFar.y ), tFar.z );
  return normalize( p + dir * t - probePosition );
}
`;

/**
 * Patch a Lambert / Phong / PBR material: pooled point lights stop at their
 * room's walls; with `userData.baked` the lightmap (tinted by bakedLight)
 * replaces the hemisphere fill and the environment's diffuse part; with
 * `userData.probe` the room's probe is box-projected and replaces the fill.
 * Flags are read at compile time (set `needsUpdate` after changing them).
 */
export function applyRoomMask(material: THREE.Material): void {
  const lit =
    material instanceof THREE.MeshLambertMaterial ||
    material instanceof THREE.MeshPhongMaterial ||
    material instanceof THREE.MeshStandardMaterial;
  if (!lit || material.userData.roomMask) return;
  material.userData.roomMask = true;
  const flags = () => `${material.userData.baked ? "B" : ""}${material.userData.probe ? "P" : ""}`;
  material.customProgramCacheKey = () => `roomMask-${material.type}-${flags()}`;
  material.onBeforeCompile = (shader) => {
    const baked = Boolean(material.userData.baked);
    const probe = material.userData.probe as ProbeUniforms | undefined;
    Object.assign(shader.uniforms, uniforms, probe ?? {});
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRoomMaskWorld;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvRoomMaskWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;",
      );
    // No braces in the injected line: three's loop unroller matches the loop body up to the first "}"
    const lights = THREE.ShaderChunk.lights_fragment_begin
      .replace(
        "getPointLightInfo( pointLight, geometryPosition, directLight );",
        "getPointLightInfo( pointLight, geometryPosition, directLight );\n" +
          "\t\tdirectLight.color *= max( inRoomRect( pointLightRoomA[ i ], vRoomMaskWorld.xz ), inRoomRect( pointLightRoomB[ i ], vRoomMaskWorld.xz ) );",
      )
      // the hemisphere's flat fill: off where a lightmap or a probe gives the indirect light
      .replace(
        "irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );",
        `irradiance += ${baked || probe ? "0.0" : "1.0"} * getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );`,
      );
    let maps = THREE.ShaderChunk.lights_fragment_maps.replace(
      "vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;",
      "vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity * bakedLight + bakedLamp;",
    );
    // baked surfaces keep the probe's reflections, not its diffuse light (in the lightmap already)
    if (baked) maps = maps.replace("iblIrradiance += getIBLIrradiance( geometryNormal );", "");
    let envmap = THREE.ShaderChunk.envmap_physical_pars_fragment;
    if (probe) {
      envmap = envmap.replace(
        "reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );",
        "reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );\n\t\t\treflectVec = probeBoxProject( reflectVec );",
      );
    }
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\n${FRAGMENT_HEADER}\nuniform vec3 bakedLight;\nuniform vec3 bakedLamp;\n${probe ? PROBE_FUNCTIONS : ""}`,
      )
      .replace("#include <lights_fragment_begin>", lights)
      .replace("#include <lights_fragment_maps>", maps)
      .replace("#include <envmap_physical_pars_fragment>", envmap);
  };
}
