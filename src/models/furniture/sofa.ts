import * as THREE from "three";
import type { Product } from "../../data/catalog";
import { albatrosFabric, oiledOak, romaFabric, titanio } from "./materials";
import { grainUVs } from "./parts";
import { throwCushions } from "./decor";

/*
 * Mobilier de France ROMA (showroom photos + product sheet): one continuous
 * low rounded base, end to end, on V-shaped titanio hairpin legs (13.5 cm)
 * leaning out under the ends; one soft seat cushion per seat, stitched in four
 * with a tuft in the middle, its thick rounded nose over the base; separate
 * back pads (lower back + puffier headrest) with gaps between them; the arms
 * are pads lying on the base's ends, hinged at the seat and lifted at their
 * outer end ("accoudoirs relevables", shown raised as in the photos). 3D mesh
 * fabric.
 * Origin: floor, centre of the bounding box, the long side's front facing +z;
 * a corner sofa's return is on the left (-x) and comes forward (+z).
 */

const LEG = 0.135; // product sheet
const BASE_TOP = 0.31; // photos: base top ~32 cm, cushions ~13 cm on it
const ARM_W = 0.3; // base under the arm pad (photos: seat cushions ~75 cm on the 210)
const ARM_LIFT = 0.3; // arm pad tilt (rad), outer end up (~57 cm at the tip)
const END = 0.02; // the base stops short of the ends, under the arm pads' tips
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
  /** fabric its UVs are scaled for (default: the Roma's) */
  material?: THREE.Material;
}

/**
 * A soft cushion: a finely subdivided box rounded at its edges (each vertex
 * pushed onto the rounded-box surface), its top swelling like a filled
 * cushion, with optional stitched seams and a central tuft. Centred at 0.
 */
