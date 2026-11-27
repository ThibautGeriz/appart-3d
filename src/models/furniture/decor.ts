import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { seeded } from "../shapes";
import { grainUVs } from "./parts";

/*
 * Decor that comes with the furniture to make it look lived in: books on
 * the shelves, a lamp on each bedside table, cushions on the sofa. Not sold
 * with the products (not in the budget). Every decor mesh is named "decor"
 * (the dimension tests leave them out).
 */

export const DECOR = "decor";

/** Book cloth colours: muted, the way a real shelf looks. */
const SPINES = [
  "#7a2e2a",
  "#2f4a5e",
  "#c9b58f",
  "#3d5a3f",
  "#e8e2d4",
  "#8a6a3f",
  "#1f1f22",
  "#a34a28",
  "#5c6f7c",
  "#d9cdb4",
  "#6b4b5e",
  "#b89a5e",
];

const bookMaterials = SPINES.map(
  (color, i) => new THREE.MeshStandardMaterial({ name: `book ${i}`, color, roughness: 0.75 }),
);
const ceramic = new THREE.MeshStandardMaterial({
  name: "ceramic",
  color: "#efe9df",
  roughness: 0.35,
});
const shade = new THREE.MeshStandardMaterial({
  name: "lamp shade",
  color: "#f3ede2",
  roughness: 0.95,
  side: THREE.DoubleSide,
  emissive: "#3a3020",
});
const cushionLight = new THREE.MeshStandardMaterial({
  name: "cushion oat",
  color: "#d9cfbf",
  roughness: 1,
});
const cushionDark = new THREE.MeshStandardMaterial({
  name: "cushion charcoal",
  color: "#55524d",
  roughness: 1,
});

function named<T extends THREE.Object3D>(o: T): T {
  o.name = DECOR;
  return o;
}

/**
 * Books along a shelf from x0 to x1, standing on y, against the back at
 * z = back, at most `maxH` tall: runs of upright books with gaps, sometimes
 * one leaning, sometimes a short stack lying flat, sometimes a vase. One
 * mesh per colour (few draw calls).
 */
export function fillShelf(
  g: THREE.Group,
  x0: number,
  x1: number,
  y: number,
  back: number,
  depth: number,
  maxH: number,
  seed: number,
): void {
  if (maxH < 0.12 || x1 - x0 < 0.12) return;
  const rnd = seeded(seed);
  const parts: THREE.BufferGeometry[][] = bookMaterials.map(() => []);
  const book = (w: number, h: number, d: number, x: number, z: number, tilt = 0, lying = false) => {
    const geo = lying ? new THREE.BoxGeometry(h, w, d) : new THREE.BoxGeometry(w, h, d);
    if (tilt) {
      geo.translate(0, h / 2, 0);
      geo.rotateZ(tilt);
      geo.translate(x, y, z);
    } else geo.translate(x, y + (lying ? w / 2 : h / 2), z);
    parts[Math.floor(rnd() * bookMaterials.length)].push(geo);
  };
  let x = x0 + 0.01 + rnd() * 0.04;
  const end = x1 - 0.01;
  while (x < end - 0.03) {
    const roll = rnd();
    if (roll < 0.1 && end - x > 0.14) {
      // a vase
      const r = 0.035 + rnd() * 0.02;
      const vh = Math.min(maxH - 0.02, 0.12 + rnd() * 0.1);
      const vase = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, vh, 20), ceramic);
      vase.position.set(x + r, y + vh / 2, back + depth / 2);
      g.add(named(vase));
      x += 2 * r + 0.04;
    } else if (roll < 0.22 && end - x > 0.25) {
      // a short stack lying flat
      const n = 2 + Math.floor(rnd() * 3);
      const bw = 0.17 + rnd() * 0.06;
      let sy = 0;
      for (let i = 0; i < n && sy < maxH - 0.06; i++) {
        const bt = 0.02 + rnd() * 0.02;
        const geo = new THREE.BoxGeometry(bw, bt, Math.min(depth - 0.02, 0.15 + rnd() * 0.05));
        geo.translate(x + bw / 2 + (rnd() - 0.5) * 0.01, y + sy + bt / 2, back + depth / 2);
        parts[Math.floor(rnd() * bookMaterials.length)].push(geo);
        sy += bt;
      }
      x += bw + 0.03;
    } else {
      // a run of upright books
      const n = 3 + Math.floor(rnd() * 9);
      for (let i = 0; i < n && x < end - 0.03; i++) {
        const bw = Math.min(0.018 + rnd() * 0.03, end - x); // stays in the compartment
        const bh = Math.min(maxH - 0.015, 0.17 + rnd() * 0.12);
        const bd = Math.min(depth - 0.015, 0.13 + rnd() * 0.08);
        book(bw, bh, bd, x + bw / 2, back + bd / 2 + 0.005);
        x += bw + 0.001;
      }
      // the last one sometimes leans on the run
      const lean = 0.35;
      if (rnd() < 0.3 && x < end - 0.08) {
        const bh = Math.min(maxH - 0.03, 0.2 + rnd() * 0.06);
        // its top swings out: skip it when it would cross the side
        const reach = 0.025 + bh * Math.sin(lean) + 0.0125 * Math.cos(lean);
        if (x + reach > end) break;
        book(0.025, bh, Math.min(depth - 0.02, 0.15), x + 0.012, back + 0.08, -lean);
        x += 0.09;
      }
      x += 0.03 + rnd() * 0.12;
    }
  }
  parts.forEach((geos, i) => {
    if (geos.length === 0) return;
    g.add(named(new THREE.Mesh(mergeGeometries(geos), bookMaterials[i])));
  });
}

