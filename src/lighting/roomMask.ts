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
};

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

/** Patch a Lambert / Phong material so pooled point lights stop at their room's walls. */
export function applyRoomMask(material: THREE.Material): void {
  const lit =
    material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshPhongMaterial;
  if (!lit || material.userData.roomMask) return;
  material.userData.roomMask = true;
  material.customProgramCacheKey = () => `roomMask-${material.type}`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRoomMaskWorld;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvRoomMaskWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;",
      );
    // No braces in the injected line: three's loop unroller matches the loop body up to the first "}"
    const lights = THREE.ShaderChunk.lights_fragment_begin.replace(
      "getPointLightInfo( pointLight, geometryPosition, directLight );",
      "getPointLightInfo( pointLight, geometryPosition, directLight );\n" +
        "\t\tdirectLight.color *= max( inRoomRect( pointLightRoomA[ i ], vRoomMaskWorld.xz ), inRoomRect( pointLightRoomB[ i ], vRoomMaskWorld.xz ) );",
    );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_HEADER}`)
      .replace("#include <lights_fragment_begin>", lights);
  };
}
