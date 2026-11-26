import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Real-world size covered by one repeat of the wood texture (oak_veneer_01). */
export const WOOD_TEXTURE_SIZE = 1.83;

/**
 * Point of a plan outline made of two superellipse halves: half-width `a`,
 * reaching `front` towards +z and `back` towards -z. Higher exponents give
 * squarer corners (a toilet is round at the front and flat against the wall).
 * Pure.
 */
export function outlinePoint(
  t: number,
  a: number,
  front: number,
  back: number,
  nFront: number,
  nBack: number,
): [number, number] {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const n = s >= 0 ? nFront : nBack;
  const x = a * Math.sign(c) * Math.abs(c) ** (2 / n);
  const z = (s >= 0 ? front : -back) * Math.abs(s) ** (2 / n);
  return [x, z];
}

/** Closed outline as 2D points (x, z), from +x towards +z. Pure. */
export function outline(
  segments: number,
  a: number,
  front: number,
  back: number,
  nFront: number,
  nBack: number,
): THREE.Vector2[] {
  return Array.from({ length: segments }, (_, i) => {
    const [x, z] = outlinePoint((i / segments) * Math.PI * 2, a, front, back, nFront, nBack);
    return new THREE.Vector2(x, z);
  });
}

/**
 * Skin closed horizontal rings (all the same point count, bottom to top) into
 * a smooth surface, with flat caps. Each ring repeats its first point so the
 * texture seam stays clean; seam normals are averaged so shading stays smooth.
 * UVs are in meters / `uvScale` (u around, v up).
 */
export function loft(
  rings: THREE.Vector3[][],
  options: { capBottom?: boolean; capTop?: boolean; uvScale?: number } = {},
): THREE.BufferGeometry {
  const { capBottom = true, capTop = true, uvScale = WOOD_TEXTURE_SIZE } = options;
  const n = rings[0].length;
  if (rings.some((r) => r.length !== n)) throw new Error("loft: rings differ in size");
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let v = 0;
  rings.forEach((ring, j) => {
    if (j > 0) v += ring[0].distanceTo(rings[j - 1][0]) / uvScale;
    let u = 0;
    for (let i = 0; i <= n; i++) {
      const p = ring[i % n];
      if (i > 0) u += p.distanceTo(ring[i - 1]) / uvScale;
      positions.push(p.x, p.y, p.z);
      uvs.push(u, v);
    }
  });
  const row = n + 1;
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * row + i;
      const b = a + row;
      // rings run clockwise seen from above (x → z): this winding faces outwards
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const body = new THREE.BufferGeometry();
  body.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  body.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  body.setIndex(indices);
  body.computeVertexNormals();
  const normal = body.getAttribute("normal") as THREE.BufferAttribute;
  for (let j = 0; j < rings.length; j++) {
    const first = j * row;
    const last = first + n;
    const avg = new THREE.Vector3()
      .fromBufferAttribute(normal, first)
      .add(new THREE.Vector3().fromBufferAttribute(normal, last))
      .normalize();
    normal.setXYZ(first, avg.x, avg.y, avg.z);
    normal.setXYZ(last, avg.x, avg.y, avg.z);
  }

  const parts = [body];
  if (capBottom) parts.push(cap(rings[0], false, uvScale));
  if (capTop) parts.push(cap(rings[rings.length - 1], true, uvScale));
  return parts.length === 1 ? body : mergeGeometries(parts)!;
}

/** Flat fan closing a ring, facing up or down. */
function cap(ring: THREE.Vector3[], up: boolean, uvScale: number): THREE.BufferGeometry {
  const center = ring.reduce((c, p) => c.add(p), new THREE.Vector3()).divideScalar(ring.length);
  const positions = [center.x, center.y, center.z];
  const uvs = [center.x / uvScale, center.z / uvScale];
  for (const p of ring) {
    positions.push(p.x, p.y, p.z);
    uvs.push(p.x / uvScale, p.z / uvScale);
  }
  const indices: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = 1 + i;
    const b = 1 + ((i + 1) % ring.length);
    if (up) indices.push(0, b, a);
    else indices.push(0, a, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Scale a geometry's UVs (e.g. to world meters / texture size). */
export function scaleUVs(g: THREE.BufferGeometry, su: number, sv: number, offsetU = 0): void {
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su + offsetU, uv.getY(i) * sv);
}

/** Deterministic pseudo-random generator (same model bytes on every export). */
export function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  x = 0,
  y = 0,
  z = 0,
  name = "",
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  if (name) m.name = name;
  return m;
}
