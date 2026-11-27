import * as THREE from "three";
import type { Product } from "../../data/catalog";
import { darkGap } from "../materials";
import { seeded } from "../shapes";
import {
  blackSteel,
  darkPine,
  honeyPine,
  linen,
  linenDark,
  recycledPine,
  recycledTeak,
  roughAsh,
} from "./materials";
import { bar, board, grainUVs, v } from "./parts";
import { pillow } from "./sofa";
import { bedsideLamp, fillShelf } from "./decor";

/*
 * Bedroom furniture at the seller's dimensions. Beds: width w along x, length
 * d along z, the head at -z and the foot towards +z; they carry a mattress,
 * a duvet and two pillows (sold separately, but a bed reads as one with
 * them). Bedside tables and shelves: width along x, front towards +z.
 * Origin: floor, centred.
 */

/**
 * A shared wood material with another tint. The clone keeps the name, so the
 * same photo scan is attached at export; the tint is set so the scan renders
 * like the seller's photos (the scans are darker than their tint).
 */
function tinted(base: THREE.MeshStandardMaterial, color: string): THREE.MeshStandardMaterial {
  const m = base.clone();
  m.color.set(color);
  return m;
}

/** Lunja: honey-orange brushed pine (the "bois foncé" of the photos). */
const lunjaPine = tinted(darkPine, "#ffdec1");
/** Janis: pale natural pine, oiled. */
const janisPine = tinted(honeyPine, "#fff4f2");
/** Petra: light waxed pine, golden. */
const petraPine = tinted(honeyPine, "#ebb677");
/** Petra / Poutre: end grain of the through tenons at the corners. */
const endGrain = tinted(honeyPine, "#a87a5a");
/** Poutre: warm brown waxed / recycled pine beams. */
const poutrePine = tinted(recycledPine, "#e8bba2");
/** Lundby: rough sawn ash, warm mid brown. */
const lundbyAsh = tinted(roughAsh, "#f5cea7");
/** Oregon: brushed ash body, light; end-grain squares on the drawer. */
const oregonAsh = tinted(roughAsh, "#ffffff");
const oregonLogs = [tinted(roughAsh, "#fff8f0"), tinted(roughAsh, "#f6e2cc")];
/** Borneo / Fina: recycled teak, grey-brown (the Valmo tint is redder). */
const shelfTeak = tinted(recycledTeak, "#c8ccd8");
/** Seatle: recycled pine shelves, mid brown. */
const seatlePine = tinted(recycledPine, "#dfb79e");

/** Mattress, duvet folded back a little at the head, two pillows. */
function bedding(
  g: THREE.Group,
  w: number,
  top: number,
  head: number,
  foot: number,
  maxTop = Infinity,
): void {
  const mw = Math.min(w - 0.02, 1.6);
  const len = foot - head;
  const mattressH = 0.2;
  g.add(
    mesh(
      pillow({ w: mw, h: mattressH, d: len, r: 0.04 }),
      linen,
      0,
      top + mattressH / 2,
      (head + foot) / 2,
    ),
  );
  const duvetLen = len * 0.72;
  g.add(
    mesh(
      pillow({ w: mw + 0.06, h: 0.06, d: duvetLen, r: 0.03, puff: 0.02 }),
      linenDark,
      0,
      top + mattressH + 0.03,
      foot - duvetLen / 2 + 0.03,
    ),
  );
  // pillows lean on the headboard; a low headboard (Poutre) keeps them lower
  // (tilted and puffed, a pillow rises ~16 cm above its centre)
  const pillowY = Math.min(top + mattressH + 0.06, maxTop - 0.17);
  for (const sx of [-1, 1]) {
    const p = mesh(
      pillow({ w: mw / 2 - 0.08, h: 0.12, d: 0.4, r: 0.05, puff: 0.03 }),
      linen,
      sx * mw * 0.24,
      pillowY,
      head + 0.26,
    );
    p.rotation.x = -0.25; // leaning on the headboard
    g.add(p);
  }
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

/** Bake a mesh's transform into its geometry (identity node at export). */
function baked(m: THREE.Mesh): THREE.Mesh {
  m.updateMatrix();
  m.geometry.applyMatrix4(m.matrix);
  m.position.set(0, 0, 0);
  m.quaternion.identity();
  return m;
}

/**
 * Leg of section w (x) × d (z), height h, sheared along z by dz at the floor:
 * leaning, with level top and foot (sawn flat), standing at (x, z) on top.
 */
function slantedLeg(
  w: number,
  d: number,
  h: number,
  dz: number,
  material: THREE.Material,
  x: number,
  z: number,
): THREE.Mesh {
  const g = new THREE.BoxGeometry(w, h, d);
  grainUVs(g, material, "y");
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0) pos.setZ(i, pos.getZ(i) + dz);
  }
  g.computeVertexNormals();
  return mesh(g, material, x, h / 2, z);
}

