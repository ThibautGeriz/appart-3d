import * as THREE from "three";
import type { Product } from "../../data/catalog";
import { board } from "./parts";
import { blackSteel, oiledOak } from "./materials";
import { WALL_BED_FEET, WALL_BED_FOLD } from "../../apartment/wallBed";

/**
 * Vertical wall beds (lits escamotables 140 × 200) and the Flexispot desk.
 *
 * Wall bed frame: origin at the centre of the cabinet footprint, back against
 * the wall at z = -d/2, front toward +z. The folding part is the node named
 * `fold` (kept by the GLB export, which does not merge rigged models): its
 * pivot is on the floor line inside the cabinet, and rotating it about x by
 * 90° folds the bed down into the room, mattress on top (poseWallBed in
 * src/apartment/wallBed.ts).
 * Closed, it stands upright, mattress against the wall, its underside panel
 * facing the room.
 */

/** Height of the pivot: the bed frame clears the floor by this much when open. */
const PIVOT_HEIGHT = 0.08;
/** Mattress 2.00 m + head and foot rails. */
const BED_LENGTH = 2.04;
const PANEL = 0.019; // melamine / decor panel thickness

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
const beechSlat = new THREE.MeshStandardMaterial({
  name: "beech slats",
  color: "#d9b88a",
  roughness: 0.8,
  metalness: 0,
});
const strap = new THREE.MeshStandardMaterial({
  name: "strap",
  color: "#2d2f33",
  roughness: 0.9,
  metalness: 0,
});

export interface WallBedGeometry {
  /** pivot distance from the wall (the cabinet back) */
  pivotFromWall: number;
  /** thickness of the folding part (frame + mattress) */
  thickness: number;
  pivotHeight: number;
  length: number;
}

/**
 * Where the folding part pivots so the open bed reaches `openDepth` from the
 * wall, and how thick it can be to fit in the cabinet when closed. Pure.
 */
export function wallBedGeometry(p: Product): WallBedGeometry {
  const spec = p.wallBed;
  if (!spec) throw new Error(`${p.id} is not a wall bed`);
  const pivotFromWall = spec.openDepth - BED_LENGTH;
  // frame (slats + rails) under the mattress, all inside the cabinet
  const thickness = Math.min(spec.mattressThickness + 0.1, pivotFromWall - PANEL - 0.01);
  return { pivotFromWall, thickness, pivotHeight: PIVOT_HEIGHT, length: BED_LENGTH };
}

export function wallBed(p: Product): THREE.Group {
  const spec = p.wallBed;
  if (!spec) throw new Error(`${p.id} is not a wall bed`);
  const { w, d, h } = p;
  const geo = wallBedGeometry(p);
  const finish = spec.finish === "oak" ? oiledOak : whiteMelamine;
  const g = new THREE.Group();

  // ── cabinet: two sides, top, back, plinth ─────────────────────────────
  for (const sx of [-1, 1]) {
    g.add(board(PANEL, h, d, finish, sx * (w / 2 - PANEL / 2), h / 2, 0, 0.002, "y"));
  }
  g.add(board(w, PANEL, d, finish, 0, h - PANEL / 2, 0, 0.002, "x"));
  g.add(board(w - 2 * PANEL, h - PANEL, 0.008, whiteMelamine, 0, (h - PANEL) / 2, -d / 2 + 0.004));
  // header above the bed, flush with the front
  const header = h - (geo.pivotHeight + geo.length) - PANEL;
  if (header > 0.02) {
    g.add(
      board(w - 2 * PANEL, header, PANEL, finish, 0, h - PANEL - header / 2, d / 2 - PANEL / 2),
    );
  }

  // ── folding part (local frame: pivot at origin, closed = upright) ──────
  // closed: local y = up along the bed, local z ≤ 0 toward the wall
  const fold = new THREE.Group();
  fold.name = WALL_BED_FOLD;
  fold.position.set(0, geo.pivotHeight, -d / 2 + geo.pivotFromWall);
  g.add(fold);
  const inner = w - 2 * PANEL - 0.01;
  const T = geo.thickness;
  const L = geo.length;
  const frame = T - spec.mattressThickness;
  // underside panel: the front of the closed bed, the bottom of the open one
  fold.add(board(inner, L, PANEL, finish, 0, L / 2, -PANEL / 2, 0.003, "y"));
  // side and end rails of the frame
  const rail = frame - PANEL;
  for (const sx of [-1, 1]) {
    fold.add(
      board(0.03, L, rail, finish, sx * (inner / 2 - 0.015), L / 2, -PANEL - rail / 2, 0.002, "y"),
    );
  }
  for (const y of [0.015, L - 0.015]) {
    fold.add(board(inner, 0.03, rail, finish, 0, y, -PANEL - rail / 2, 0.002, "x"));
  }
  // slats (seen when the mattress is lifted, and between the rails)
  for (let i = 0; i < 12; i++) {
    const y = 0.1 + (i * (L - 0.2)) / 11;
    fold.add(board(inner - 0.06, 0.06, 0.008, beechSlat, 0, y, -frame + 0.004, 0.002, "x"));
  }
  // mattress 140 × 200, rounded, with a grey side band
  const mT = spec.mattressThickness;
  const mattress = board(1.4, 2.0, mT, mattressFabric, 0, L / 2, -frame - mT / 2, 0.04, "y");
  fold.add(mattress);
  fold.add(board(1.405, 2.005, mT * 0.35, mattressBand, 0, L / 2, -frame - mT / 2, 0.03, "y"));
  // two elastic straps holding the bedding while the bed folds
  for (const y of [0.55, L - 0.55]) {
    fold.add(board(1.42, 0.05, 0.006, strap, 0, y, -frame - mT - 0.002, 0.002, "x"));
  }

  // ── feet at the foot end: flat against the underside when closed, they
  // swing out (rotate about x) to stand on the floor when open ───────────
  const feet = new THREE.Group();
  feet.name = WALL_BED_FEET;
  feet.position.set(0, L - 0.04, 0);
  fold.add(feet);
  const leg = geo.pivotHeight;
  for (const sx of [-1, 1]) {
    // folded: along -y, lying on the underside (z ≥ 0)
    feet.add(
      board(0.05, leg, 0.025, blackSteel, sx * (inner / 2 - 0.12), -leg / 2, 0.0125, 0.003, "y"),
    );
  }
  return g;
}

