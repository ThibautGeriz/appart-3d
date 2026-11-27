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
import { bar, board, v } from "./parts";
import { pillow } from "./sofa";
import { bedsideLamp, fillShelf } from "./decor";

/*
 * Bedroom furniture at the seller's dimensions. Beds: width w along x, length
 * d along z, the head at -z and the foot towards +z; they carry a mattress,
 * a duvet and two pillows (sold separately, but a bed reads as one with
 * them). Bedside tables and shelves: width along x, front towards +z.
 * Origin: floor, centred.
 */

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

/**
 * LUNJA (La Redoute Intérieurs): brushed solid pine, dark, rustic: thick
 * square legs, side rails, a headboard of vertical planks between the head
 * posts. 160 × 200: L 170 × l 209 × H 80 cm.
 */
export function lunja(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const leg = 0.09;
  const railTop = 0.36;
  const head = -d / 2;
  for (const sx of [-1, 1]) {
    g.add(board(leg, h, leg, darkPine, sx * (w / 2 - leg / 2), h / 2, head + leg / 2, 0.006, "y"));
    g.add(
      board(
        leg,
        railTop + 0.04,
        leg,
        darkPine,
        sx * (w / 2 - leg / 2),
        (railTop + 0.04) / 2,
        d / 2 - leg / 2,
        0.006,
        "y",
      ),
    );
    g.add(
      board(0.045, 0.18, d - 2 * leg, darkPine, sx * (w / 2 - 0.03), railTop - 0.09, 0, 0.004, "z"),
    );
  }
  g.add(board(w - 2 * leg, 0.18, 0.045, darkPine, 0, railTop - 0.09, d / 2 - 0.03, 0.004, "x"));
  // headboard: vertical planks over a lower rail
  const planks = 7;
  const span = w - 2 * leg;
  for (let i = 0; i < planks; i++) {
    const pw = span / planks - 0.006;
    g.add(
      board(
        pw,
        h - railTop - 0.12,
        0.035,
        darkPine,
        -span / 2 + (span / planks) * (i + 0.5),
        (h + railTop - 0.04) / 2,
        head + leg / 2,
        0.004,
        "y",
      ),
    );
  }
  g.add(board(span, 0.1, 0.05, darkPine, 0, railTop + 0.01, head + leg / 2, 0.004, "x"));
  bedding(g, w, railTop - 0.06, head + leg, d / 2 - 0.05);
  return g;
}

/**
 * JANIS: honey pine storage bed: a box base with drawers on castors (one at
 * the foot, one on each side), a slatted headboard with two niches.
 * 160 × 200: l 166 × L 207 × H 91 cm.
 */
export function janis(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const baseTop = 0.42;
  const head = -d / 2;
  const hb = 0.18; // headboard depth (with its niches)
  // base box
  g.add(
    board(
      w - 0.04,
      baseTop - 0.02,
      d - hb - 0.02,
      honeyPine,
      0,
      (baseTop - 0.02) / 2 + 0.01,
      hb / 2 - 0.01,
      0.006,
      "z",
    ),
  );
  // drawer fronts: foot, and each side, with a hand slot
  const dh = baseTop - 0.1;
  g.add(board(w * 0.55, dh, 0.02, honeyPine, 0, 0.05 + dh / 2, d / 2 - 0.01, 0.004, "x"));
  g.add(board(0.14, 0.025, 0.004, darkGap, 0, 0.05 + dh - 0.05, d / 2 - 0.0015, 0.001));
  for (const sx of [-1, 1]) {
    g.add(
      board(0.02, dh, d * 0.42, honeyPine, sx * (w / 2 - 0.01), 0.05 + dh / 2, 0.15, 0.004, "z"),
    );
    g.add(board(0.004, 0.025, 0.14, darkGap, sx * (w / 2 - 0.0015), 0.05 + dh - 0.05, 0.15, 0.001));
  }
  // headboard: two posts, horizontal slats, a niche shelf at each side
  for (const sx of [-1, 1]) {
    g.add(board(0.06, h, hb, honeyPine, sx * (w / 2 - 0.03), h / 2, head + hb / 2, 0.006, "y"));
    g.add(
      board(
        w * 0.22,
        0.025,
        hb - 0.02,
        honeyPine,
        sx * (w / 2 - 0.06 - w * 0.11),
        baseTop + 0.16,
        head + hb / 2,
        0.003,
        "x",
      ),
    );
  }
  for (let i = 0; i < 4; i++) {
    g.add(
      board(
        w - 0.12,
        0.08,
        0.025,
        honeyPine,
        0,
        baseTop + 0.06 + i * 0.11,
        head + 0.02,
        0.004,
        "x",
      ),
    );
  }
  g.add(board(w - 0.12, 0.025, hb, honeyPine, 0, h - 0.0125, head + hb / 2, 0.004, "x"));
  bedding(g, w, baseTop, head + hb, d / 2 - 0.03);
  return g;
}

