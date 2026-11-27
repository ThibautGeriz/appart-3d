import * as THREE from "three";
import type { Product } from "../../data/catalog";
import { romaFabric, titanio } from "./materials";
import { grainUVs } from "./parts";
import { throwCushions } from "./decor";

/*
 * Mobilier de France ROMA (showroom photos + product sheet): a low rounded
 * base on slim titanio blade legs (13.5 cm); one soft seat cushion per seat,
 * stitched in four with a tuft in the middle, its thick rounded nose over the
 * base; separate back pads (lower back + puffier headrest) with gaps between
 * them; wide, flat, low arm pads tilted up at the front. 3D mesh fabric.
 * Origin: floor, centre of the bounding box, the long side's front facing +z;
 * a corner sofa's return is on the left (-x) and comes forward (+z).
 */

const LEG = 0.135; // product sheet
const BASE_TOP = 0.29;
const ARM_W = 0.27;
const BACK_T = 0.15; // back pad thickness
const RECLINE = 0.1;
const LEDGE = 0.08; // the base behind the back pads

interface Pillow {
  /** soft-box size */
  w: number;
  h: number;
  d: number;
  /** edge rounding */
  r: number;
  /** how much the top face swells in the middle */
  puff?: number;
  /** stitched seams across the top (x and z through the middle) */
  seams?: boolean;
  /** tuft pressed in at the middle of the top */
  tuft?: number;
}

/**
 * A soft cushion: a finely subdivided box rounded at its edges (each vertex
 * pushed onto the rounded-box surface), its top swelling like a filled
 * cushion, with optional stitched seams and a central tuft. Centred at 0.
 */
export function pillow(spec: Pillow): THREE.BufferGeometry {
  const { w, h, d, r, puff = 0, seams = false, tuft = 0 } = spec;
  const seg = (size: number) => Math.max(4, Math.min(40, Math.round(size / 0.025)));
  const g = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const half = new THREE.Vector3(w / 2, h / 2, d / 2);
  const inner = half.clone().subScalar(r);
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const n = new THREE.Vector3();
  const seam = (t: number) => Math.exp(-(t * t) / (2 * 0.006 ** 2));
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    q.set(
      THREE.MathUtils.clamp(p.x, -inner.x, inner.x),
      THREE.MathUtils.clamp(p.y, -inner.y, inner.y),
      THREE.MathUtils.clamp(p.z, -inner.z, inner.z),
    );
    n.copy(p).sub(q);
    if (n.lengthSq() > 0) p.copy(q).add(n.normalize().multiplyScalar(r));
    // filling: the upper half swells towards the middle
    const u = p.x / half.x;
    const v = p.z / half.z;
    const top = Math.max(0, p.y / half.y);
    let dy = puff * Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v) * top;
    if (top > 0.5) {
      if (seams) dy -= puff * 0.8 * Math.max(seam(p.x), seam(p.z)) * top;
      if (tuft) dy -= tuft * Math.exp(-(p.x * p.x + p.z * p.z) / (2 * 0.03 ** 2)) * top;
    }
    pos.setXYZ(i, p.x, p.y + dy, p.z);
  }
  g.computeVertexNormals();
  grainUVs(g, romaFabric, "x");
  return g;
}

function add(
  g: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

/** Plan rectangle in sofa coordinates. */
interface Box2 {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** Low rounded base, its front set back under the seat cushion's nose. */
function base(g: THREE.Group, b: Box2, top = BASE_TOP, frontInset = 0.04): void {
  const d = b.z1 - b.z0 - frontInset;
  add(
    g,
    pillow({ w: b.x1 - b.x0, h: top - LEG, d, r: 0.035 }),
    romaFabric,
    (b.x0 + b.x1) / 2,
    (LEG + top) / 2,
    b.z0 + d / 2,
  );
}

/** Seat cushion: one per seat, stitched in four, tufted, with a thick rounded nose. */
function seat(g: THREE.Group, b: Box2, top: number): void {
  const h = top - BASE_TOP + 0.02; // sinks a little into the base
  const puff = 0.018;
  add(
    g,
    pillow({ w: b.x1 - b.x0, h, d: b.z1 - b.z0, r: 0.055, puff, seams: true, tuft: 0.012 }),
    romaFabric,
    (b.x0 + b.x1) / 2,
    top - h / 2 - puff,
    (b.z0 + b.z1) / 2,
  );
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), romaFabric);
  button.scale.y = 0.5;
  button.position.set((b.x0 + b.x1) / 2, top - 0.006, (b.z0 + b.z1) / 2);
  g.add(button);
}