/** Bedside lamp: a ceramic base and a linen drum shade, standing at (x, y, z). */
export function bedsideLamp(g: THREE.Group, x: number, y: number, z: number): void {
  const lamp = new THREE.Group();
  const profile = [
    [0, 0],
    [0.055, 0],
    [0.07, 0.04],
    [0.065, 0.12],
    [0.035, 0.2],
    [0.012, 0.22],
    [0.012, 0.25],
    [0, 0.25],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  lamp.add(named(new THREE.Mesh(new THREE.LatheGeometry(profile, 32), ceramic)));
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.17, 40, 1, true), shade);
  drum.position.y = 0.3;
  lamp.add(named(drum));
  lamp.position.set(x, y, z);
  g.add(named(lamp));
}

/**
 * Two throw cushions leaning on the back at the ends of a seat run, from
 * x0 to x1 (seat top y, back face z), one light and one dark.
 */
export function throwCushions(g: THREE.Group, x0: number, x1: number, y: number, z: number): void {
  const size = 0.45;
  for (const [x, m, turn] of [
    [x0 + 0.3, cushionLight, 0.25],
    [x0 + 0.62, cushionDark, 0.1],
    [x1 - 0.3, cushionLight, -0.25],
  ] as [number, THREE.Material, number][]) {
    const c = new THREE.Mesh(new RoundedBoxGeometry(size, size, 0.14, 4, 0.06), m);
    c.position.set(x, y + size / 2 - 0.04, z + 0.12);
    c.rotation.set(-0.32, turn, 0);
    g.add(named(c));
  }
}

// ── Room decor (own GLBs, placed by the furnishing layout) ─────────────────

/** Wool rug: a thin slab with a bound border in a contrasting wool. Origin: floor, centred. */
export function rug(
  w: number,
  d: number,
  field: THREE.Material,
  border: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const h = 0.012;
  const b = 0.07;
  const slab = (sw: number, sd: number, x: number, z: number, m: THREE.Material) => {
    const geo = new RoundedBoxGeometry(sw, h, sd, 2, 0.004);
    grainUVs(geo, m, "x");
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, h / 2, z);
    g.add(mesh);
  };
  slab(w - 2 * b, d - 2 * b, 0, 0, field);
  slab(w, b, 0, -d / 2 + b / 2, border);
  slab(w, b, 0, d / 2 - b / 2, border);
  slab(b, d - 2 * b, -w / 2 + b / 2, 0, border);
  slab(b, d - 2 * b, w / 2 - b / 2, 0, border);
  return g;
}

const leafGreen = new THREE.MeshStandardMaterial({
  name: "leaf",
  color: "#3f6b2e",
  roughness: 0.55,
  side: THREE.DoubleSide,
});
const stem = new THREE.MeshStandardMaterial({ name: "stem", color: "#5a4632", roughness: 0.8 });
const soil = new THREE.MeshStandardMaterial({ name: "soil", color: "#2b211a", roughness: 1 });
const pot = new THREE.MeshStandardMaterial({ name: "pot", color: "#e6e1d8", roughness: 0.7 });

/** One broad leaf (fiddle-leaf fig): an oval, folded along its rib, drooping at the tip. */
function leaf(length: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const w = length * 0.62;
  s.moveTo(0, 0);
  s.bezierCurveTo(w * 0.7, length * 0.15, w * 0.6, length * 0.8, 0, length);
  s.bezierCurveTo(-w * 0.6, length * 0.8, -w * 0.7, length * 0.15, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 10);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // fold along the rib, droop towards the tip
    pos.setZ(i, Math.abs(x) * 0.35 - (y / length) ** 2 * length * 0.25);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Fiddle-leaf fig (~1.5 m) in a matte ceramic pot. Origin: floor, centred. */
export function plant(): THREE.Group {
  const g = new THREE.Group();
  const potProfile = [
    [0, 0],
    [0.13, 0],
    [0.16, 0.05],
    [0.17, 0.3],
    [0.165, 0.32],
    [0.15, 0.32],
    [0.15, 0.3],
    [0, 0.3],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(potProfile, 40), pot));
  const earth = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), soil);
  earth.rotation.x = -Math.PI / 2;
  earth.position.y = 0.29;
  g.add(earth);
  const rnd = seeded(8);
  const leaves: THREE.BufferGeometry[] = [];
  const stems: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) {
    const angle = (k / 3) * Math.PI * 2 + rnd();
    const top = 1.05 + rnd() * 0.45;
    const lean = 0.08 + rnd() * 0.08;
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.29, 0),
      new THREE.Vector3(
        Math.cos(angle) * lean * 0.4,
        0.29 + top * 0.5,
        Math.sin(angle) * lean * 0.4,
      ),
      new THREE.Vector3(Math.cos(angle) * lean, 0.29 + top, Math.sin(angle) * lean),
    ]);
    stems.push(new THREE.TubeGeometry(path, 24, 0.012, 8, false));
    // leaves spiral up the upper part of the stem
    const n = 7 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const t = 0.35 + (i / n) * 0.65;
      const p = path.getPoint(t);
      const l = 0.2 + rnd() * 0.12;
      const geo = leaf(l);
      const m = new THREE.Matrix4()
        .makeRotationY(angle + i * 2.4)
        .multiply(new THREE.Matrix4().makeRotationX(-0.9 - rnd() * 0.5));
      geo.applyMatrix4(m);
      geo.translate(p.x, p.y, p.z);
      leaves.push(geo);
    }
  }
  g.add(new THREE.Mesh(mergeGeometries(stems), stem));
  g.add(new THREE.Mesh(mergeGeometries(leaves), leafGreen));
  return g;
}