/** Dark end-grain square of a through tenon, on a face looking towards +z or -z. */
function tenon(g: THREE.Group, s: number, x: number, y: number, z: number): void {
  g.add(board(s, s, 0.008, endGrain, x, y, z, 0.002, "z"));
}

/**
 * LUNJA (La Redoute Intérieurs): brushed pine, rustic, warm honey-orange in
 * the photos. Plain slab design: one wide panel headboard down to the floor,
 * a tall foot panel down to the floor, and raised side rails (a drawer on
 * castors, sold separately, slides under them). 160 × 200: L 170 × l 209 ×
 * H 80 cm.
 */
export function lunja(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const t = 0.045; // board thickness
  const hbT = 0.045; // headboard thickness
  const frameTop = 0.34;
  const railH = 0.17;
  const head = -d / 2;
  g.add(board(w, h, hbT, lunjaPine, 0, h / 2, head + hbT / 2, 0.004, "x"));
  g.add(board(w, frameTop, t, lunjaPine, 0, frameTop / 2, d / 2 - t / 2, 0.004, "x"));
  const railLen = d - hbT - t;
  for (const sx of [-1, 1])
    g.add(
      board(
        t,
        railH,
        railLen,
        lunjaPine,
        sx * (w / 2 - t / 2),
        frameTop - railH / 2,
        head + hbT + railLen / 2,
        0.004,
        "z",
      ),
    );
  bedding(g, w, frameTop - 0.06, head + hbT, d / 2 - t);
  return g;
}

/**
 * JANIS: pale oiled pine storage bed. A raised box base: at the foot a drawer
 * on castors between two corner blocks; on each side an open niche at the
 * head (where the mobile bedside table slides in) and a drawer. Headboard:
 * two wide horizontal planks on two posts. 3 drawers, 2 niches.
 * 160 × 200: l 166 × L 207 × H 91 cm.
 */