export function pillow(spec: Pillow): THREE.BufferGeometry {
  const { w, h, d, r, puff = 0, seams = false, tuft = 0, material = romaFabric } = spec;
  // even counts, so the seams through the middle land on a vertex row
  const seg = (size: number) => 2 * Math.max(2, Math.min(16, Math.round(size / 0.06)));
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
  grainUVs(g, material, "x");
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
    pillow({ w: b.x1 - b.x0, h: top - LEG, d, r: 0.06 }),
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

/**
 * Arm pad lying on the base's end: hinged on the base beside the seat cushion,
 * its outer end lifted up to the sofa's end. `b` is the arm's plan box; `out` the direction of the sofa's
 * end (+x / -x for the long side, +z for a return's end).
 */
function arm(g: THREE.Group, b: Box2, out: "+x" | "-x" | "+z"): void {
  const alongZ = out !== "+z"; // the pad's length runs front to back
  const length = (alongZ ? b.z1 - b.z0 : b.x1 - b.x0) - 0.03;
  const h = 0.12;
  const r = 0.05;
  // pad length so that, tilted, its tip reaches the end of the arm's box
  const span = ARM_W - 0.005;
  const pad = (span - r + r * Math.sin(ARM_LIFT)) / Math.cos(ARM_LIFT) + r;
  // built with its outer end towards +x, inner bottom edge at the hinge,
  // lifted, then turned to the sofa's end; baked so the bounding box is exact
  const reach = (pad - r) * Math.cos(ARM_LIFT) - r * Math.sin(ARM_LIFT) + r;
  const turn = out === "+x" ? 0 : out === "-x" ? Math.PI : -Math.PI / 2;
  const at =
    out === "+x"
      ? new THREE.Vector3(b.x1 - reach, 0, (b.z0 + b.z1) / 2 - 0.005)
      : out === "-x"
        ? new THREE.Vector3(b.x0 + reach, 0, (b.z0 + b.z1) / 2 - 0.005)
        : new THREE.Vector3((b.x0 + b.x1) / 2, 0, b.z1 - reach);
  at.y = BASE_TOP - 0.01;
  const geo = pillow({ w: pad, h, d: length, r, puff: 0.012 })
    .translate(pad / 2, h / 2, 0)
    .rotateZ(ARM_LIFT)
    .rotateY(turn)
    .translate(at.x, at.y, at.z);
  add(g, geo, romaFabric, 0, 0, 0);
}

/** One strip of a hairpin leg: titanio flat bar, ~1.4 × 0.6 cm. */
const STRIP = new THREE.BoxGeometry(0.014, 1, 0.006);

/**
 * V-shaped hairpin leg (photos): two flat bars from a common foot, pushed out
 * towards the sofa's end (`out`), up to the base's underside where they open
 * ~12 cm apart across the end. Transforms are baked into the geometry.
 */
function leg(g: THREE.Group, x: number, z: number, out: "+x" | "-x" | "+z" | "-z"): void {
  const lean = 0.045;
  const ox = out === "+x" ? lean : out === "-x" ? -lean : 0;
  const oz = out === "+z" ? lean : out === "-z" ? -lean : 0;
  const foot = new THREE.Vector3(x + ox, 0.004, z + oz);
  const up = new THREE.Vector3(0, 1, 0);
  for (const side of [-1, 1]) {
    const spread = 0.06 * side;
    const top = new THREE.Vector3(x + (oz ? spread : 0), LEG + 0.01, z + (ox ? spread : 0));
    const dir = top.clone().sub(foot);
    const len = dir.length();
    const m = new THREE.Matrix4().compose(
      foot.clone().addScaledVector(dir, 0.5),
      new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()),
      new THREE.Vector3(1, len, 1),
    );
    // the flat face looks out of the end
    if (oz) m.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    const geo = STRIP.clone().applyMatrix4(m);
    g.add(new THREE.Mesh(geo, titanio));
  }
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
  const right = W / 2;
  const front = back + depth;
  const padFront = back + LEDGE; // back pads stand on the base's rear ledge
  const seatBack = padFront + BACK_T - 0.02; // seat cushions start under the pads' faces
  const inset = 0.09;

  // Long side: [corner block | seats | arm] or [arm | seats | arm], on one base
  const seatsFrom = corner ? left + depth : left + ARM_W;
  const seatsTo = right - ARM_W;
  const count = Math.max(1, Math.round((seatsTo - seatsFrom) / 0.9));
  const seatW = (seatsTo - seatsFrom) / count;
  base(g, { x0: corner ? left : left + END, x1: right - END, z0: back, z1: front });
  if (!corner) arm(g, { x0: left, x1: left + ARM_W, z0: back, z1: front }, "-x");
  arm(g, { x0: seatsTo, x1: right, z0: back, z1: front }, "+x");
  for (let i = 0; i < count; i++) {
    const x0 = seatsFrom + i * seatW;
    seat(g, { x0: x0 + 0.006, x1: x0 + seatW - 0.006, z0: seatBack, z1: front }, seatTop);
    backPad(g, x0, x0 + seatW, padFront, "+z", p.h, seatTop);
  }
  throwCushions(g, seatsFrom, seatsTo, seatTop, padFront + BACK_T); // decor
  leg(g, right - inset, back + inset, "+x");
  leg(g, right - inset, front - inset - 0.04, "+x");

  if (corner) {
    const padLeft = left + LEDGE;
    const seatLeft = padLeft + BACK_T - 0.02;
    // corner block: square seat, a pad on each rear side
    seat(g, { x0: seatLeft, x1: left + depth - 0.006, z0: seatBack, z1: front - 0.006 }, seatTop);
    backPad(g, padLeft, left + depth, padFront, "+z", p.h, seatTop);
    backPad(g, padFront + BACK_T, front, padLeft, "+x", p.h, seatTop);
    // return: its own base, seat(s), then the arm across its end
    base(g, { x0: left, x1: left + depth, z0: front - 0.04, z1: D / 2 - END }, BASE_TOP, 0);
    const returnTo = D / 2 - ARM_W;
    const n = Math.max(1, Math.round((returnTo - front) / 0.9));
    const len = (returnTo - front) / n;
    for (let i = 0; i < n; i++) {
      const z0 = front + i * len;
      seat(g, { x0: seatLeft, x1: left + depth, z0: z0 + 0.006, z1: z0 + len - 0.006 }, seatTop);
      backPad(g, z0, z0 + len, padLeft, "+x", p.h, seatTop);
    }
    arm(g, { x0: left, x1: left + depth, z0: returnTo, z1: D / 2 }, "+z");
    leg(g, left + inset, back + inset, "-x");
    leg(g, left + depth - inset, front + inset, "+x");
    leg(g, left + inset, D / 2 - inset, "+z");
    leg(g, left + depth - inset, D / 2 - inset, "+z");
  } else {
    leg(g, left + inset, back + inset, "-x");
    leg(g, left + inset, front - inset - 0.04, "-x");
  }
  return g;
}

/*
 * Cuir Center ALBATROS (showroom photos + price tag, model CS-578): a long
 * low upholstered base on a light oak band, raised on four tapered "titanium
 * dark" metal legs (15 cm) at its corners; two deep seat cushions ("assises
 * double profondeur", one tuft each); two separate back cushions that slide
 * forward and back ("dossiers avance/recule", a seam across each); wide flat
 * arm pads lying over the base's ends, full depth ("accoudoirs relevables",
 * shown down as in the photos). Its own chenille, tinted by the colour picker.
 */

const A_LEG = 0.15; // price tag: "pieds métal titanium dark ht 15 cm"
const A_BAND = 0.035; // oak band under the upholstered base
const A_BASE_TOP = 0.32;
const A_ARM_W = 0.27; // photos: the arm pads are about a quarter of the depth
const A_ARM_H = 0.13;
const A_BACK_T = 0.18;
const A_RECLINE = 0.12;