/**
 * Back pad standing on the base's rear ledge: a lower back and a puffier
 * headrest on top, reclined. `facing` +z: spans x; +x: spans z.
 */
function backPad(
  g: THREE.Group,
  from: number,
  to: number,
  at: number,
  facing: "+z" | "+x",
  top: number,
  seatTop: number,
): void {
  const width = to - from - 0.03; // gaps between the pads
  const bottom = seatTop - 0.05;
  const puff = 0.015;
  const tall = (top - bottom - BACK_T * Math.sin(RECLINE)) / Math.cos(RECLINE) - puff + 0.004;
  const lower = tall * 0.56;
  const upper = tall - lower;
  const pivot = new THREE.Group();
  // built facing +z, back face at z = 0
  add(
    pivot,
    pillow({ w: width, h: lower, d: BACK_T, r: 0.05, puff: 0.012 }),
    romaFabric,
    0,
    lower / 2,
    BACK_T / 2,
  );
  // headrest: its face slightly forward
  add(
    pivot,
    pillow({ w: width, h: upper, d: BACK_T, r: 0.06, puff }),
    romaFabric,
    0,
    lower + upper / 2 - 0.004,
    BACK_T / 2 + 0.006,
  );
  pivot.rotation.x = -RECLINE;
  const holder = new THREE.Group();
  holder.add(pivot);
  if (facing === "+z") holder.position.set((from + to) / 2, bottom, at);
  else {
    holder.rotation.y = Math.PI / 2;
    holder.position.set(at, bottom, (from + to) / 2);
  }
  g.add(holder);
}

/** Arm: the base raised a little, a wide flat pad on it, tilted up at the front. */
function arm(g: THREE.Group, b: Box2, seatTop: number, along: "z" | "x"): void {
  // the pad rests on the arm's base, level with the seat cushions
  base(g, b, seatTop - 0.01, along === "z" ? 0.04 : 0);
  const length = along === "z" ? b.z1 - b.z0 : b.x1 - b.x0;
  const width = along === "z" ? b.x1 - b.x0 : b.z1 - b.z0;
  const holder = new THREE.Group();
  const m = add(
    holder,
    pillow({ w: width, h: 0.11, d: length - 0.02, r: 0.045, puff: 0.01 }),
    romaFabric,
    0,
    0.055,
    0,
  );
  m.rotation.x = -0.04; // front raised (the arm lifts)
  holder.position.set((b.x0 + b.x1) / 2, seatTop - 0.01, (b.z0 + b.z1) / 2);
  if (along === "x") holder.rotation.y = Math.PI / 2;
  g.add(holder);
}

/** Slim blade leg: a thin tapered plate, its foot pushed out towards (dx, dz). */
function leg(g: THREE.Group, x: number, z: number, dx: number, dz: number): void {
  const shape = new THREE.Shape();
  shape.moveTo(-0.03, LEG + 0.01);
  shape.lineTo(0.03, LEG + 0.01);
  shape.lineTo(0.045, 0);
  shape.lineTo(0.028, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: false });
  geo.translate(0, 0, -0.005);
  const m = new THREE.Mesh(geo, titanio);
  m.position.set(x, 0, z);
  // the profile's +x (where the foot goes) turned towards (dx, dz)
  m.rotation.y = Math.atan2(-dz, dx);
  g.add(m);
}

