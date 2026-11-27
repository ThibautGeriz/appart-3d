import * as THREE from "three";
import { fillShelf } from "./decor";
import type { Product } from "../../data/catalog";
import { bar, board, grainUVs, slab, v } from "./parts";
import { blackSteel, lightElm, oiledOak } from "./materials";
import { WALL_BED_FEET, WALL_BED_FOLD } from "../../apartment/wallBed";

/**
 * Vertical wall beds (lits escamotables 140 × 200), the Flexispot desk, the
 * Aeron chair and the bookcases of chambre 2.
 *
 * Wall bed frame: origin at the centre of the cabinet footprint, back against
 * the wall at z = -d/2, front toward +z. The folding part is the node named
 * `fold` (kept by the GLB export, which does not merge rigged models). Closed,
 * it stands upright, mattress against the wall, its underside — the paneled
 * front, with the handles — flush with the cabinet front. Rotating `fold`
 * about x by 90° (poseWallBed in src/apartment/wallBed.ts) lays it down into
 * the room, mattress on top, the head end inside the cabinet: its pivot is
 * not on the frame but where that quarter turn maps the closed bed onto the
 * open one (see wallBedGeometry).
 */

/** The underside of the open bed clears the floor by this much (38 cm sleeping height). */
const UNDERSIDE_HEIGHT = 0.08;
/** Mattress 2.00 m + head and foot rails. */
const BED_LENGTH = 2.04;
const PANEL = 0.019; // melamine / decor panel thickness
/** Closed, the frame starts this high (just above the plinth). */
const CLOSED_BOTTOM = 0.08;
/** Plinth under the closed bed, set back 1 cm. */
const PLINTH = 0.045;
/** Handles stand out of the front by this much (kept inside the cabinet depth). */
const HANDLE_OUT = 0.028;

export const whiteMelamine = new THREE.MeshStandardMaterial({
  name: "white melamine",
  color: "#f1f0ec",
  roughness: 0.55,
  metalness: 0,
});
const mattressFabric = new THREE.MeshStandardMaterial({
  name: "mattress fabric",
  color: "#e9e6df",
  roughness: 1,
  metalness: 0,
});
const mattressBand = new THREE.MeshStandardMaterial({
  name: "mattress band",
  color: "#8c8f94",
  roughness: 0.9,
  metalness: 0,
});
const strap = new THREE.MeshStandardMaterial({
  name: "strap",
  color: "#2d2f33",
  roughness: 0.9,
  metalness: 0,
});
const whiteStrap = new THREE.MeshStandardMaterial({
  name: "white strap",
  color: "#e4e4e2",
  roughness: 0.9,
  metalness: 0,
});
/** Beganio feet: white lacquered steel tube. */
const whiteSteel = new THREE.MeshStandardMaterial({
  name: "white steel",
  color: "#ecedec",
  roughness: 0.35,
  metalness: 0.3,
});
/** Altera feet and spring console: graphite powder-coated steel. */
const graphiteSteel = new THREE.MeshStandardMaterial({
  name: "graphite steel",
  color: "#3a3c3f",
  roughness: 0.45,
  metalness: 0.5,
});
/** Bar handles: brushed aluminium. */
const aluminium = new THREE.MeshStandardMaterial({
  name: "aluminium",
  color: "#d4d6d9",
  roughness: 0.38,
  metalness: 0.6, // no environment map in the app: full metal would read black
});
/**
 * Light oak decors, brighter than the shared oiled oak (whose tint darkens
 * the scan): the same photo scans, by material name, tinted toward each
 * product photo. Even untinted the scans stay a little darker than these
 * golden oaks under the viewer's studio light.
 */
const tinted = (base: THREE.MeshStandardMaterial, color: string, roughness: number) => {
  const m = base.clone();
  m.color.set(color);
  m.roughness = roughness;
  return m;
};
/** Lenart "chêne artisan" laminate: golden oak (oak scan). */
const artisanOak = tinted(oiledOak, "#fff6e8", 0.8);
/** Vente-unique "chêne Wotan" laminate, "naturel clair": greyish light oak (ash scan). */
const wotanOak = tinted(lightElm, "#fffaf0", 0.75);
/** AM.PM Iloss: solid oak, clear polyurethane varnish (oak scan). */
const naturalOak = tinted(oiledOak, "#fffaf2", 0.6);

