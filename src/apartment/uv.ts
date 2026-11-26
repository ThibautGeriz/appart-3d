import type { BufferGeometry } from "three";

/**
 * Overwrite a geometry's UVs with world-space box mapping, so textures keep
 * their real-world size (meters) whatever the size of the box. Pure.
 *
 * Each vertex is projected along its dominant normal axis:
 *   floor/ceiling → (x, z), walls facing x → (z, y), walls facing z → (x, y).
 * `size` is the texture size in meters, `origin` the world point mapped to uv (0, 0).
 */
export function applyWorldUVs(
  geometry: BufferGeometry,
  size: [u: number, v: number],
  origin: [x: number, y: number, z: number] = [0, 0, 0],
): void {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  if (!uv) throw new Error("geometry has no uv attribute");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) - origin[0];
    const y = position.getY(i) - origin[1];
    const z = position.getZ(i) - origin[2];
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    let u: number;
    let v: number;
    if (ny >= nx && ny >= nz) {
      u = x;
      v = z;
    } else if (nx >= nz) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv.setXY(i, u / size[0], v / size[1]);
  }
  uv.needsUpdate = true;
}