/** Flexispot standing desk: solid wood top on a black electric T-leg frame. */
export function flexispotDesk(p: Product): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const top = 0.025;
  g.add(board(w, top, d, oiledOak, 0, h - top / 2, 0, 0.004, "x"));
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
  // control panel under the front right edge
  g.add(board(0.12, 0.02, 0.05, blackSteel, w / 2 - 0.2, under - 0.01, d / 2 - 0.04, 0.004, "x"));
  return g;
}

export interface BookcaseLayout {
  /** column widths, left to right (sum = product width, panels included) */
  columns: number[];
  /** compartments per column, bottom to top */
  levels: number;
  /** panel thickness */
  panel: number;
  /** closed base under the first shelf */
  plinth: number;
  material: THREE.Material;
  /** back panel material (null = open back) */
  back: THREE.Material | null;
}

/**
 * Open bookcase: side panels and uprights between the columns, a top, a
 * plinth, evenly spaced shelves and a back panel. Origin at the footprint
 * centre, front toward +z.
 */
export function bookcase(p: Product, layout: BookcaseLayout): THREE.Group {
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
  if (layout.back) {
    g.add(
      board(w - 0.004, h - 0.004, backT, layout.back, 0, h / 2, -d / 2 + backT / 2, 0.001, "x"),
    );
  }
  return g;
}

/** Vente-unique "étagère multifonction 5 niveaux": three columns 70 + 40 + 40 cm, HDF back. */
const venteUniqueBookcase = (material: THREE.Material) => (p: Product) =>
  bookcase(p, {
    columns: [0.7, 0.4, 0.4],
    levels: 5,
    panel: 0.018,
    plinth: 0.08,
    material,
    back: whiteMelamine,
  });

/** Chambre 2 (study / guest room): the wall beds, the desk, the bookcases. */
export const STUDY_BUILDERS: Record<string, (p: Product) => THREE.Group> = {
  "bed-beganio": wallBed,
  "bed-consus": wallBed,
  "bed-altera-premium": wallBed,
  "desk-flexispot-solid-wood": flexispotDesk,
  "bookcase-vu-white": venteUniqueBookcase(whiteMelamine),
  "bookcase-vu-wotan": venteUniqueBookcase(oiledOak),
  // AM.PM Iloss: solid oak, 5 fixed shelves (the bay split is not given:
  // drawn as two bays of 75 cm)
  "bookcase-iloss": (p) =>
    bookcase(p, {
      columns: [0.75, 0.75],
      levels: 5,
      panel: 0.025,
      plinth: 0.06,
      material: oiledOak,
      back: null,
    }),
};
