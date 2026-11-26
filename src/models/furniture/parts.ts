import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { seeded } from "../shapes";
import { PHOTO_TEXTURES } from "./materials";

export type Axis = "x" | "y" | "z";
const AXES: Axis[] = ["x", "y", "z"];

const random = seeded(11);

/**
 * Box-project UVs in the geometry's own frame, in meters / texture size, with
 * the grain running along `along` (end-grain faces get the cross section).
 * A random offset per part keeps neighbouring boards from looking cloned.
 */
export function grainUVs(
  g: THREE.BufferGeometry,
  material: THREE.Material,
  along: Axis,
): THREE.BufferGeometry {
  const photo = PHOTO_TEXTURES[material.name];
  if (!photo) return g;
  const pos = g.getAttribute("position");
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const nor = g.getAttribute("normal");
  const uv = new Float32Array(pos.count * 2);
  const offset = [random() * 10, random() * 10];
  for (let i = 0; i < pos.count; i++) {
    const p = { x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) };
    const n = [Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i))];
    const facing = AXES[n.indexOf(Math.max(...n))];
    const [a, b] = AXES.filter((axis) => axis !== facing);
    let alongCoord: number;
    let across: number;
    if (a === along || b === along) {
      alongCoord = p[along];
      across = p[a === along ? b : a];
    } else {
      alongCoord = p[b];
      across = p[a];
    }
    const [u, v] = photo.grain === "u" ? [alongCoord, across] : [across, alongCoord];
    uv[i * 2] = u / photo.size + offset[0];
    uv[i * 2 + 1] = v / photo.size + offset[1];
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Rounded board (or bar) centered at (x, y, z), grain along its longest side by default. */
export function board(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  radius = 0.003,
  along?: Axis,
): THREE.Mesh {
  const r = Math.min(radius, w / 2.01, h / 2.01, d / 2.01);
  const g = new RoundedBoxGeometry(w, h, d, 2, r);
  const longest: Axis = w >= h && w >= d ? "x" : h >= d ? "y" : "z";
  grainUVs(g, material, along ?? longest);
  const m = new THREE.Mesh(g, material);
  m.position.set(x, y, z);
  return m;
}

/**
 * Straight bar of rectangular section (w across, t deep) between two points,
 * its section's "w" side kept horizontal when possible.
 */
export function bar(
  from: THREE.Vector3,
  to: THREE.Vector3,
  w: number,
  t: number,
  material: THREE.Material,
  radius = 0.002,
): THREE.Mesh {
  const length = from.distanceTo(to);
  const g = new RoundedBoxGeometry(w, length, t, 2, Math.min(radius, w / 2.01, t / 2.01));
  grainUVs(g, material, "y");
  const m = new THREE.Mesh(g, material);
  m.position.copy(from).add(to).multiplyScalar(0.5);
  const dir = to.clone().sub(from).normalize();
  // y → dir, then keep local x as horizontal as possible
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  const wanted = new THREE.Vector3(0, 1, 0).cross(dir);
  if (wanted.lengthSq() > 1e-6) {
    wanted.normalize();
    const angle = Math.atan2(
      new THREE.Vector3().crossVectors(xAxis, wanted).dot(dir),
      xAxis.dot(wanted),
    );
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, angle));
  }
  m.quaternion.copy(q);
  return m;
}

/** Round tube along a smooth path (bent iron). */
export function tube(
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
  closed = false,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
  const segments = Math.max(24, Math.round(curve.getLength() * 160));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 14, closed), material);
}

/** Flat disc cap (end of a tube) facing `normal`. */
export function cap(
  at: THREE.Vector3,
  normal: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 14), material);
  m.position.copy(at);
  m.lookAt(at.clone().add(normal));
  return m;
}

/**
 * Plan shape (x, z) extruded downwards from `top` with rounded edges; UVs
 * follow the grain along x.
 */
export function slab(
  shape: THREE.Shape,
  top: number,
  thickness: number,
  bevel: number,
  material: THREE.Material,
  along: Axis = "x",
): THREE.Mesh {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(thickness - 2 * bevel, 0.001),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel, // round the edges inside the outline: the slab keeps its size
    bevelSegments: 3,
    curveSegments: 16,
  });
  g.rotateX(Math.PI / 2); // shape y → world z, extrusion → down
  g.translate(0, top - bevel, 0);
  g.computeVertexNormals();
  grainUVs(g, material, along);
  return new THREE.Mesh(g, material);
}

/**
 * Curved band seen from above: a ring sector of radius r (inner face) and
 * thickness t around (0, cz), spanning `width` in x, extruded `height` up
 * from y0. Used for bentwood / sheet-metal backrests bowing towards -z.
 */
export function arcBand(
  width: number,
  r: number,
  t: number,
  cz: number,
  y0: number,
  height: number,
  material: THREE.Material,
  bevel = 0.002,
): THREE.Mesh {
  const half = Math.asin(Math.min(1, width / 2 / (r + t)));
  const start = -Math.PI / 2 - half;
  const end = -Math.PI / 2 + half;
  const shape = new THREE.Shape();
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const a = start + ((end - start) * i) / steps;
    const p = [Math.cos(a) * (r + t), cz + Math.sin(a) * (r + t)];
    if (i === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = start + ((end - start) * i) / steps;
    shape.lineTo(Math.cos(a) * r, cz + Math.sin(a) * r);
  }
  shape.closePath();
  return slab(shape, y0 + height, height, bevel, material, "x");
}

/**
 * Live-edge outline: straight ends, long sides wandering inwards by up to
 * `wander` (natural tree edge). Stays within [-l/2, l/2] × [z0, z1]. Pure.
 */
export function liveEdge(
  l: number,
  z0: number,
  z1: number,
  wander: number,
  seed: number,
  liveSides: { near: boolean; far: boolean } = { near: true, far: true },
): THREE.Vector2[] {
  const rnd = seeded(seed);
  const waves = Array.from({ length: 4 }, (_, i) => ({
    k: (i + 1) * (1.3 + rnd()) * Math.PI,
    phase: rnd() * Math.PI * 2,
    amp: (0.5 + rnd()) / (i + 1),
  }));
  const total = waves.reduce((s, w) => s + w.amp, 0);
  const inset = (x: number, shift: number) => {
    const t = x / l + 0.5;
    const n = waves.reduce((s, w) => s + w.amp * Math.sin(w.k * t + w.phase + shift), 0) / total;
    return wander * (0.5 + 0.5 * n); // 0 … wander
  };
  const steps = 48;
  const xs = Array.from({ length: steps + 1 }, (_, i) => -l / 2 + (l * i) / steps);
  // each edge reaches the full depth at its widest point (the slab's nominal size)
  const edge = (shift: number) => {
    const raw = xs.map((x) => inset(x, shift));
    const min = Math.min(...raw);
    return raw.map((r) => r - min);
  };
  const far = edge(0);
  const near = edge(2.1);
  const points: THREE.Vector2[] = [];
  xs.forEach((x, i) => points.push(new THREE.Vector2(x, z1 - (liveSides.far ? far[i] : 0))));
  for (let i = steps; i >= 0; i--) {
    points.push(new THREE.Vector2(xs[i], z0 + (liveSides.near ? near[i] : 0)));
  }
  return points;
}

export function v(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}