/** Albatros legs: tapered round tubes, darker than the Roma's titanio. */
const titaniumDark = new THREE.MeshStandardMaterial({
  name: "titanium dark",
  color: "#2e2f31",
  metalness: 0.8,
  roughness: 0.35,
});
const LEG_GEO = new THREE.CylinderGeometry(0.012, 0.007, A_LEG, 16).translate(0, A_LEG / 2, 0);

export function albatros(p: Product): THREE.Group {
  const g = new THREE.Group();
  g.name = p.id;
  const W = p.w;
  const D = p.d;
  const seatTop = p.seatHeight ?? 0.45;
  const back = -D / 2;
  const front = D / 2;
  const inset = 0.07;

  // legs at the corners, under the arm pads
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(LEG_GEO, titaniumDark);
      leg.position.set(sx * (W / 2 - inset), 0, sz * (D / 2 - inset));
      g.add(leg);
    }
  // oak band, a little in from the fabric, then the upholstered base on it
  const band = new THREE.BoxGeometry(W - 0.04, A_BAND, D - 0.06);
  grainUVs(band, oiledOak, "x");
  add(g, band, oiledOak, 0, A_LEG + A_BAND / 2, -0.01);
  const baseBottom = A_LEG + A_BAND;
  add(
    g,
    pillow({
      material: albatrosFabric,
      w: W - 0.01,
      h: A_BASE_TOP - baseBottom,
      d: D - 0.02,
      r: 0.05,
    }),
    albatrosFabric,
    0,
    (baseBottom + A_BASE_TOP) / 2,
    -0.01,
  );

  // flat arm pads over the base's ends, full depth
  for (const sx of [-1, 1])
    add(
      g,
      pillow({ material: albatrosFabric, w: A_ARM_W, h: A_ARM_H, d: D, r: 0.055, puff: 0.012 }),
      albatrosFabric,
      sx * (W / 2 - A_ARM_W / 2),
      A_BASE_TOP + A_ARM_H / 2 - 0.01,
      0,
    );

  // two deep seats between the arms, from the backs to the front edge
  const seatsFrom = -W / 2 + A_ARM_W;
  const seatsTo = W / 2 - A_ARM_W;
  const seatW = (seatsTo - seatsFrom) / 2;
  const seatBack = back + 0.06;
  const seatH = seatTop - A_BASE_TOP + 0.02;
  for (let i = 0; i < 2; i++) {
    const x = seatsFrom + seatW * (i + 0.5);
    const cushion = pillow({
      material: albatrosFabric,
      w: seatW - 0.012,
      h: seatH,
      d: front - 0.01 - seatBack,
      r: 0.05,
      puff: 0.016,
      tuft: 0.012,
    });
    add(g, cushion, albatrosFabric, x, seatTop - seatH / 2 - 0.016, (seatBack + front - 0.01) / 2);
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), albatrosFabric);
    button.scale.y = 0.5;
    button.position.set(x, seatTop - 0.008, (seatBack + front) / 2);
    g.add(button);
  }

  // back cushions, slid back, on the seats: a seam across each (two soft
  // halves), reclined. Transforms baked into the geometry (a rotated node
  // inflates the loose bounding box), then placed from their measured box:
  // top at the sofa's height, reclined back face 5 mm in from the base's back.
  const bottom = seatTop - 0.06;
  const tall = (p.h - bottom) / Math.cos(A_RECLINE);
  const lower = tall * 0.45;
  const width = seatW - 0.06;
  // one cushion read as two halves sewn together: tight corners, flush faces
  const halves = [
    pillow({
      material: albatrosFabric,
      w: width,
      h: lower,
      d: A_BACK_T,
      r: 0.035,
      puff: 0.008,
    }).translate(0, lower / 2, A_BACK_T / 2),
    pillow({
      material: albatrosFabric,
      w: width,
      h: tall - lower,
      d: A_BACK_T,
      r: 0.035,
      puff: 0.012,
    }).translate(0, lower + (tall - lower) / 2 - 0.006, A_BACK_T / 2),
  ];
  const box = new THREE.Box3();
  for (const half of halves) {
    half.rotateX(-A_RECLINE);
    half.computeBoundingBox();
    box.union(half.boundingBox!);
  }
  const lift = p.h - bottom - box.max.y;
  const push = back + 0.005 - box.min.z;
  for (let i = 0; i < 2; i++) {
    const x = seatsFrom + seatW * (i + 0.5);
    for (const half of halves)
      add(g, half.clone().translate(x, bottom + lift, push), albatrosFabric, 0, 0, 0);
  }
  throwCushions(g, seatsFrom, seatsTo, seatTop, push + A_BACK_T); // decor
  return g;
}

export const SOFA_BUILDERS: Record<string, (p: Product) => THREE.Group> = {
  "sofa-roma-corner": roma,
  "sofa-roma-210": roma,
  "sofa-albatros-222": albatros,
};
