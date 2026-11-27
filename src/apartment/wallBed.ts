import type * as THREE from "three";

/**
 * Wall bed moving parts, shared by the model builder (src/models/furniture/bed.ts)
 * and the app (which loads the GLB and animates it).
 */

/** Node of the folding part (bed frame + mattress), pivoting about x. */
export const WALL_BED_FOLD = "fold";
/** Feet under the foot end, unfolded while the bed opens. */
export const WALL_BED_FEET = "feet";
/** Fold rotation when open: down into the room, mattress on top. */
export const WALL_BED_OPEN = Math.PI / 2;
/** Seconds for a full open / close. */
export const WALL_BED_DURATION = 1.4;

/** Ease in-out, so the bed starts and lands gently. Pure. */
export function easeInOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Move the opening ratio toward its target by dt (0 closed → 1 open). Pure. */
export function stepOpening(current: number, open: boolean, dt: number): number {
  const step = dt / WALL_BED_DURATION;
  return open ? Math.min(1, current + step) : Math.max(0, current - step);
}

/**
 * Pose for an opening ratio t (0 closed → 1 open): the fold turns down into
 * the room, the feet swing out from the underside to stand on the floor.
 */
export function poseWallBed(model: THREE.Object3D, t: number): void {
  const eased = easeInOut(t);
  const fold = model.getObjectByName(WALL_BED_FOLD);
  const feet = model.getObjectByName(WALL_BED_FEET);
  if (fold) fold.rotation.x = eased * WALL_BED_OPEN;
  // the feet unfold during the last part of the motion
  if (feet) feet.rotation.x = -easeInOut((t - 0.6) / 0.4) * WALL_BED_OPEN;
}