/** Per-model look of a wall bed, from the product photos. */
interface WallBedStyle {
  /** front panels, bottom to top, as fractions of the bed length (grooves between) */
  panels: number[];
  /** bar handles, at this fraction of the length from the bottom (closed) */
  handles?: number;
  /** foot that unfolds under the foot end */
  feet: "tube" | "panel";
  feetMaterial: THREE.Material;
  straps: { count: number; material: THREE.Material };
  /** shelves on the cabinet back, heights from the floor (seen with the bed open) */
  shelves?: number[];
}

const WALL_BED_STYLES: Record<string, WallBedStyle> = {
  // four grooved panels, the top one larger with two small bar handles;
  // white tubular U foot; white elastic straps
  "bed-beganio": {
    panels: [0.23, 0.245, 0.245, 0.28],
    handles: 0.74,
    feet: "tube",
    feetMaterial: whiteSteel,
    straps: { count: 2, material: whiteStrap },
  },
  // push to open (no handles), four panels of unequal height; full-width
  // wooden panel foot set back from the foot end
  "bed-consus": {
    panels: [0.39, 0.18, 0.18, 0.25],
    feet: "panel",
    feetMaterial: artisanOak,
    straps: { count: 2, material: strap },
  },
  // four panels, two aluminium bar handles near the top; graphite U foot;
  // three black straps; three shelves inside ("triples étagères intégrées")
  "bed-altera-premium": {
    panels: [0.245, 0.245, 0.245, 0.265],
    handles: 0.76,
    feet: "tube",
    feetMaterial: graphiteSteel,
    straps: { count: 3, material: strap },
    shelves: [0.82, 1.26, 1.69],
  },
};

export interface WallBedGeometry {
  /** pivot of the fold, distance from the wall */
  pivotFromWall: number;
  /** pivot of the fold, height from the floor */
  pivotHeight: number;
  /** closed: the front (underside of the bed), distance from the wall */
  frontFromWall: number;
  /** closed: the bottom of the frame */
  closedBottom: number;
  /** open: the underside of the frame */
  undersideHeight: number;
  /** thickness of the folding part (frame + mattress) */
  thickness: number;
  length: number;
}

/**
 * Where the folding part pivots so that, after a quarter turn, the closed bed
 * (front flush with the cabinet, bottom at CLOSED_BOTTOM) lies open with its
 * underside at UNDERSIDE_HEIGHT and its foot at `openDepth` from the wall.
 * A quarter turn about (zp, yp) maps a closed point (z, y) to
 * (zp + y - yp, yp - z + zp). Pure.
 */
export function wallBedGeometry(p: Product): WallBedGeometry {
  const spec = p.wallBed;
  if (!spec) throw new Error(`${p.id} is not a wall bed`);
  const handles = WALL_BED_STYLES[p.id]?.handles !== undefined;
  const frontFromWall = p.d - (handles ? HANDLE_OUT + 0.004 : 0.004);
  const headFromWall = spec.openDepth - BED_LENGTH;
  const pivotFromWall = (headFromWall + UNDERSIDE_HEIGHT + frontFromWall - CLOSED_BOTTOM) / 2;
  const pivotHeight = UNDERSIDE_HEIGHT + frontFromWall - pivotFromWall;
  // frame (rails) under the mattress, all inside the cabinet when closed
  const thickness = Math.min(spec.mattressThickness + 0.1, frontFromWall - 0.008 - 0.01);
  return {
    pivotFromWall,
    pivotHeight,
    frontFromWall,
    closedBottom: CLOSED_BOTTOM,
    undersideHeight: UNDERSIDE_HEIGHT,
    thickness,
    length: BED_LENGTH,
  };
}

/** Bar handle (bar on two posts) standing out of the front, in the bed's local frame. */
function handle(g: THREE.Object3D, x: number, y: number): void {
  g.add(board(0.16, 0.012, 0.01, aluminium, x, y, HANDLE_OUT - 0.005, 0.004, "x"));
  for (const sx of [-1, 1]) {
    g.add(board(0.01, 0.01, HANDLE_OUT, aluminium, x + sx * 0.07, y, HANDLE_OUT / 2, 0.003, "z"));
  }
}