export function janis(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const head = -d / 2;
  const t = 0.022; // panel thickness
  const top = 0.45; // top of the base
  const rail = 0.07; // top rail above the drawers
  const post = 0.05;
  const z0 = head + post + 0.025; // the base starts in front of the headboard
  const len = d / 2 - z0;
  const dh = top - rail - 0.04; // drawer front height (castors under it)
  const slot = (x: number, z: number, along: "x" | "z", y: number) =>
    g.add(
      board(
        along === "x" ? 0.12 : 0.006,
        0.025,
        along === "x" ? 0.006 : 0.12,
        darkGap,
        x,
        y,
        z,
        0.001,
      ),
    );
  // headboard: posts and two planks with a gap
  for (const sx of [-1, 1])
    g.add(board(post, h, post, janisPine, sx * (w / 2 - post / 2), h / 2, head + post / 2, 0.004));
  g.add(board(w, 0.15, 0.025, janisPine, 0, h - 0.075, head + post + 0.0125, 0.004, "x"));
  g.add(board(w, 0.11, 0.025, janisPine, 0, h - 0.245, head + post + 0.0125, 0.004, "x"));
  // core of the base, behind the drawers (narrower where the niches are)
  const niche = 0.42;
  const nicheDepth = 0.34;
  const nicheEnd = z0 + 2 * post + niche;
  const coreH = top - 0.02;
  g.add(board(w - 0.7, coreH, nicheEnd - z0, janisPine, 0, coreH / 2, (z0 + nicheEnd) / 2, 0.003));
  g.add(
    board(
      w - 0.06,
      coreH,
      d / 2 - 0.04 - nicheEnd,
      janisPine,
      0,
      coreH / 2,
      (nicheEnd + d / 2 - 0.04) / 2,
      0.003,
    ),
  );
  // foot: corner blocks, top rail, drawer (the drawers stand proud by `pr`)
  const block = 0.2;
  const pr = 0.008;
  for (const sx of [-1, 1]) {
    g.add(
      board(block, top, t, janisPine, sx * (w / 2 - block / 2), top / 2, d / 2 - t / 2 - pr, 0.003),
    );
    g.add(
      board(t, top, block, janisPine, sx * (w / 2 - t / 2 - pr), top / 2, d / 2 - block / 2, 0.003),
    );
  }
  g.add(
    board(w - 2 * block, rail, t, janisPine, 0, top - rail / 2, d / 2 - t / 2 - pr, 0.003, "x"),
  );
  g.add(board(w - 2 * block - 0.01, dh, t, janisPine, 0, 0.03 + dh / 2, d / 2 - t / 2, 0.003));
  slot(0, d / 2 - 0.002, "x", 0.03 + dh - 0.03);
  // sides: niche at the head, a drawer, the foot block
  for (const sx of [-1, 1]) {
    const xo = sx * (w / 2 - t / 2 - pr);
    g.add(
      board(t, rail, len - block, janisPine, xo, top - rail / 2, z0 + (len - block) / 2, 0.003),
    );
    // stiles between the openings
    for (const z of [z0 + post / 2, z0 + post + niche + post / 2])
      g.add(board(t, top - rail, post, janisPine, xo, (top - rail) / 2, z, 0.003, "y"));
    // the niche: back, bottom, a shelf, both ends (inside), all pine
    const nz = z0 + post + niche / 2;
    const xin = sx * (w / 2 - nicheDepth);
    g.add(board(t, top - rail, niche, janisPine, xin, (top - rail) / 2, nz, 0.003));
    for (const y of [0.02, (top - rail) / 2])
      g.add(board(nicheDepth, 0.02, niche, janisPine, sx * (w / 2 - nicheDepth / 2), y, nz, 0.003));
    // the drawer, proud of the side by a few millimetres
    const dz0 = z0 + 2 * post + niche;
    const dLen = d / 2 - block - dz0 - 0.005;
    g.add(board(t, dh, dLen, janisPine, xo + sx * pr, 0.03 + dh / 2, dz0 + dLen / 2, 0.003, "z"));
    slot(sx * (w / 2 - 0.002), dz0 + dLen / 2, "z", 0.03 + dh - 0.03);
  }
  bedding(g, w, top - 0.07, z0, d / 2 - 0.04);
  return g;
}

/**
 * PETRA: waxed solid pine beams, light and golden. A frame of thick beams
 * (head and foot rails across, side rails between, end-grain tenons at the
 * corners) on flat legs leaning out towards the head and the foot, a centre
 * beam on two legs. The headboard is a separate panel of two planks (a black
 * strip between them) on two black steel flat bars fixed to the head rail.
 * 160 × 200: l 182 × L 218 × H 84 cm.
 */
export function petra(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const beam = 0.1; // rail thickness
  const railH = 0.17;
  const railTop = 0.4;
  const head = -d / 2;
  const yc = railTop - railH / 2;
  for (const z of [head + beam / 2, d / 2 - beam / 2])
    g.add(board(w, railH, beam, petraPine, 0, yc, z, 0.008, "x"));
  for (const sx of [-1, 1])
    g.add(board(beam, railH, d - 2 * beam, petraPine, sx * (w / 2 - beam / 2), yc, 0, 0.008, "z"));
  // tenons of the side rails through the head and foot rails
  for (const sx of [-1, 1]) {
    tenon(g, 0.06, sx * (w / 2 - beam / 2), yc - 0.03, d / 2 - 0.003);
    tenon(g, 0.06, sx * (w / 2 - beam / 2), yc - 0.03, head + 0.003);
  }
  // legs under the corners, leaning out along the length
  const legH = railTop - 0.02;
  const lean = 0.13;
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - beam / 2);
    g.add(slantedLeg(0.07, 0.12, legH, lean, petraPine, x, d / 2 - beam - 0.1));
    g.add(slantedLeg(0.07, 0.12, legH, -lean, petraPine, x, head + beam + 0.1));
  }
  // centre beam on two legs
  const cb = 0.06;
  g.add(board(cb, cb, d - 2 * beam, petraPine, 0, railTop - railH + cb / 2 + 0.03, 0, 0.004, "z"));
  for (const z of [-d / 4, d / 4]) {
    const lh = railTop - railH + 0.03;
    g.add(board(0.05, lh, 0.05, petraPine, 0, lh / 2, z, 0.003, "y"));
  }
  // headboard: two planks and a black strip, on two flat bars
  const hbW = w - 2 * beam - 0.06;
  const plank = 0.14;
  const strip = 0.015;
  const hbZ = head + beam - 0.01;
  g.add(board(hbW, plank, 0.03, petraPine, 0, h - plank / 2, hbZ, 0.004, "x"));
  g.add(board(hbW, strip, 0.025, blackSteel, 0, h - plank - strip / 2, hbZ, 0.002, "x"));
  g.add(board(hbW, plank, 0.03, petraPine, 0, h - 1.5 * plank - strip, hbZ, 0.004, "x"));
  const hbBottom = h - 2 * plank - strip;
  for (const sx of [-1, 1]) {
    const y0 = railTop - railH + 0.02;
    const y1 = hbBottom + 0.08;
    g.add(board(0.04, y1 - y0, 0.006, blackSteel, sx * 0.53, (y0 + y1) / 2, head + beam + 0.008));
  }
  bedding(g, w, railTop - 0.08, head + beam, d / 2 - beam);
  return g;
}

