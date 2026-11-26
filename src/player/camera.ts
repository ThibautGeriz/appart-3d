import type { ApartmentDef } from "../data/apartment";
import { allFurniture, wallPieces, type Box } from "../apartment/plan";

/**
 * Third-person camera math (mouse-wheel zoom). Pure.
 * The camera sits behind the eyes, along the view direction, and is pulled
 * in when a wall, the ceiling or the floor would come between.
 */

export const MAX_ZOOM = 4; // m behind the eyes
export const ZOOM_STEP = 0.5; // m per wheel notch
/** Below this the view is first person (the avatar is hidden). */
export const FIRST_PERSON = 0.35;
/** Keep the camera this far from any surface. */
const CAMERA_MARGIN = 0.15;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Wheel notches (deltaY > 0 = scroll down = zoom out) → new zoom target. */
export function zoomTarget(current: number, notches: number): number {
  const next = current + notches * ZOOM_STEP;
  // snap back to first person instead of hovering just behind the head
  if (next < FIRST_PERSON) return 0;
  return Math.min(MAX_ZOOM, next);
}

/** Unit view direction for a yaw/pitch (yaw 0 looks toward -z). */
export function viewDirection(yaw: number, pitch: number): Vec3 {
  const c = Math.cos(pitch);
  return { x: -Math.sin(yaw) * c, y: Math.sin(pitch), z: -Math.cos(yaw) * c };
}

/** Distance along a ray to an axis-aligned box, or null when missed (slab test). */
export function rayBoxDistance(o: Vec3, d: Vec3, b: Box): number | null {
  let tMin = 0;
  let tMax = Infinity;
  for (const [oa, da, lo, hi] of [
    [o.x, d.x, b.minX, b.maxX],
    [o.y, d.y, b.minY, b.maxY],
    [o.z, d.z, b.minZ, b.maxZ],
  ]) {
    if (Math.abs(da) < 1e-9) {
      if (oa < lo || oa > hi) return null;
      continue;
    }
    let t1 = (lo - oa) / da;
    let t2 = (hi - oa) / da;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  return tMin;
}

/** How far the camera may go from `eye` along `back` (≤ desired). */
export function cameraDistance(eye: Vec3, back: Vec3, desired: number, obstacles: Box[]): number {
  let distance = desired;
  for (const box of obstacles) {
    const t = rayBoxDistance(eye, back, box);
    if (t !== null && t < distance + CAMERA_MARGIN)
      distance = Math.min(distance, t - CAMERA_MARGIN);
  }
  return Math.max(0, distance);
}

/** 3D boxes the camera must not cross: walls, glass, doors, furniture, ceilings, floors. */
export function cameraObstacles(def: ApartmentDef): Box[] {
  const boxes: Box[] = [];
  for (const wall of def.walls) {
    const pieces = wallPieces(wall, def.wallHeight);
    boxes.push(...pieces.solid, ...pieces.glass, ...pieces.leaves.map((l) => l.box));
  }
  for (const item of allFurniture(def)) {
    if (item.h < 0.05) continue; // floor decals
    const [minX, minZ, maxX, maxZ] = item.rect;
    const y = item.y ?? 0;
    boxes.push({ minX, maxX, minY: y, maxY: y + item.h, minZ, maxZ });
  }
  for (const area of def.areas) {
    const [minX, minZ, maxX, maxZ] = area.rect;
    boxes.push({ minX, maxX, minY: -0.2, maxY: 0, minZ, maxZ }); // floor
    if (!area.outdoor) {
      const ceiling = area.ceiling ?? def.wallHeight;
      boxes.push({ minX, maxX, minY: ceiling, maxY: ceiling + 0.2, minZ, maxZ });
    }
  }
  return boxes;
}