/**
 * PETRA: waxed solid pine, thick rails on splayed legs (an A at the head and
 * the foot), a low plank headboard. 160 × 200: l 182 × L 218 × H 84 cm.
 */
export function petra(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const railTop = 0.34;
  const rail = 0.16;
  const head = -d / 2;
  // side rails, thick, running past the corners
  for (const sx of [-1, 1])
    g.add(
      board(
        0.06,
        rail,
        d - 0.04,
        honeyPine,
        sx * (w / 2 - 0.03),
        railTop - rail / 2,
        0.02,
        0.008,
        "z",
      ),
    );
  g.add(board(w - 0.12, rail, 0.05, honeyPine, 0, railTop - rail / 2, d / 2 - 0.025, 0.008, "x"));
  // splayed legs, outwards at each corner
  for (const sx of [-1, 1]) {
    for (const [z, out] of [
      [d / 2 - 0.12, 1],
      [head + 0.12, -1],
    ]) {
      g.add(
        bar(
          v(sx * (w / 2 - 0.08), railTop - rail + 0.02, z),
          v(sx * (w / 2 - 0.04), 0.02, z + out * 0.08),
          0.07,
          0.07,
          honeyPine,
          0.008,
        ),
      );
    }
  }
  // headboard: a wide plank on two posts
  for (const sx of [-1, 1])
    g.add(board(0.07, h, 0.07, honeyPine, sx * (w / 2 - 0.035), h / 2, head + 0.035, 0.008, "y"));
  g.add(board(w - 0.14, 0.26, 0.04, honeyPine, 0, h - 0.18, head + 0.035, 0.006, "x"));
  bedding(g, w, railTop - 0.05, head + 0.07, d / 2 - 0.05);
  return g;
}

/**
 * POUTRE: waxed and recycled pine: a frame of thick beams floating on a
 * recessed base, a beam headboard. 160 × 200: l 196 × L 236 × H 63 cm.
 */
export function poutre(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const beam = 0.18;
  const frameTop = 0.32;
  const head = -d / 2;
  const hb = 0.16;
  // recessed base (in shadow), the frame seems to float
  g.add(board(w - 0.5, frameTop - beam, d - 0.6, darkGap, 0, (frameTop - beam) / 2, 0.05, 0.004));
  for (const sx of [-1, 1])
    g.add(
      board(
        0.14,
        beam,
        d - hb,
        recycledPine,
        sx * (w / 2 - 0.07),
        frameTop - beam / 2,
        hb / 2,
        0.012,
        "z",
      ),
    );
  g.add(
    board(w - 0.28, beam, 0.14, recycledPine, 0, frameTop - beam / 2, d / 2 - 0.07, 0.012, "x"),
  );
  // headboard: two beams stacked, full width, on the floor
  g.add(board(w, h - 0.18, hb, recycledPine, 0, (h - 0.18) / 2, head + hb / 2, 0.012, "x"));
  g.add(board(w, 0.18, hb + 0.02, recycledPine, 0, h - 0.09, head + hb / 2 + 0.01, 0.014, "x"));
  bedding(g, w, frameTop - 0.08, head + hb, d / 2 - 0.14, h);
  return g;
}

/** LUNDBY: rough sawn ash, a U (top over two sides) with a low shelf. L 40 × P 35 × H 45 cm. */
export function lundby(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const t = 0.03;
  g.add(board(w, t, d, roughAsh, 0, h - t / 2, 0, 0.004, "x"));
  for (const sx of [-1, 1])
    g.add(board(t, h - t, d, roughAsh, sx * (w / 2 - t / 2), (h - t) / 2, 0, 0.004, "y"));
  g.add(board(w - 2 * t, 0.025, d - 0.03, roughAsh, 0, 0.14, 0.01, 0.003, "x"));
  bedsideLamp(g, -w / 2 + 0.14, h, -d / 2 + 0.15); // decor
  return g;
}

/**
 * OREGON: brushed solid ash box with one drawer faced with sawn log slices,
 * on splayed black metal legs. L 40 × P 35 × H 42 cm.
 */
