import type { Facing } from "../data/apartment";

/** Unit vector (x, z) of a facing. Pure. */
export function facingVector(facing: Facing): [number, number] {
  return { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] }[facing] as [number, number];
}