const tubeGeometry = new THREE.CylinderGeometry(1, 1, 1, 10);
/** Round tube of radius r between two points. */
function rod(from: THREE.Vector3, to: THREE.Vector3, r: number, material: THREE.Material) {
  const m = new THREE.Mesh(tubeGeometry, material);
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.scale.set(r, from.distanceTo(to), r);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return m;
}

export function wallBed(p: Product): THREE.Group {
  const spec = p.wallBed;
  const style = WALL_BED_STYLES[p.id];
  if (!spec || !style) throw new Error(`${p.id} is not a wall bed`);
  const { w, d, h } = p;
  const geo = wallBedGeometry(p);
  const finish = spec.finish === "oak" ? artisanOak : whiteMelamine;
  const g = new THREE.Group();
  const back = -d / 2; // the wall

  // ── cabinet: two sides, top, back, plinth, header above the bed ────────
  for (const sx of [-1, 1]) {
    g.add(board(PANEL, h, d, finish, sx * (w / 2 - PANEL / 2), h / 2, 0, 0.002, "y"));
  }
  g.add(board(w, PANEL, d, finish, 0, h - PANEL / 2, 0, 0.002, "x"));
  g.add(board(w - 2 * PANEL, h - PANEL, 0.008, finish, 0, (h - PANEL) / 2, back + 0.004, 0.001));
  const inner = w - 2 * PANEL - 0.006;
  g.add(board(inner, PLINTH, PANEL, finish, 0, PLINTH / 2, d / 2 - 0.01 - PANEL / 2, 0.002, "x"));
  const top = geo.closedBottom + geo.length;
  const header = h - PANEL - top;
  if (header > 0.02) {
    const z = back + geo.frontFromWall - PANEL / 2;
    g.add(board(inner, header - 0.003, PANEL, finish, 0, h - PANEL - header / 2 - 0.0015, z));
  }
  for (const y of style.shelves ?? []) {
    g.add(board(inner, PANEL, 0.065, finish, 0, y, back + 0.008 + 0.0325, 0.002, "x"));
  }

  // ── folding part ──────────────────────────────────────────────────────
  const fold = new THREE.Group();
  fold.name = WALL_BED_FOLD;
  fold.position.set(0, geo.pivotHeight, back + geo.pivotFromWall);
  g.add(fold);
  // bed frame, closed = upright: y up along the bed from its head end,
  // z = 0 on the front face, mattress toward the wall (z < 0)
  const bed = new THREE.Group();
  bed.position.set(0, geo.closedBottom - geo.pivotHeight, geo.frontFromWall - geo.pivotFromWall);
  fold.add(bed);
  const T = geo.thickness;
  const L = geo.length;
  const mT = spec.mattressThickness;
  const frame = T - mT;
  // underside = paneled front, grooves between the panels
  const groove = 0.003;
  let y0 = 0;
  for (const f of style.panels) {
    const len = f * L;
    bed.add(board(inner, len - groove, PANEL, finish, 0, y0 + len / 2, -PANEL / 2, 0.002, "x"));
    y0 += len;
  }
  if (style.handles !== undefined) {
    for (const sx of [-1, 1]) handle(bed, sx * 0.3, style.handles * L);
  }
  // frame around the mattress: side and end rails rising 5 cm above its base
  const lip = 0.05;
  const rail = frame - PANEL + lip;
  const railZ = -PANEL - rail / 2;
  for (const sx of [-1, 1]) {
    bed.add(board(0.025, L, rail, finish, sx * 0.7175, L / 2, railZ, 0.002, "y"));
  }
  for (const y of [0.01, L - 0.01]) {
    bed.add(board(1.41, 0.02, rail, finish, 0, y, railZ, 0.002, "x"));
  }
  // mattress 140 × 200 on the slats (hidden), rounded, with a side band
  const mattressZ = -frame - mT / 2;
  bed.add(board(1.4, 2.0, mT, mattressFabric, 0, L / 2, mattressZ, 0.04, "y"));
  bed.add(board(1.405, 2.005, mT * 0.35, mattressBand, 0, L / 2, mattressZ, 0.03, "y"));
  // elastic straps holding the bedding while the bed folds
  const { count, material } = style.straps;
  for (let i = 0; i < count; i++) {
    const y = 0.55 + (i * (L - 1.1)) / Math.max(1, count - 1);
    bed.add(board(1.42, 0.05, 0.006, material, 0, y, -frame - mT - 0.002, 0.002, "x"));
  }

  // ── foot at the foot end: folded inside the frame when closed, it swings
  // out (rotates about x) to stand on the floor when open ───────────────
  const feet = new THREE.Group();
  feet.name = WALL_BED_FEET;
  const leg = geo.undersideHeight;
  const folded = -PANEL - 0.02; // inside the frame, behind the front
  if (style.feet === "tube") {
    // U tube: two legs joined by a bar on the floor (folded: along -y)
    feet.position.set(0, L - 0.05, 0);
    const r = 0.012;
    const x = 0.64;
    for (const sx of [-1, 1]) {
      feet.add(rod(v(sx * x, 0.02, folded), v(sx * x, -leg + r, folded), r, style.feetMaterial));
    }
    feet.add(rod(v(-x - r, -leg + r, folded), v(x + r, -leg + r, folded), r, style.feetMaterial));
  } else {
    // wooden panel across the width, 25 cm from the foot end
    feet.position.set(0, L - 0.25, 0);
    feet.add(board(1.1, leg, PANEL, style.feetMaterial, 0, -leg / 2, folded, 0.002, "x"));
  }
  bed.add(feet);
  return g;
}