export function oregon(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const body = 0.24;
  const y0 = h - body;
  g.add(board(w, body, d - 0.01, roughAsh, 0, y0 + body / 2, -0.005, 0.005, "x"));
  // drawer front: a mosaic of log slices (end grain), each a little different
  const rnd = seeded(77);
  const cols = 4;
  const rows = 3;
  const fw = w - 0.03;
  const fh = body - 0.05;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const m = roughAsh.clone();
      m.color = new THREE.Color().setHSL(0.07, 0.35 + rnd() * 0.15, 0.45 + rnd() * 0.25);
      m.name = roughAsh.name;
      g.add(
        board(
          fw / cols - 0.003,
          fh / rows - 0.003,
          0.012 + rnd() * 0.006,
          m,
          -fw / 2 + (fw / cols) * (i + 0.5),
          y0 + 0.025 + (fh / rows) * (j + 0.5),
          d / 2 - 0.012,
          0.002,
          "y",
        ),
      );
    }
  }
  // splayed legs: flat bars leaning out from under the body
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(
        bar(
          v(sx * (w / 2 - 0.06), y0 + 0.01, sz * (d / 2 - 0.06)),
          v(sx * (w / 2 - 0.012), 0.004, sz * (d / 2 - 0.03)),
          0.025,
          0.012,
          blackSteel,
          0.002,
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
 * BORNEO: recycled teak, a thick outer frame with rounded corners around a
 * staggered grid of cubbies, open back. L 100 × P 30,5 × H 200 cm.
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
  g.add(new THREE.Mesh(frame, recycledTeak));
  cubbies(g, recycledTeak, -w / 2 + t, w / 2 - t, t, h - t, d - 0.01, 7, 0.025, 41);
  return g;
}

/** FINA: recycled teak bookcase, straight frame, staggered cubbies. L 141 × P 33 × H 220 cm. */
export function fina(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const t = 0.035;
  for (const sx of [-1, 1])
    g.add(board(t, h, d, recycledTeak, sx * (w / 2 - t / 2), h / 2, 0, 0.003, "y"));
  g.add(board(w - 2 * t, t, d, recycledTeak, 0, h - t / 2, 0, 0.003, "x"));
  g.add(board(w - 2 * t, t, d, recycledTeak, 0, 0.02 + t / 2, 0, 0.003, "x"));
  cubbies(g, recycledTeak, -w / 2 + t, w / 2 - t, 0.02 + t, h - t, d - 0.01, 6, 0.028, 53);
  return g;
}

/**
 * SEATLE: two black metal towers (thin square tube) carrying five long
 * recycled-pine shelves. L 159,5 × P 32 × H 181 cm.
 */
export function seatle(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const tube = 0.012;
  const towerW = 0.3;
  for (const cx of [-w / 2 + 0.32, w / 2 - 0.32]) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = cx + sx * (towerW / 2 - tube / 2);
        const z = sz * (d / 2 - tube / 2 - 0.005);
        g.add(bar(v(x, 0, z), v(x, h, z), tube, tube, blackSteel, 0.001));
      }
    }
    for (const sz of [-1, 1])
      g.add(
        bar(
          v(cx - towerW / 2, h - tube / 2, sz * (d / 2 - 0.011)),
          v(cx + towerW / 2, h - tube / 2, sz * (d / 2 - 0.011)),
          tube,
          tube,
          blackSteel,
          0.001,
        ),
      );
  }
  const shelves = 5;
  for (let i = 0; i < shelves; i++) {
    const y = 0.08 + i * ((h - 0.32) / (shelves - 1));
    g.add(board(w, 0.03, d - 0.01, recycledPine, 0, y, 0, 0.004, "x"));
    // the shelf's lip at the front
    g.add(board(w, 0.012, 0.012, recycledPine, 0, y + 0.02, d / 2 - 0.011, 0.002, "x"));
    // books, outside the metal towers, on all but the top shelf
    if (i < shelves - 1) {
      const room = (h - 0.32) / (shelves - 1) - 0.05;
      const towers = [-w / 2 + 0.32, w / 2 - 0.32];
      const spans: [number, number][] = [
        [-w / 2 + 0.01, towers[0] - 0.16],
        [towers[0] + 0.16, towers[1] - 0.16],
        [towers[1] + 0.16, w / 2 - 0.01],
      ];
      spans.forEach(([a, b], k) =>
        fillShelf(g, a, b, y + 0.015, -d / 2 + 0.01, d - 0.03, room, 300 + i * 5 + k),
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