/**
 * POUTRE: waxed and recycled pine beams, warm brown. A frame of thick beams
 * (foot and head beams across, side beams between, end-grain tenons at the
 * foot) floating on recessed legs; the headboard is one more beam across,
 * raised just above the mattress. 160 × 200: l 196 × L 236 × H 63 cm.
 */
export function poutre(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const beam = 0.16; // beam height
  const bw = 0.18; // beam width
  const frameTop = 0.33;
  const head = -d / 2;
  const yc = frameTop - beam / 2;
  for (const z of [head + bw / 2, d / 2 - bw / 2])
    g.add(board(w, beam, bw, poutrePine, 0, yc, z, 0.012, "x"));
  for (const sx of [-1, 1])
    g.add(board(bw, beam, d - 2 * bw, poutrePine, sx * (w / 2 - bw / 2), yc, 0, 0.012, "z"));
  for (const sx of [-1, 1]) tenon(g, 0.08, sx * (w / 2 - bw / 2), yc - 0.02, d / 2 - 0.003);
  // recessed legs (in the shadow, the frame seems to float) and a centre rail
  const legH = frameTop - beam;
  for (const x of [-(w / 2 - 0.4), 0, w / 2 - 0.4])
    for (const z of [head + 0.45, d / 2 - 0.45])
      g.add(board(0.1, legH, 0.1, poutrePine, x, legH / 2, z, 0.004, "y"));
  // headboard beam on two blocks standing on the head beam
  const hbH = 0.18;
  const hbD = 0.12;
  const hbW = w - 0.3;
  const hbZ = head + hbD / 2 + 0.02;
  g.add(board(hbW, hbH, hbD, poutrePine, 0, h - hbH / 2, hbZ, 0.012, "x"));
  const gap = h - hbH - frameTop;
  for (const sx of [-1, 1])
    g.add(board(0.12, gap, 0.08, poutrePine, sx * hbW * 0.3, frameTop + gap / 2, hbZ, 0.004, "y"));
  bedding(g, w, frameTop - 0.08, head + bw, d / 2 - bw, h);
  return g;
}

/**
 * LUNDBY: rough sawn ash, warm mid brown: a U (top over two thick sides) with
 * a shelf set back a little, a third of the way up. L 40 × P 35 × H 45 cm.
 */
export function lundby(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const t = 0.03;
  g.add(board(w, t, d, lundbyAsh, 0, h - t / 2, 0, 0.004, "x"));
  for (const sx of [-1, 1])
    g.add(board(t, h - t, d, lundbyAsh, sx * (w / 2 - t / 2), (h - t) / 2, 0, 0.004, "y"));
  g.add(board(w - 2 * t, 0.025, d - 0.03, lundbyAsh, 0, 0.175, -0.015, 0.003, "x"));
  bedsideLamp(g, -w / 2 + 0.14, h, -d / 2 + 0.15); // decor
  return g;
}

/**
 * OREGON: brushed solid ash box (top over the sides, a thin bottom rail) with
 * one drawer faced with two big end-grain log squares, under a shadow gap;
 * splayed flat black metal legs. L 40 × P 35 × H 42 cm.
 */