/** Rounded rectangle in plan (x, z), corner radius r. */
function roundedRect(w: number, d: number, r: number): THREE.Shape {
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
 * Flexispot E7 Pro standing desk: solid wood top (25–27 mm, rounded
 * corners) on a black electric frame, two stage columns on long feet, the
 * keypad (display + buttons) under the front right edge.
 */
export function flexispotDesk(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const top = 0.026;
  g.add(slab(roundedRect(w, d, 0.04), h, top, 0.004, oiledOak, "x"));
  const under = h - top;
  // frame: crossbar and two side rails under the top
  g.add(board(w - 0.3, 0.04, 0.08, blackSteel, 0, under - 0.02, -0.04, 0.004, "x"));
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.12);
    g.add(board(0.06, 0.03, d - 0.1, blackSteel, x, under - 0.015, 0, 0.004, "z"));
    // telescopic column: wide lower stage, slimmer upper stage
    g.add(board(0.08, 0.5, 0.06, blackSteel, x, 0.03 + 0.25, -0.02, 0.005, "y"));
    g.add(
      board(0.07, under - 0.53, 0.05, blackSteel, x, 0.53 + (under - 0.53) / 2, -0.02, 0.005, "y"),
    );
    // foot along the depth, with levelling pads
    g.add(board(0.07, 0.03, d - 0.04, blackSteel, x, 0.015, 0, 0.006, "z"));
  }
  // keypad under the front right edge, its face tilted toward the user
  const pad = board(0.15, 0.022, 0.05, blackSteel, w / 2 - 0.22, under - 0.014, d / 2 - 0.035);
  pad.rotation.x = 0.35;
  g.add(pad);
  return g;
}

/** Aeron graphite: dark frame, base and armrests. */
const graphite = new THREE.MeshStandardMaterial({
  name: "graphite",
  color: "#2a2c2f",
  metalness: 0.35,
  roughness: 0.5,
});
/** 8Z Pellicle mesh (seat and back), dark and matte. */
const pellicle = new THREE.MeshStandardMaterial({
  name: "pellicle mesh",
  color: "#34363a",
  metalness: 0,
  roughness: 1,
});
const caster = new THREE.MeshStandardMaterial({
  name: "caster",
  color: "#111214",
  metalness: 0.1,
  roughness: 0.6,
});

