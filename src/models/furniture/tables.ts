import * as THREE from "three";
import type { Product } from "../../data/catalog";
import { darkGap } from "../materials";
import { seeded } from "../shapes";
import { darkScrew, oiledOak, recycledElm, suar, teak } from "./materials";
import { bar, board, liveEdge, slab, v } from "./parts";

/*
 * Tables at the seller's dimensions: length w along x, depth d along z,
 * height h. Origin: floor, centered.
 */

/**
 * Same photo scan, another tint: the clone keeps the scan's material name
 * (textures are attached by name at export), only the colour factor changes.
 */
function retint(
  base: THREE.MeshStandardMaterial,
  color: string,
  roughness = base.roughness,
): THREE.MeshStandardMaterial {
  const m = base.clone();
  m.color = new THREE.Color(color);
  m.roughness = roughness;
  m.name = base.name;
  return m;
}

// Colours read from the seller's photos (flat, lit areas of the top).
/** Valmo: recycled teak, grey-brown (~#846a5d); the walnut scan, less red than rosewood. */
const valmoTeak = retint(teak, "#d1c5bf");
/** Willow: solid teak, warm mid brown (~#a88371). */
const willowTeak = retint(teak, "#fff1e5");
/** Raia: pale oiled suar (~#d1b097), as light as the scan allows. */
const paleSuar = retint(suar, "#fff4e6", 0.75);
/** Ontario: oiled oak, warm honey (~#9f775a). */
const ontarioOak = retint(oiledOak, "#f0c89c");
/** Norway coffee table: oiled oak, honey (~#997055 – #b58c61). */
const honeyOak = retint(oiledOak, "#fff0d8");

/** Valmo legs: matte charcoal powder coat, lighter than the other bases. */
const charcoalSteel = new THREE.MeshStandardMaterial({
  name: "charcoal steel",
  color: "#2e3033",
  metalness: 0.3,
  roughness: 0.6,
});
/** Black lacquered metal / plywood: satin, not shiny. */
const blackLacquer = new THREE.MeshStandardMaterial({
  name: "black lacquer",
  color: "#25272a",
  metalness: 0.2,
  roughness: 0.55,
});
/** Ontario: dark grey lacquered plywood inset in the top. */
const slateLacquer = new THREE.MeshStandardMaterial({
  name: "slate lacquer",
  color: "#5a5b5a",
  metalness: 0,
  roughness: 0.6,
});

function rect(w: number, d: number, r = 0.004): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2);
  s.lineTo(w / 2 - r, -d / 2);
  s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r);
  s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  s.lineTo(-w / 2 + r, d / 2);
  s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  s.lineTo(-w / 2, -d / 2 + r);
  s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  return s;
}

/**
 * VALMO: thin recycled-teak top on black angle-iron corner legs and a
 * slim steel frame under the top. L 180/220 × P 90 × H 76 cm.
 */
export function valmo(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const top = 0.025;
  g.add(slab(rect(w, d), h, top, 0.005, valmoTeak));
  const under = h - top;
  // frame rails under the top
  const inset = 0.06;
  for (const sz of [-1, 1]) {
    g.add(
      board(
        w - 2 * inset,
        0.045,
        0.015,
        charcoalSteel,
        0,
        under - 0.0225,
        sz * (d / 2 - inset),
        0.002,
      ),
    );
  }
  for (const sx of [-1, 1]) {
    g.add(
      board(
        0.015,
        0.045,
        d - 2 * inset,
        charcoalSteel,
        sx * (w / 2 - inset - 0.1),
        under - 0.0225,
        0,
        0.002,
      ),
    );
  }
  // corner legs: 80 mm angle irons, flanges along the length and the width
  const flange = 0.08;
  const t = 0.012;
  const lx = w / 2 - 0.015; // the top barely overhangs the legs
  const lz = d / 2 - 0.015;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(
        board(
          flange,
          under,
          t,
          charcoalSteel,
          sx * (lx - flange / 2),
          under / 2,
          sz * (lz - t / 2),
          0.002,
          "y",
        ),
      );
      g.add(
        board(
          t,
          under,
          flange,
          charcoalSteel,
          sx * (lx - t / 2),
          under / 2,
          sz * (lz - flange / 2),
          0.002,
          "y",
        ),
      );
    }
  }
  return g;
}