export function roma(p: Product): THREE.Group {
  const g = new THREE.Group();
  g.name = p.id;
  const W = p.w;
  const D = p.d;
  const depth = p.sofa?.depth ?? D;
  const seatTop = p.seatHeight ?? 0.44;
  const corner = D > depth + 0.01;
  const back = -D / 2;
  const left = -W / 2;
  const front = back + depth;
  const padFront = back + LEDGE; // back pads stand on the base's rear ledge
  const seatBack = padFront + BACK_T - 0.02; // seat cushions start under the pads' faces
  const inset = 0.08;

  // Long side: [corner block | seats | arm] or [arm | seats | arm]
  const seatsFrom = corner ? left + depth : left + ARM_W;
  const seatsTo = W / 2 - ARM_W;
  const count = Math.max(1, Math.round((seatsTo - seatsFrom) / 0.9));
  const seatW = (seatsTo - seatsFrom) / count;
  if (!corner) arm(g, { x0: left, x1: left + ARM_W, z0: back, z1: front }, seatTop, "z");
  arm(g, { x0: seatsTo, x1: W / 2, z0: back, z1: front }, seatTop, "z");
  for (let i = 0; i < count; i++) {
    const x0 = seatsFrom + i * seatW;
    base(g, { x0, x1: x0 + seatW, z0: back, z1: front });
    seat(g, { x0: x0 + 0.006, x1: x0 + seatW - 0.006, z0: seatBack, z1: front }, seatTop);
    backPad(g, x0, x0 + seatW, padFront, "+z", p.h, seatTop);
  }
  throwCushions(g, seatsFrom, seatsTo, seatTop, padFront + BACK_T); // decor

  if (corner) {
    const padLeft = left + LEDGE;
    const seatLeft = padLeft + BACK_T - 0.02;
    // corner block: square seat, a pad on each rear side
    base(g, { x0: left, x1: left + depth, z0: back, z1: front }, BASE_TOP, 0);
    seat(g, { x0: seatLeft, x1: left + depth - 0.006, z0: seatBack, z1: front - 0.006 }, seatTop);
    backPad(g, padLeft, left + depth, padFront, "+z", p.h, seatTop);
    backPad(g, padFront + BACK_T, front, padLeft, "+x", p.h, seatTop);
    // return: seat(s), then the arm across its end
    const returnTo = D / 2 - ARM_W;
    const n = Math.max(1, Math.round((returnTo - front) / 0.9));
    const len = (returnTo - front) / n;
    for (let i = 0; i < n; i++) {
      const z0 = front + i * len;
      base(g, { x0: left, x1: left + depth, z0, z1: z0 + len }, BASE_TOP, 0);
      seat(g, { x0: seatLeft, x1: left + depth, z0: z0 + 0.006, z1: z0 + len - 0.006 }, seatTop);
      backPad(g, z0, z0 + len, padLeft, "+x", p.h, seatTop);
    }
    arm(g, { x0: left, x1: left + depth, z0: returnTo, z1: D / 2 }, seatTop, "x");
    leg(g, left + inset, back + inset, -1, -1);
    leg(g, W / 2 - inset, back + inset, 1, -1);
    leg(g, W / 2 - inset, front - inset - 0.04, 1, 1);
    leg(g, left + depth - inset, front + inset, 1, 1);
    leg(g, left + inset, D / 2 - inset, -1, 1);
    leg(g, left + depth - inset, D / 2 - inset, 1, 1);
  } else {
    leg(g, left + inset, back + inset, -1, -1);
    leg(g, W / 2 - inset, back + inset, 1, -1);
    leg(g, left + inset, front - inset - 0.04, -1, 1);
    leg(g, W / 2 - inset, front - inset - 0.04, 1, 1);
  }
  return g;
}

export const SOFA_BUILDERS: Record<string, (p: Product) => THREE.Group> = {
  "sofa-roma-corner": roma,
  "sofa-roma-210": roma,
};