export function oregon(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const body = 0.28;
  const y0 = h - body;
  const t = 0.02;
  const top = 0.025;
  g.add(board(w, top, d, oregonAsh, 0, h - top / 2, 0, 0.003, "x"));
  for (const sx of [-1, 1])
    g.add(
      board(t, body - top, d, oregonAsh, sx * (w / 2 - t / 2), y0 + (body - top) / 2, 0, 0.003),
    );
  g.add(board(w - 2 * t, t, d, oregonAsh, 0, y0 + t / 2, 0, 0.003, "x"));
  g.add(
    board(w - 2 * t, body - top - t, 0.012, oregonAsh, 0, y0 + body / 2, -d / 2 + 0.006, 0.002),
  );
  // shadow gap under the top, then the drawer front: two end-grain squares
  const gap = 0.018;
  const fh = body - top - t - gap - 0.004;
  g.add(board(w - 2 * t, gap, 0.01, darkGap, 0, h - top - gap / 2, d / 2 - 0.02, 0.001));
  const fw = (w - 2 * t - 0.006) / 2;
  for (const [i, sx] of [-1, 1].entries())
    g.add(
      board(
        fw - 0.002,
        fh,
        0.03,
        oregonLogs[i],
        sx * (fw / 2 + 0.001),
        y0 + t + 0.002 + fh / 2,
        d / 2 - 0.019,
        0.002,
        "z", // the log's end grain faces the front
      ),
    );
  // splayed legs: flat bars leaning out from under the body
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      // baked: a rotated node would inflate the loose bounding box of the GLB
      g.add(
        baked(
          bar(
            v(sx * 0.11, y0 + 0.01, sz * 0.09),
            v(sx * 0.165, 0.004, sz * 0.14),
            0.04,
            0.015,
            blackSteel,
            0.002,
          ),
        ),
      );
    }
  }
  bedsideLamp(g, -w / 2 + 0.14, h, -d / 2 + 0.15); // decor
  return g;
}

/** Cubbies: vertical dividers of varying width per row (a staggered grid). */
function cubbies(
  g: THREE.Group,
  material: THREE.Material,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  d: number,
  rows: number,
  t: number,
  seed: number,
): void {
  const rnd = seeded(seed);
  const rh = (y1 - y0) / rows;
  for (let j = 1; j < rows; j++)
    g.add(board(x1 - x0, t, d, material, (x0 + x1) / 2, y0 + rh * j, 0, 0.003, "x"));
  for (let j = 0; j < rows; j++) {
    // one or two dividers per row, never in the same place twice
    const cuts = rnd() < 0.5 ? [0.3 + rnd() * 0.4] : [0.2 + rnd() * 0.2, 0.6 + rnd() * 0.2];
    // books in each compartment of the row
    const edges = [x0, ...cuts.map((c) => x0 + (x1 - x0) * c), x1];
    for (let k = 0; k + 1 < edges.length; k++) {
      fillShelf(
        g,
        edges[k] + t / 2,
        edges[k + 1] - t / 2,
        y0 + rh * j + t / 2,
        -d / 2,
        d,
        rh - t,
        seed * 97 + j * 7 + k,
      );
    }
    for (const c of cuts) {
      g.add(board(t, rh - t, d, material, x0 + (x1 - x0) * c, y0 + rh * (j + 0.5), 0, 0.003, "y"));
    }
  }
}

/**
 * Borneo inside, symmetric about the centre (left half; u across the width
 * from the left edge, v up the height, both 0..1, from the product photo):
 * shelves [u0, u1, v] and dividers [u, v0, v1]. A cross-shaped opening runs
 * down the middle, framed by small cubbies top and bottom and a narrow centre
 * column of small shelves.
 */
const BORNEO_SHELVES: [number, number, number][] = [
  [0.35, 0.5, 0.89], // top centre cubby
  [0, 0.35, 0.82],
  [0, 0.43, 0.745],
  [0, 0.43, 0.593],
  [0.43, 0.5, 0.676], // centre column
  [0.43, 0.5, 0.51],
  [0.43, 0.5, 0.359],
  [0, 0.43, 0.423],
  [0, 0.43, 0.279],
  [0, 0.35, 0.22],
  [0.35, 0.5, 0.166], // bottom centre cubby
];
const BORNEO_DIVIDERS: [number, number, number][] = [
  [0.35, 0.82, 1],
  [0.25, 0.745, 0.82],
  [0.43, 0.279, 0.745],
  [0.25, 0.22, 0.279],
  [0.35, 0, 0.22],
];