/**
 * RAIA: thick live-edge suar slab in two parts (seam down the middle) on two
 * black steel bases folded in a V, joined by a raw suar beam passing through
 * them. L 220 × P 106 × H 76 cm.
 */
export function raia(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const top = 0.07;
  const seam = 0.003;
  // two half slabs, each with one live edge (the outer one)
  g.add(
    slab(
      new THREE.Shape(liveEdge(w, seam / 2, d / 2, 0.06, 3, { near: false, far: true })),
      h,
      top,
      0.008,
      paleSuar,
    ),
  );
  g.add(
    slab(
      new THREE.Shape(liveEdge(w, -d / 2, -seam / 2, 0.06, 5, { near: true, far: false })),
      h,
      top,
      0.008,
      paleSuar,
    ),
  );
  const under = h - top;
  // bases: two 10 mm plates folded into a V, apex towards the middle
  const baseX = w / 2 - 0.42;
  for (const sx of [-1, 1]) {
    const apex = v(sx * (baseX - 0.12), 0, 0);
    for (const sz of [-1, 1]) {
      const end = v(sx * baseX, 0, sz * 0.36);
      // 10 mm vertical plate from the apex to its outer end, full height under the slab
      const len = apex.distanceTo(end);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(len, under, 0.01), blackLacquer);
      plate.position.set((apex.x + end.x) / 2, under / 2, (apex.z + end.z) / 2);
      plate.rotation.y = -Math.atan2(end.z - apex.z, end.x - apex.x);
      g.add(plate);
    }
    // mounting plate under the slab
    g.add(board(0.1, 0.008, 0.8, blackLacquer, sx * (baseX - 0.06), under - 0.004, 0, 0.002));
  }
  // square suar beam set on edge (a diamond), low, through the folds of both
  // bases; its ends stick out past the plates
  const beam = 0.075;
  const beamL = 2 * (baseX + 0.07);
  const b = board(beamL, beam, beam, paleSuar, 0, 0.25, 0, 0.006, "x");
  b.rotation.x = Math.PI / 4;
  g.add(b);
  return g;
}

/**
 * WILLOW: live-edge solid teak slab on a "mikado" base of black square tubes
 * crossing each other. L 220 × P 100 × H 79 cm.
 */
export function willow(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const top = 0.05;
  g.add(slab(new THREE.Shape(liveEdge(w, -d / 2, d / 2, 0.045, 9)), h, top, 0.006, willowTeak));
  const under = h - top;
  const s = (w - 0.8) / 1.4; // spread grows with the length
  const t = 0.05;
  // top frame under the slab
  for (const sz of [-1, 1])
    g.add(board(0.9 * s + 0.4, 0.03, t, blackLacquer, 0, under - 0.015, sz * 0.25, 0.002));
  const y0 = 0.02;
  const y1 = under - 0.03;
  const bars: [number, number, number, number][] = [
    [-0.62, -0.4, 0.36, 0.25],
    [0.62, 0.4, -0.36, -0.25],
    [-0.62, 0.4, 0.36, -0.25],
    [0.62, -0.4, -0.36, 0.25],
    [-0.15, -0.44, 0.5, 0.25],
    [0.15, 0.44, -0.5, -0.25],
  ];
  for (const [fx, fz, tx, tz] of bars) {
    g.add(bar(v(fx * s, y0, fz), v(tx * s, y1, tz), t, t, blackLacquer, 0.003));
  }
  return g;
}

/**
 * ONTARIO: coffee table, oiled-oak top with a black lacquered inset panel,
 * black lacquered box with an open niche and an oak drawer front on each side,
 * black iron blade feet. L 120 × P 75 × H 45 cm.
 */