/**
 * Herman Miller Aeron (size B): five-star base on casters, gas cylinder, a
 * mesh seat (51 × 46 cm) and a mesh back that widens toward its rounded top
 * on a graphite frame, the PostureFit pad and its Y straps behind the mesh,
 * height-adjustable arms. Origin at the floor under the cylinder, front
 * toward +z.
 */
export function aeron(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, h } = p; // the depth comes from the base and the leaning back
  const seatY = p.seatHeight ?? 0.45;
  const baseR = 0.35; // base diameter 699 mm (size B)
  // five-star base: spokes slightly sloping down to the casters
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    const end = v(Math.cos(a) * (baseR - 0.03), 0.075, Math.sin(a) * (baseR - 0.03));
    g.add(bar(v(0, 0.1, 0), end, 0.045, 0.03, graphite, 0.008));
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 20), caster);
    wheel.rotation.z = Math.PI / 2;
    wheel.rotation.y = -a;
    wheel.position.set(Math.cos(a) * (baseR - 0.03), 0.03, Math.sin(a) * (baseR - 0.03));
    g.add(wheel);
  }
  g.add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 16), graphite).translateY(0.1),
  );
  // gas cylinder up to the seat mechanism
  g.add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, seatY - 0.14, 16), graphite).translateY(
      0.12 + (seatY - 0.14) / 2,
    ),
  );
  g.add(board(0.2, 0.05, 0.2, graphite, 0, seatY - 0.06, 0, 0.01, "x"));
  // seat: mesh in a rounded frame, front edge rolled down (waterfall)
  g.add(slab(roundedRect(0.51, 0.46, 0.08), seatY + 0.018, 0.035, 0.01, graphite));
  g.add(slab(roundedRect(0.48, 0.43, 0.07), seatY + 0.026, 0.012, 0.003, pellicle));
  g.add(board(0.47, 0.04, 0.03, graphite, 0, seatY - 0.01, 0.22, 0.012, "x"));
  // back: frame loop around the mesh, leaning back, narrow at the lumbar,
  // wide at the shoulders, rounded top
  const backBottom = seatY + 0.08;
  const lean = 0.155; // how far the top sits behind the bottom (sets the overall depth)
  const backZ = -0.2;
  const top = h - 0.016;
  const span = top - backBottom;
  const at = (y: number) => backZ - (lean * (y - backBottom)) / span; // the back's plane
  const onBack = (x: number, y: number) => v(x, y, at(y));
  // frame loop: narrow at the lumbar, widest at the shoulders, arched top
  const outline: [number, number][] = [
    [0.17, 0],
    [0.205, 0.15],
    [0.235, span - 0.14],
    [0.215, span - 0.04],
    [0.12, span - 0.006],
  ];
  const loop = [
    ...outline.map(([x, y]) => onBack(-x, backBottom + y)),
    onBack(0, top),
    ...outline.reverse().map(([x, y]) => onBack(x, backBottom + y)),
  ];
  // closed frame tube, lighter than the shared tube() helper (mobile budget)
  const curve = new THREE.CatmullRomCurve3(loop, true, "centripetal");
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.016, 8, true), graphite));
  // mesh inside the loop, in the back's plane
  const mesh = new THREE.Shape();
  mesh.moveTo(-0.16, 0);
  mesh.lineTo(0.16, 0);
  mesh.lineTo(0.195, 0.15);
  mesh.lineTo(0.224, span - 0.14);
  mesh.quadraticCurveTo(0.215, span - 0.012, 0, span - 0.012);
  mesh.quadraticCurveTo(-0.215, span - 0.012, -0.224, span - 0.14);
  mesh.lineTo(-0.195, 0.15);
  mesh.closePath();
  const back = new THREE.Mesh(new THREE.ShapeGeometry(mesh, 6), pellicle);
  back.material.side = THREE.DoubleSide;
  back.position.set(0, backBottom, backZ);
  back.rotation.x = -Math.atan2(lean, span);
  back.scale.y = Math.hypot(lean, span) / span;
  g.add(back);
  // spine from the seat mechanism to the back
  g.add(
    bar(
      v(0, seatY - 0.04, -0.06),
      v(0, backBottom + 0.05, backZ + 0.01),
      0.07,
      0.03,
      graphite,
      0.01,
    ),
  );
  // PostureFit (seen from behind): lumbar pad and Y straps up to the shoulders
  const behind = (y: number, t: number) => v(0, y, at(y) - 0.006 - t / 2);
  const padTop = backBottom + 0.22;
  g.add(bar(behind(backBottom + 0.02, 0.02), behind(padTop, 0.02), 0.07, 0.02, graphite, 0.008));
  for (const sx of [-1, 1]) {
    const end = behind(top - 0.17, 0.01).setX(sx * 0.2);
    // bar(): its "w" side stays horizontal, here across the back (z)
    g.add(bar(behind(padTop - 0.03, 0.01), end, 0.01, 0.03, graphite, 0.004));
  }
  // arms: posts from under the seat to the pads, at the chair's full width
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.05);
    g.add(
      bar(v(sx * 0.2, seatY - 0.03, -0.08), v(x, seatY - 0.03, -0.1), 0.04, 0.025, graphite, 0.008),
    );
    g.add(bar(v(x, seatY - 0.03, -0.1), v(x, seatY + 0.22, -0.06), 0.04, 0.03, graphite, 0.008));
    g.add(board(0.09, 0.03, 0.24, caster, x, seatY + 0.235, -0.02, 0.014, "z"));
  }
  return g;
}