/**
 * BORNEO: recycled teak, a thick outer frame with rounded corners around a
 * symmetric pattern of shelves and cubbies, open back. L 100 × P 30,5 × H 200 cm.
 */
export function borneo(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const t = 0.04;
  const r = 0.12;
  // rounded outer frame: a rounded-rectangle ring extruded along z
  const outer = new THREE.Shape();
  outer.moveTo(-w / 2 + r, 0);
  outer.lineTo(w / 2 - r, 0);
  outer.quadraticCurveTo(w / 2, 0, w / 2, r);
  outer.lineTo(w / 2, h - r);
  outer.quadraticCurveTo(w / 2, h, w / 2 - r, h);
  outer.lineTo(-w / 2 + r, h);
  outer.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
  outer.lineTo(-w / 2, r);
  outer.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
  const ri = r - t;
  const hole = new THREE.Path();
  hole.moveTo(-w / 2 + t + ri, t);
  hole.lineTo(w / 2 - t - ri, t);
  hole.quadraticCurveTo(w / 2 - t, t, w / 2 - t, t + ri);
  hole.lineTo(w / 2 - t, h - t - ri);
  hole.quadraticCurveTo(w / 2 - t, h - t, w / 2 - t - ri, h - t);
  hole.lineTo(-w / 2 + t + ri, h - t);
  hole.quadraticCurveTo(-w / 2 + t, h - t, -w / 2 + t, h - t - ri);
  hole.lineTo(-w / 2 + t, t + ri);
  hole.quadraticCurveTo(-w / 2 + t, t, -w / 2 + t + ri, t);
  outer.holes.push(hole);
  const frame = new THREE.ExtrudeGeometry(outer, {
    depth: d - 0.006,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelOffset: -0.003,
    bevelSegments: 2,
    curveSegments: 12,
  });
  frame.translate(0, 0, -d / 2 + 0.003);
  frame.computeVertexNormals();
  g.add(new THREE.Mesh(frame, shelfTeak));
  // inside, mirrored about the centre; u / v map to the inner opening
  const s = 0.025;
  const dd = d - 0.01;
  const x = (u: number) => -w / 2 + t + u * (w - 2 * t);
  const y = (vv: number) => t + vv * (h - 2 * t);
  for (const [u0, u1, vv] of BORNEO_SHELVES) {
    const sym = u1 === 0.5;
    for (const m of sym ? [1] : [-1, 1]) {
      const a = sym ? x(u0) : m < 0 ? x(u0) : -x(u1);
      const b = sym ? -x(u0) : m < 0 ? x(u1) : -x(u0);
      g.add(board(b - a, s, dd, shelfTeak, (a + b) / 2, y(vv), 0, 0.003, "x"));
    }
  }
  for (const [u, v0, v1] of BORNEO_DIVIDERS) {
    for (const m of [-1, 1]) {
      const y0 = y(v0) + (v0 > 0 ? s / 2 : 0);
      const y1 = y(v1) - (v1 < 1 ? s / 2 : 0);
      g.add(board(s, y1 - y0, dd, shelfTeak, m * x(u), (y0 + y1) / 2, 0, 0.003, "y"));
    }
  }
  // books on every shelf (and the bottom of the frame), split at the
  // dividers, up to the next shelf above
  const shelves = [
    ...BORNEO_SHELVES.flatMap(([u0, u1, vv]) =>
      u1 === 0.5
        ? [[x(u0), -x(u0), vv]]
        : [
            [x(u0), x(u1), vv],
            [-x(u1), -x(u0), vv],
          ],
    ),
    [x(0), -x(0), 0],
  ];
  const walls = BORNEO_DIVIDERS.flatMap(([u, v0, v1]) => [
    [x(u), v0, v1],
    [-x(u), v0, v1],
  ]);
  shelves.forEach(([a, b, vv], i) => {
    const top = vv === 0 ? t : y(vv) + s / 2;
    const cuts = walls
      .filter(([wx, v0, v1]) => wx > a && wx < b && y(v0) <= top && y(v1) > top + 0.05)
      .map(([wx]) => wx)
      .sort((p0, p1) => p0 - p1);
    const edges = [a, ...cuts, b];
    for (let k = 0; k + 1 < edges.length; k++) {
      const x0 = edges[k] + (k > 0 ? s / 2 : 0);
      const x1 = edges[k + 1] - (k + 1 < edges.length - 1 ? s / 2 : 0);
      const mid = (x0 + x1) / 2;
      const above = shelves
        .filter(([a1, b1, v1]) => v1 > vv && a1 < mid && b1 > mid)
        .map(([, , v1]) => y(v1) - s / 2);
      const ceiling = Math.min(h - t, ...above);
      fillShelf(g, x0, x1, top, -dd / 2, dd, ceiling - top, 400 + i * 7 + k);
    }
  });
  return g;
}