export function ontario(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const top = 0.025;
  const feet = 0.09; // the box floats ~9 cm above the floor in the photos
  const t = 0.018; // lacquered plywood
  g.add(slab(rect(w, d, 0.003), h, top, 0.003, ontarioOak));
  // dark grey lacquered inset in the middle of the top, slightly recessed
  g.add(board(0.45, 0.004, 0.22, slateLacquer, 0, h - 0.0015, 0, 0.001));
  const boxW = w - 0.06;
  const boxD = d - 0.056; // the top overhangs the drawer fronts and their pulls
  const boxH = h - top - feet;
  const y = feet + boxH / 2;
  const left = -boxW / 2;
  // bottom, end panel, middle divider (all black lacquer)
  g.add(board(boxW, t, boxD, blackLacquer, 0, feet + t / 2, 0, 0.002));
  g.add(board(t, boxH, boxD, blackLacquer, left + t / 2, y, 0, 0.002));
  // drawer and open niche about the same width
  const drawerW = 0.54;
  const divider = boxW / 2 - drawerW;
  g.add(board(t, boxH, boxD, blackLacquer, divider, y, 0, 0.002));
  g.add(board(t, boxH, boxD, blackLacquer, boxW / 2 - t / 2, y, 0, 0.002));
  // back of the drawer block, between its two drawers
  g.add(board(drawerW - t, boxH - t, 0.012, darkGap, divider + drawerW / 2, y + t / 2, 0, 0.001));
  // oak drawer fronts (one on each long side) with a slim black pull along
  // the top edge, a little right of centre
  for (const sz of [-1, 1]) {
    const z = sz * (boxD / 2 + 0.009);
    g.add(
      board(
        drawerW - 0.006,
        boxH - 0.006,
        0.018,
        ontarioOak,
        divider + drawerW / 2,
        y,
        z,
        0.002,
        "x",
      ),
    );
    g.add(
      board(
        0.15,
        0.008,
        0.012,
        blackLacquer,
        divider + drawerW / 2 + sz * 0.015,
        feet + boxH - 0.008,
        z + sz * 0.012,
        0.002,
      ),
    );
  }
  // blade feet across the width, set in from the ends
  for (const sx of [-1, 1]) {
    g.add(board(0.01, feet, d - 0.12, blackLacquer, sx * (w / 2 - 0.2), feet / 2, 0, 0.001));
  }
  return g;
}

/**
 * NORWAY: coffee table in solid oiled oak: thick square legs running up to
 * the top surface (their end grain shows in its corners), a framed top fitted
 * between them, a deep apron set back a little, square pegs at the joints.
 * L 120 × P 70 × H 45 cm.
 */
export function norwayCoffee(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const leg = 0.09;
  const top = 0.045;
  const y = h - top / 2;
  // top: frame boards between the legs around a centre panel
  for (const sz of [-1, 1])
    g.add(board(w - 2 * leg, top, leg, honeyOak, 0, y, sz * (d / 2 - leg / 2), 0.004, "x"));
  for (const sx of [-1, 1])
    g.add(board(leg, top, d - 2 * leg, honeyOak, sx * (w / 2 - leg / 2), y, 0, 0.004, "z"));
  g.add(
    board(
      w - 2 * leg - 0.004,
      top - 0.004,
      d - 2 * leg - 0.004,
      honeyOak,
      0,
      y - 0.002,
      0,
      0.003,
      "x",
    ),
  );
  // legs flush with the corners, full height
  const pegGeo = new THREE.BoxGeometry(0.012, 0.012, 0.004);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const lx = sx * (w / 2 - leg / 2);
      const lz = sz * (d / 2 - leg / 2);
      g.add(board(leg, h, leg, honeyOak, lx, h / 2, lz, 0.004, "y"));
      // one square peg on each outer face, through the top joint
      const front = new THREE.Mesh(pegGeo, darkScrew);
      front.position.set(lx, h - 0.04, sz * (d / 2 - 0.001));
      const side = new THREE.Mesh(pegGeo, darkScrew);
      side.rotation.y = Math.PI / 2;
      side.position.set(sx * (w / 2 - 0.001), h - 0.04, lz);
      g.add(front, side);
    }
  }
  // apron under the top, set back 1 cm from the leg faces
  const apron = 0.1;
  const back = 0.01;
  const at = 0.03;
  const ay = h - top - apron / 2;
  for (const sz of [-1, 1])
    g.add(board(w - 2 * leg, apron, at, honeyOak, 0, ay, sz * (d / 2 - back - at / 2), 0.003, "x"));
  for (const sx of [-1, 1])
    g.add(board(at, apron, d - 2 * leg, honeyOak, sx * (w / 2 - back - at / 2), ay, 0, 0.003, "z"));
  return g;
}

