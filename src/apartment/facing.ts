import type { Facing, Rect } from "../data/apartment";

/** Unit vector (x, z) of a facing. Pure. */
export function facingVector(facing: Facing): [number, number] {
  return { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] }[facing] as [number, number];
}

/**
 * Model size for a footprint: width along the model's local x, depth along
 * its local z (the direction it faces). Pure.
 */
export function modelFootprint(rect: Rect, facing: Facing): [number, number] {
  const [minX, minZ, maxX, maxZ] = rect;
  const alongX = facingVector(facing)[0] === 0; // front faces ±z: width runs along x
  return alongX ? [maxX - minX, maxZ - minZ] : [maxZ - minZ, maxX - minX];
}