export interface BookcaseLayout {
  /** column widths, left to right (sum = product width, panels included) */
  columns: number[];
  /** each column is a separate unit with its own sides, top and plinth */
  modules?: boolean;
  /** compartments per column, bottom to top */
  levels: number;
  /** panel thickness */
  panel: number;
  /** closed base under the first shelf */
  plinth: number;
  material: THREE.Material;
  /** back panel material (null = open back) */
  back: THREE.Material | null;
  /** first seed of the books (decor), so side-by-side units differ */
  seed?: number;
}

/**
 * Open bookcase: side panels and uprights between the columns, a top, a
 * plinth, evenly spaced shelves and a back panel. Origin at the footprint
 * centre, front toward +z.
 */
export function bookcase(p: Product, layout: BookcaseLayout): THREE.Group {
  if (layout.modules) {
    // side-by-side units: each one a single-column bookcase
    const g = new THREE.Group();
    let x = -p.w / 2;
    for (const [n, c] of layout.columns.entries()) {
      const seed = (layout.seed ?? 600) + n * 100;
      const unit = bookcase({ ...p, w: c }, { ...layout, columns: [c], modules: false, seed });
      unit.position.x = x + c / 2;
      g.add(unit);
      x += c;
    }
    return g;
  }
  const g = new THREE.Group();
  const { w, d, h } = p;
  const { panel: t, plinth, material, levels } = layout;
  const backT = layout.back ? 0.004 : 0;
  // outer sides and the uprights between columns
  let x = -w / 2;
  const edges = [x];
  for (const c of layout.columns) edges.push((x += c));
  for (const ex of edges) {
    const cx = Math.min(w / 2 - t / 2, Math.max(-w / 2 + t / 2, ex));
    g.add(board(t, h, d - backT, material, cx, h / 2, backT / 2, 0.002, "y"));
  }
  // top, plinth (front kick board + bottom shelf), shelves
  const inner = w - 2 * t;
  g.add(board(inner, t, d - backT, material, 0, h - t / 2, backT / 2, 0.002, "x"));
  g.add(board(inner, plinth, t, material, 0, plinth / 2, d / 2 - t / 2 - 0.01, 0.002, "x"));
  const y0 = plinth;
  const y1 = h - t;
  const step = (y1 - y0) / levels;
  for (let i = 0; i < levels; i++) {
    const y = y0 + i * step + t / 2;
    g.add(board(inner, t, d - backT - 0.005, material, 0, y, backT / 2, 0.002, "x"));
  }
  // books in each compartment (decor)
  for (let i = 0; i < levels; i++) {
    const y = y0 + i * step + t;
    for (let k = 0; k + 1 < edges.length; k++) {
      fillShelf(
        g,
        // outer sides are a full panel thick, uprights are centred on the edge
        edges[k] + (k === 0 ? t : t / 2),
        edges[k + 1] - (k + 2 === edges.length ? t : t / 2),
        y,
        -d / 2 + backT,
        d - backT,
        step - t,
        (layout.seed ?? 600) + i * 11 + k,
      );
    }
  }
  if (layout.back) {
    g.add(
      board(w - 0.004, h - 0.004, backT, layout.back, 0, h / 2, -d / 2 + backT / 2, 0.001, "x"),
    );
  }
  return g;
}