type P2 = [number, number];

/** Distance from point p to segment ab. Pure. */
function pointSegment(p: P2, a: P2, b: P2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

/** Distance between segments ab and cd (0 if they cross). Pure. */
export function segmentDistance(a: P2, b: P2, c: P2, d: P2): number {
  const cross = (o: P2, p: P2, q: P2) =>
    (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (d1 * d2 < 0 && d3 * d4 < 0) return 0;
  return Math.min(
    pointSegment(a, c, d),
    pointSegment(b, c, d),
    pointSegment(c, a, b),
    pointSegment(d, a, b),
  );
}

/**
 * Laser-cut branches: tapering slots along recursive trees, with small steel
 * bridges between consecutive slots and between branches (holes never touch,
 * the panel stays in one piece).
 */
function treeSlots(width: number, height: number, seed: number): THREE.Path[] {
  const rnd = seeded(seed);
  const slots: { a: P2; b: P2; w: number }[] = [];
  const bridge = 0.004;
  const inside = (p: P2, w: number) =>
    Math.abs(p[0]) < width / 2 - 0.012 - w && Math.abs(p[1]) < height / 2 - 0.012 - w;
  const clear = (a: P2, b: P2, w: number) =>
    slots.every((s) => segmentDistance(a, b, s.a, s.b) > (w + s.w) / 2 + bridge);
  const grow = (start: P2, angle: number, length: number, w: number, depth: number) => {
    const step = 0.04; // long thin strokes, as on the product
    let p = start;
    let a = angle;
    for (let travelled = 0; travelled < length && w > 0.0018; travelled += step) {
      a += (rnd() - 0.5) * 0.35;
      const next: P2 = [p[0] + Math.cos(a) * step, p[1] + Math.sin(a) * step];
      // the slot stops short of the next one: that gap is the bridge
      const cut = 1 - (bridge + w) / step;
      const end: P2 = [p[0] + (next[0] - p[0]) * cut, p[1] + (next[1] - p[1]) * cut];
      if (!inside(end, w)) break;
      if (clear(p, end, w)) slots.push({ a: p, b: end, w });
      p = next;
      w *= 0.95;
      if (depth > 0 && rnd() < 0.4) {
        const side = rnd() < 0.5 ? -1 : 1;
        grow(p, a + side * (0.45 + rnd() * 0.5), length * 0.5, w * 0.8, depth - 1);
      }
    }
  };
  const trunks = Math.max(2, Math.round(width / 0.2));
  for (let i = 0; i < trunks; i++) {
    const x = -width / 2 + (width * (i + 0.5)) / trunks + (rnd() - 0.5) * 0.04;
    grow([x, -height / 2 + 0.02], Math.PI / 2 + (rnd() - 0.5) * 0.5, height * 1.2, 0.009, 4);
  }
  return slots.map(({ a, b, w }) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ox = (-(b[1] - a[1]) / len) * (w / 2);
    const oy = ((b[0] - a[0]) / len) * (w / 2);
    const path = new THREE.Path();
    path.moveTo(a[0] + ox, a[1] + oy);
    path.lineTo(b[0] + ox, b[1] + oy);
    path.lineTo(b[0] - ox, b[1] - oy);
    path.lineTo(a[0] - ox, a[1] - oy);
    path.closePath();
    return path;
  });
}

/** Steel panel (thickness t) with the tree cut out, in the local xy plane. */
function treePanel(width: number, height: number, t: number, seed: number): THREE.Mesh {
  const shape = rect(width, height, 0.001);
  shape.holes.push(...treeSlots(width, height, seed));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: t,
    bevelEnabled: false,
    curveSegments: 2,
  });
  geo.translate(0, 0, -t / 2);
  return new THREE.Mesh(geo, blackLacquer);
}