/** FINA: recycled teak bookcase, straight frame, staggered cubbies. L 141 × P 33 × H 220 cm. */
export function fina(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const t = 0.035;
  for (const sx of [-1, 1])
    g.add(board(t, h, d, shelfTeak, sx * (w / 2 - t / 2), h / 2, 0, 0.003, "y"));
  g.add(board(w - 2 * t, t, d, shelfTeak, 0, h - t / 2, 0, 0.003, "x"));
  g.add(board(w - 2 * t, t, d, shelfTeak, 0, 0.02 + t / 2, 0, 0.003, "x"));
  cubbies(g, shelfTeak, -w / 2 + t, w / 2 - t, 0.02 + t, h - t, d - 0.01, 6, 0.028, 53);
  return g;
}

/**
 * SEATLE: two black metal towers (thin square tube, open boxes rising above
 * the top shelf) carrying five long recycled-pine trays: a raised lip at the
 * back and at both ends, the front open. L 159,5 × P 32 × H 181 cm.
 */
export function seatle(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const tube = 0.012;
  const towerW = 0.34;
  const towerD = d - 0.04;
  const shelves = 5;
  const y0 = 0.17;
  const step = 0.33;
  const shelfT = 0.025;
  for (const cx of [-w / 2 + 0.3, w / 2 - 0.3]) {
    const xs = [cx - towerW / 2 + tube / 2, cx + towerW / 2 - tube / 2];
    const zs = [-towerD / 2 + tube / 2, towerD / 2 - tube / 2];
    for (const x of xs)
      for (const z of zs) g.add(bar(v(x, 0, z), v(x, h, z), tube, tube, blackSteel, 0.001));
    // a frame at the top, and a bar under each shelf front and back
    const levels = [h - tube / 2];
    for (let i = 0; i < shelves; i++) levels.push(y0 + i * step - shelfT / 2 - tube / 2);
    for (const y of levels)
      for (const z of zs) g.add(board(towerW, tube, tube, blackSteel, cx, y, z, 0.001, "x"));
    for (const x of xs)
      g.add(board(tube, tube, towerD, blackSteel, x, h - tube / 2, 0, 0.001, "z"));
  }
  const lip = 0.012;
  for (let i = 0; i < shelves; i++) {
    const y = y0 + i * step;
    g.add(board(w, shelfT, d, seatlePine, 0, y, 0, 0.003, "x"));
    g.add(board(w, 0.035, lip, seatlePine, 0, y + 0.03, -d / 2 + lip / 2, 0.002, "x"));
    for (const sx of [-1, 1])
      g.add(board(lip, 0.045, d, seatlePine, sx * (w / 2 - lip / 2), y + 0.035, 0, 0.002, "z"));
    // books, beside the metal towers, on all but the top shelf
    if (i < shelves - 1) {
      const inner = [-w / 2 + 0.3 + towerW / 2, w / 2 - 0.3 - towerW / 2];
      const spans: [number, number][] = [
        [-w / 2 + lip + 0.01, -inner[1] - towerW - 0.01],
        [inner[0] + 0.01, inner[1] - 0.01],
        [inner[1] + towerW + 0.01, w / 2 - lip - 0.01],
      ];
      spans.forEach(([a, b], k) =>
        fillShelf(
          g,
          a,
          b,
          y + shelfT / 2,
          -d / 2 + lip,
          d - lip - 0.02,
          step - shelfT - 0.05,
          300 + i * 5 + k,
        ),
      );
    }
  }
  return g;
}

export const BEDROOM_BUILDERS: Record<string, (p: Product) => THREE.Group> = {
  "bed-lunja": lunja,
  "bed-janis": janis,
  "bed-petra": petra,
  "bed-poutre": poutre,
  "nightstand-lundby": lundby,
  "nightstand-oregon": oregon,
  "shelf-borneo": borneo,
  "shelf-fina": fina,
  "shelf-seatle": seatle,
};