/**
 * Vente-unique "étagère multifonction 5 niveaux": three units side by side,
 * 40 + 70 + 40 cm (the wide one in the middle), 5 levels of 33 cm, white HDF back.
 */
const venteUniqueBookcase = (material: THREE.Material) => (p: Product) =>
  bookcase(p, {
    columns: [0.4, 0.7, 0.4],
    modules: true,
    levels: 5,
    panel: 0.018,
    plinth: 0.07,
    material,
    back: whiteMelamine,
  });

/** Iloss shelf heights (top faces), from the product photo. */
const ILOSS_SHELVES = [0.29, 0.72, 0.99, 1.44, 1.83];

/**
 * AM.PM Iloss: five solid oak shelves running through two "airplane wing"
 * uprights (deep and rounded at the floor, tapering to a rounded top),
 * the shelves overhanging them on both sides, no back. Wall-fixed: the
 * uprights' back edge is straight against the wall.
 */
export function iloss(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const back = -d / 2;
  const thick = 0.035;
  // upright profile in (z from the wall, y), extruded along x
  const s = new THREE.Shape();
  const topDepth = 0.2;
  s.moveTo(0, 0);
  s.lineTo(d - 0.03, 0);
  s.quadraticCurveTo(d, 0, d, 0.04);
  s.lineTo(topDepth, h - 0.12);
  s.quadraticCurveTo(topDepth - 0.02, h, topDepth / 2, h);
  s.lineTo(0.02, h);
  s.quadraticCurveTo(0, h, 0, h - 0.02);
  s.closePath();
  const bevel = 0.012;
  const profile = new THREE.ExtrudeGeometry(s, {
    depth: thick - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 2,
    curveSegments: 8,
  });
  profile.rotateY(-Math.PI / 2); // shape x (from the wall) → +z, extrusion → -x
  profile.translate(thick / 2 - bevel, 0, back);
  profile.computeVertexNormals();
  grainUVs(profile, naturalOak, "y");
  for (const sx of [-1, 1]) {
    const upright = new THREE.Mesh(profile, naturalOak);
    upright.position.x = sx * 0.41;
    g.add(upright);
  }
  // shelves: full width, 28 cm deep against the wall, thin chamfered edges
  const shelfD = 0.28;
  for (const y of ILOSS_SHELVES) {
    g.add(board(w, 0.024, shelfD, naturalOak, 0, y - 0.012, back + shelfD / 2, 0.006, "x"));
  }
  // books (decor): between and beside the uprights, up to the shelf above
  const gap = thick / 2 + 0.01;
  const spans: [number, number][] = [
    [-w / 2 + 0.01, -0.41 - gap],
    [-0.41 + gap, 0.41 - gap],
    [0.41 + gap, w / 2 - 0.01],
  ];
  ILOSS_SHELVES.slice(0, -1).forEach((y, i) => {
    const room = ILOSS_SHELVES[i + 1] - 0.024 - y - 0.02; // none on the top shelf
    spans.forEach(([a, b], k) =>
      fillShelf(g, a, b, y, back + 0.01, shelfD - 0.03, room, 700 + i * 11 + k),
    );
  });
  return g;
}

/** Chambre 2 (study / guest room): the wall beds, the desk, the bookcases. */
export const STUDY_BUILDERS: Record<string, (p: Product) => THREE.Group> = {
  "bed-beganio": wallBed,
  "bed-consus": wallBed,
  "bed-altera-premium": wallBed,
  "desk-flexispot-solid-wood": flexispotDesk,
  "office-aeron": aeron,
  "bookcase-vu-white": venteUniqueBookcase(whiteMelamine),
  "bookcase-vu-wotan": venteUniqueBookcase(wotanOak),
  "bookcase-iloss": iloss,
};