/**
 * DUSTIN: black steel frame (square tube), a metal box at one end with a
 * laser-cut tree pattern, top and lower shelf in recycled boat-wood planks of
 * mixed colors. L 120 × P 70 × H 40 cm.
 */
export function dustin(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const t = 0.02;
  const X = w / 2 - t / 2;
  const Z = d / 2 - t / 2;
  // frame: four legs, top and bottom rectangles
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      g.add(bar(v(sx * X, 0, sz * Z), v(sx * X, h, sz * Z), t, t, blackLacquer, 0.001));
  for (const y of [t / 2, h - t / 2]) {
    for (const sz of [-1, 1])
      g.add(bar(v(-w / 2, y, sz * Z), v(w / 2, y, sz * Z), t, t, blackLacquer, 0.001));
    for (const sx of [-1, 1])
      g.add(bar(v(sx * X, y, -d / 2 + t), v(sx * X, y, d / 2 - t), t, t, blackLacquer, 0.001));
  }
  // shelf supports
  const shelfY = 0.1;
  for (const sz of [-1, 1])
    g.add(
      bar(
        v(-w / 2 + t, shelfY - 0.01, sz * Z),
        v(w / 2 - t, shelfY - 0.01, sz * Z),
        t,
        0.006,
        blackLacquer,
        0.001,
      ),
    );

  // laser-cut steel at the left end: a plate in the top and the end panel,
  // which stops at the lower shelf (the long sides stay open)
  const boxW = 0.33;
  const bx = -w / 2 + boxW / 2;
  const plate = treePanel(boxW - 0.002, d - 0.002, 0.006, 24);
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(bx, h - 0.003, 0);
  g.add(plate);
  const endBottom = shelfY - 0.013;
  const endH = h - t - endBottom;
  const end = treePanel(d - 2 * t, endH, 0.004, 21);
  end.rotation.y = Math.PI / 2;
  end.position.set(-w / 2 + 0.002, endBottom + endH / 2, 0);
  g.add(end);

  // boat-wood planks: top (right of the box) and the lower shelf
  const rnd = seeded(31);
  const planks = (x0: number, x1: number, y: number) => {
    const n = 6;
    const pd = (d - 2 * t) / n;
    for (let i = 0; i < n; i++) {
      // boat wood: planks from different hulls, light grey-brown to dark brown
      // (HSL keeps every channel ≤ 1, as glTF requires for color factors)
      const tint = new THREE.Color().setHSL(
        0.055 + (rnd() - 0.5) * 0.04,
        0.4 + rnd() * 0.3,
        0.62 + rnd() * 0.33,
      );
      const m = recycledElm.clone();
      m.color = tint;
      m.name = recycledElm.name; // same scan, tinted per plank
      g.add(
        board(
          x1 - x0 - 0.002,
          0.022,
          pd - 0.003,
          m,
          (x0 + x1) / 2,
          y,
          -d / 2 + t + pd * (i + 0.5),
          0.002,
          "x",
        ),
      );
    }
  };
  planks(-w / 2 + boxW + 0.002, w / 2 - t, h - 0.011);
  planks(-w / 2 + t, w / 2 - t, shelfY + 0.011);
  return g;
}

export const TABLE_BUILDERS: Record<string, (p: Product) => THREE.Group> = {
  "table-valmo-180": valmo,
  "table-valmo-220": valmo,
  "table-raia-220": raia,
  "table-willow-220": willow,
  "coffee-ontario": ontario,
  "coffee-norway": norwayCoffee,
  "coffee-dustin": dustin,
};
