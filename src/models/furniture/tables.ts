import * as THREE from "three";
import type { Product } from "../../data/catalog";
import { darkGap } from "../materials";
import { seeded } from "../shapes";
import {
  blackSteel,
  darkScrew,
  oiledOak,
  recycledElm,
  recycledTeak,
  suar,
  teak,
} from "./materials";
import { bar, board, liveEdge, slab, v } from "./parts";

/*
 * Tables at the seller's dimensions: length w along x, depth d along z,
 * height h. Origin: floor, centered.
 */

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
  g.add(slab(rect(w, d), h, top, 0.005, recycledTeak));
  const under = h - top;
  // frame rails under the top
  const inset = 0.06;
  for (const sz of [-1, 1]) {
    g.add(
      board(
        w - 2 * inset,
        0.045,
        0.015,
        blackSteel,
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
        blackSteel,
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
  const lx = w / 2 - 0.035;
  const lz = d / 2 - 0.03;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(
        board(
          flange,
          under,
          t,
          blackSteel,
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
          blackSteel,
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
      suar,
    ),
  );
  g.add(
    slab(
      new THREE.Shape(liveEdge(w, -d / 2, -seam / 2, 0.06, 5, { near: true, far: false })),
      h,
      top,
      0.008,
      suar,
    ),
  );
  const under = h - top;
  // bases: two 10 mm plates folded into a V, apex towards the middle
  const baseX = w / 2 - 0.42;
  for (const sx of [-1, 1]) {
    const apex = v(sx * (baseX - 0.12), 0, 0);
    for (const sz of [-1, 1]) {
      const end = v(sx * baseX, 0, sz * 0.36);
      const plate = bar(
        apex.clone().setY(under / 2),
        end.clone().setY(under / 2),
        under,
        0.01,
        blackSteel,
        0.002,
      );
      // bar() runs along its length: lay it horizontally, its height = under
      const len = apex.distanceTo(end);
      plate.geometry = new THREE.BoxGeometry(len, under, 0.01);
      plate.quaternion.setFromAxisAngle(v(0, 1, 0), -Math.atan2(end.z - apex.z, end.x - apex.x));
      g.add(plate);
    }
    // mounting plate under the slab
    g.add(board(0.1, 0.008, 0.8, blackSteel, sx * (baseX - 0.06), under - 0.004, 0, 0.002));
  }
  // suar beam through the bases, its ends sticking out a little
  const beamL = 2 * (baseX - 0.12) + 0.16;
  g.add(board(beamL, 0.1, 0.08, suar, 0, 0.3, 0, 0.01, "x"));
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
  g.add(slab(new THREE.Shape(liveEdge(w, -d / 2, d / 2, 0.045, 9)), h, top, 0.006, teak));
  const under = h - top;
  const s = (w - 0.8) / 1.4; // spread grows with the length
  const t = 0.05;
  // top frame under the slab
  for (const sz of [-1, 1])
    g.add(board(0.9 * s + 0.4, 0.03, t, blackSteel, 0, under - 0.015, sz * 0.25, 0.002));
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
    g.add(bar(v(fx * s, y0, fz), v(tx * s, y1, tz), t, t, blackSteel, 0.003));
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
  const feet = 0.05;
  const t = 0.018; // lacquered plywood
  g.add(slab(rect(w, d, 0.003), h, top, 0.003, oiledOak));
  // black inset in the top, slightly recessed
  g.add(board(0.36, 0.004, 0.2, blackSteel, -0.05, h - 0.0015, -0.02, 0.001));
  const boxW = w - 0.06;
  const boxD = d - 0.056; // the top overhangs the drawer fronts and their pulls
  const boxH = h - top - feet;
  const y = feet + boxH / 2;
  const left = -boxW / 2;
  // bottom, end panel, middle divider (all black lacquer)
  g.add(board(boxW, t, boxD, blackSteel, 0, feet + t / 2, 0, 0.002));
  g.add(board(t, boxH, boxD, blackSteel, left + t / 2, y, 0, 0.002));
  const drawerW = 0.48;
  const divider = boxW / 2 - drawerW;
  g.add(board(t, boxH, boxD, blackSteel, divider, y, 0, 0.002));
  g.add(board(t, boxH, boxD, blackSteel, boxW / 2 - t / 2, y, 0, 0.002));
  // back of the drawer block, between its two drawers
  g.add(board(drawerW - t, boxH - t, 0.012, darkGap, divider + drawerW / 2, y + t / 2, 0, 0.001));
  // oak drawer fronts (one on each long side) with a slim black pull
  for (const sz of [-1, 1]) {
    const z = sz * (boxD / 2 + 0.009);
    g.add(
      board(
        drawerW - 0.006,
        boxH - 0.006,
        0.018,
        oiledOak,
        divider + drawerW / 2,
        y,
        z,
        0.002,
        "x",
      ),
    );
    g.add(
      board(
        0.12,
        0.008,
        0.012,
        blackSteel,
        divider + drawerW / 2 + 0.1,
        feet + boxH - 0.02,
        z + sz * 0.012,
        0.002,
      ),
    );
  }
  // blade feet across the width, set in from the ends
  for (const sx of [-1, 1]) {
    g.add(board(0.01, feet, d - 0.12, blackSteel, sx * (w / 2 - 0.2), feet / 2, 0, 0.001));
  }
  return g;
}

/**
 * NORWAY: coffee table in solid oiled oak: thick square legs pegged into a
 * deep apron, framed top. L 120 × P 70 × H 45 cm.
 */
export function norwayCoffee(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const leg = 0.09;
  const top = 0.045;
  // top: frame around a centre panel (four boards + panel)
  const frame = 0.09;
  g.add(board(w, top, frame, oiledOak, 0, h - top / 2, d / 2 - frame / 2, 0.004, "x"));
  g.add(board(w, top, frame, oiledOak, 0, h - top / 2, -d / 2 + frame / 2, 0.004, "x"));
  g.add(board(frame, top, d - 2 * frame, oiledOak, w / 2 - frame / 2, h - top / 2, 0, 0.004, "z"));
  g.add(board(frame, top, d - 2 * frame, oiledOak, -w / 2 + frame / 2, h - top / 2, 0, 0.004, "z"));
  g.add(
    board(
      w - 2 * frame - 0.004,
      top - 0.004,
      d - 2 * frame - 0.004,
      oiledOak,
      0,
      h - top / 2 - 0.002,
      0,
      0.003,
      "x",
    ),
  );
  // legs flush with the corners, apron between them
  const apron = 0.1;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(
        board(
          leg,
          h - top,
          leg,
          oiledOak,
          sx * (w / 2 - leg / 2),
          (h - top) / 2,
          sz * (d / 2 - leg / 2),
          0.004,
          "y",
        ),
      );
      // two oak pegs through the joint
      for (const py of [0.025, 0.06]) {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 10), darkScrew);
        peg.rotation.x = Math.PI / 2;
        peg.position.set(sx * (w / 2 - leg / 2), h - top - py, sz * (d / 2 + 0.0005));
        g.add(peg);
      }
    }
  }
  for (const sz of [-1, 1]) {
    g.add(
      board(
        w - 2 * leg,
        apron,
        0.03,
        oiledOak,
        0,
        h - top - apron / 2,
        sz * (d / 2 - 0.025),
        0.003,
        "x",
      ),
    );
  }
  for (const sx of [-1, 1]) {
    g.add(
      board(
        0.03,
        apron,
        d - 2 * leg,
        oiledOak,
        sx * (w / 2 - 0.025),
        h - top - apron / 2,
        0,
        0.003,
        "z",
      ),
    );
  }
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
    const step = 0.03;
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
      w *= 0.93;
      if (depth > 0 && rnd() < 0.32) {
        const side = rnd() < 0.5 ? -1 : 1;
        grow(p, a + side * (0.45 + rnd() * 0.5), length * 0.5, w * 0.8, depth - 1);
      }
    }
  };
  const trunks = Math.max(2, Math.round(width / 0.2));
  for (let i = 0; i < trunks; i++) {
    const x = -width / 2 + (width * (i + 0.5)) / trunks + (rnd() - 0.5) * 0.04;
    grow([x, -height / 2 + 0.02], Math.PI / 2 + (rnd() - 0.5) * 0.5, height * 1.2, 0.015, 4);
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
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 2 });
  geo.translate(0, 0, -t / 2);
  return new THREE.Mesh(geo, blackSteel);
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
      g.add(bar(v(sx * X, 0, sz * Z), v(sx * X, h, sz * Z), t, t, blackSteel, 0.001));
  for (const y of [t / 2, h - t / 2]) {
    for (const sz of [-1, 1])
      g.add(bar(v(-w / 2, y, sz * Z), v(w / 2, y, sz * Z), t, t, blackSteel, 0.001));
    for (const sx of [-1, 1])
      g.add(bar(v(sx * X, y, -d / 2 + t), v(sx * X, y, d / 2 - t), t, t, blackSteel, 0.001));
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
        blackSteel,
        0.001,
      ),
    );

  // metal box at the left end: top plate and three tree panels
  const boxW = 0.4;
  const bx = -w / 2 + boxW / 2;
  g.add(board(boxW, 0.006, d, blackSteel, bx, h - 0.003, 0, 0.001));
  const end = treePanel(d - 2 * t, h - 2 * t, 0.004, 21);
  end.rotation.y = Math.PI / 2;
  end.position.set(-w / 2 + 0.002, h / 2, 0);
  g.add(end);
  for (const sz of [-1, 1]) {
    const side = treePanel(boxW - t, h - 2 * t, 0.004, sz > 0 ? 22 : 23);
    side.position.set(bx + t / 2, h / 2, sz * (d / 2 - 0.002));
    g.add(side);
  }
  g.add(board(0.004, h - 2 * t, d - 2 * t, blackSteel, -w / 2 + boxW, h / 2, 0, 0.001));

  // boat-wood planks: top (right of the box) and the lower shelf
  const rnd = seeded(31);
  const planks = (x0: number, x1: number, y: number) => {
    const n = 6;
    const pd = (d - 2 * t) / n;
    for (let i = 0; i < n; i++) {
      // boat wood: planks from different hulls, light grey-brown to dark brown
      // (HSL keeps every channel ≤ 1, as glTF requires for color factors)
      const tint = new THREE.Color().setHSL(
        0.07 + (rnd() - 0.5) * 0.04,
        0.3 + rnd() * 0.3,
        0.5 + rnd() * 0.35,
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
