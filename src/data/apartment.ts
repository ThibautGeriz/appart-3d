/**
 * Apartment layout — pure data, no rendering code.
 * All dimensions in meters. Traced from the architect's plan (~106.7 px/m),
 * séjour dimensions measured on site (A, B, C, D, 1, 2, 3).
 *
 * Axes: x → east (plan right), z → south (plan down), y up.
 * Origin: inner north-west corner of the séjour.
 * Rectangles are [minX, minZ, maxX, maxZ].
 */

export type Rect = [minX: number, minZ: number, maxX: number, maxZ: number];

export interface OpeningDef {
  /** distance from the wall start (`from`) to the opening, along the wall */
  at: number;
  width: number;
  /** bottom of the opening (0 = door) */
  sill: number;
  /** top of the opening */
  head: number;
  /** closed glazing (blocks the player) */
  glass?: boolean;
  /** closed door leaf filling the opening (blocks the player), as a color */
  leaf?: string;
}

/** Axis-aligned wall segment, centered on the from→to line. */
export interface WallDef {
  from: [x: number, z: number];
  to: [x: number, z: number];
  thickness: number;
  openings?: OpeningDef[];
}

/** Procedural surface texture (see src/apartment/textures.ts), tinted by the color. */
export type Finish =
  | "plaster"
  | "parquet"
  | "tile30"
  | "tile60"
  | "oak"
  | "cabinet"
  | "cabinetTall"
  | "stone"
  | "grass"
  | "facade";

export interface AreaDef {
  /** room name; unlabeled areas still get floor/ceiling */
  label?: string;
  rect: Rect;
  floorColor: string;
  floorFinish?: Finish;
  /** lowered ceiling height (HSFP), defaults to the wall height */
  ceiling?: number;
  /** no ceiling (balcony) */
  outdoor?: boolean;
}

export interface FurnitureDef {
  name: string;
  rect: Rect;
  /** height */
  h: number;
  color: string;
  /** texture, aligned on the item's own corner (cabinet doors line up) */
  finish?: Finish;
  /** elevation of the bottom face (default 0) */
  y?: number;
  /** blocks the player (default true) */
  solid?: boolean;
}

export interface SiteDef {
  latitude: number;
  longitude: number;
  /** where north points, in degrees clockwise from plan "up" (compass on the plan) */
  northAngleDeg: number;
  /** height of the apartment floor above the street */
  floorElevation: number;
}

export interface ApartmentDef {
  site: SiteDef;
  wallHeight: number;
  wallColor: string;
  wallFinish: Finish;
  ceilingColor: string;
  ceilingFinish: Finish;
  glassColor: string;
  frameColor: string;
  walls: WallDef[];
  areas: AreaDef[];
  furniture: FurnitureDef[];
  spawn: { x: number; z: number; yaw: number };
}

const WOOD = "#b98a5e";
const TILE = "#d9d6cf";
const OUTDOOR = "#9a9fa5";
const GAINE = "#a7a39b";
const KITCHEN_GREEN = "#6f8578";

const OUTER = 0.25;
const INNER = 0.1;

const door = (at: number, width = 0.8): OpeningDef => ({ at, width, sill: 0, head: 2.04 });
// All windows are tall: 20 cm from the floor
const window = (at: number, width: number): OpeningDef => ({
  at,
  width,
  sill: 0.2,
  head: 2.15,
  glass: true,
});
const frenchWindow = (at: number, width: number, glass = true): OpeningDef => ({
  at,
  width,
  sill: 0,
  head: 2.15,
  glass,
});

export const APARTMENT_DEF: ApartmentDef = {
  // Annecy, 4th floor (4 levels × ~3 m above the street)
  site: { latitude: 45.9, longitude: 6.13, northAngleDeg: 25, floorElevation: 12 },
  wallHeight: 2.5,
  wallColor: "#e8e4dc",
  wallFinish: "plaster",
  ceilingColor: "#f5f5f0",
  ceilingFinish: "plaster",
  glassColor: "#e6f4fb",
  frameColor: "#1c1c1c",

  walls: [
    // ── Séjour (measured) ──────────────────────────────────────────────
    // North façade: 0.70 | window 1.46 | A 2.04 | window B 1.46 | C 1.79
    {
      from: [0, -OUTER / 2],
      to: [7.45, -OUTER / 2],
      thickness: OUTER,
      openings: [window(0.7, 1.46), window(4.2, 1.46)],
    },
    // West façade (also covers the NW corner)
    { from: [-OUTER / 2, -OUTER], to: [-OUTER / 2, 4.52], thickness: OUTER },
    // NE corner post
    { from: [7.45, -OUTER / 2], to: [7.73, -OUTER / 2], thickness: OUTER },
    // East wall onto the balcony: 1 0.90 | sliding door 1.78 | 3 1.015
    // The sliding door: fixed leaf (glass) + open leaf, so the balcony is walkable.
    {
      from: [7.59, 0],
      to: [7.59, 3.695],
      thickness: 0.28,
      openings: [frenchWindow(0.9, 0.89), frenchWindow(1.79, 0.89, false)],
    },
    // D 2.33: séjour / salle de bain
    { from: [5.12, 3.7475], to: [7.45, 3.7475], thickness: 0.105 },
    // Séjour / cellier (door into the cellier)
    {
      from: [-OUTER, 4.47],
      to: [3.78, 4.47],
      thickness: INNER,
      openings: [door(1.52, 0.9)],
    },

    // ── Cellier + placard ─────────────────────────────────────────────
    { from: [0.365, 4.42], to: [0.365, 6.6], thickness: 0.17 },
    { from: [0.28, 6.475], to: [3.7, 6.475], thickness: OUTER },
    { from: [3.08, 4.52], to: [3.08, 6.35], thickness: INNER },
    { from: [3.74, 4.52], to: [3.74, 6.35], thickness: 0.08 },

    // ── Entrée ────────────────────────────────────────────────────────
    { from: [3.585, 6.35], to: [3.585, 8.69], thickness: 0.23 },
    // Entrée / salle de bain (bathroom door)
    {
      from: [5.165, 3.695],
      to: [5.165, 5.92],
      thickness: 0.09,
      openings: [door(0.95)],
    },
    // South façade (landing side), front door at x 4.85
    {
      from: [3.47, 8.595],
      to: [14.43, 8.595],
      thickness: 0.19,
      // Front door: closed, it opens onto the building's landing
      openings: [{ ...door(1.38, 0.9), leaf: "#5b5f63" }],
    },

    // ── Salle de bain / WC ────────────────────────────────────────────
    { from: [5.12, 5.87], to: [8.13, 5.87], thickness: INNER },
    { from: [5.86, 5.87], to: [5.86, 7.4], thickness: INNER },
    // WC south wall (WC door into the dégagement)
    {
      from: [5.81, 7.35],
      to: [8.13, 7.35],
      thickness: INNER,
      openings: [door(0.1)],
    },
    { from: [7.48, 5.87], to: [7.48, 7.35], thickness: 0.06 },

    // ── Chambres ──────────────────────────────────────────────────────
    // North façade of the bedrooms (Ch. 2 French window, Ch. 1 window)
    {
      from: [7.45, 3.65],
      to: [14.43, 3.65],
      thickness: 0.3,
      openings: [frenchWindow(1.2, 0.75), window(4.41, 1.4)],
    },
    // East façade
    { from: [14.34, 3.5], to: [14.34, 8.69], thickness: 0.18 },
    // Salle de bain / chambre 2
    { from: [8.1, 3.8], to: [8.1, 7.4], thickness: 0.07 },
    // Chambre 2 south wall (door at x 8.95)
    {
      from: [8.13, 7.35],
      to: [11.5, 7.35],
      thickness: INNER,
      openings: [door(0.82, 0.85)],
    },
    // Chambre 2 / chambre 1
    { from: [11.455, 3.8], to: [11.455, 7.4], thickness: 0.09 },
    // Dégagement / chambre 1 (door)
    {
      from: [10.36, 7.4],
      to: [10.36, 8.5],
      thickness: INNER,
      openings: [door(0.15)],
    },
  ],

  areas: [
    {
      label: "Séjour / Cuisine",
      rect: [0, 0, 7.45, 3.8],
      floorColor: WOOD,
      floorFinish: "parquet",
    },
    { rect: [0, 3.8, 3.78, 4.47], floorColor: WOOD, floorFinish: "parquet", ceiling: 2.15 },
    {
      label: "Balcon",
      rect: [7.73, -0.15, 9.75, 3.5],
      floorColor: OUTDOOR,
      floorFinish: "tile60",
      outdoor: true,
    },
    {
      label: "Cellier",
      rect: [0.45, 4.47, 3.78, 6.35],
      floorColor: TILE,
      floorFinish: "tile30",
      ceiling: 2.15,
    },
    {
      label: "Entrée",
      rect: [3.78, 3.8, 5.12, 5.87],
      floorColor: WOOD,
      floorFinish: "parquet",
      ceiling: 2.2,
    },
    { rect: [3.7, 5.87, 5.86, 8.5], floorColor: WOOD, floorFinish: "parquet", ceiling: 2.2 },
    { label: "SdB", rect: [5.12, 3.8, 8.1, 5.87], floorColor: TILE, floorFinish: "tile30" },
    {
      label: "WC",
      rect: [5.86, 5.87, 7.48, 7.35],
      floorColor: TILE,
      floorFinish: "tile30",
      ceiling: 2.2,
    },
    {
      label: "Dégagement",
      rect: [5.86, 7.35, 10.36, 8.5],
      floorColor: WOOD,
      floorFinish: "parquet",
      ceiling: 2.15,
    },
    {
      label: "Chambre 2",
      rect: [8.1, 3.8, 11.455, 7.35],
      floorColor: WOOD,
      floorFinish: "parquet",
    },
    {
      label: "Chambre 1",
      rect: [11.455, 3.8, 14.25, 8.5],
      floorColor: WOOD,
      floorFinish: "parquet",
    },
    { rect: [10.36, 7.35, 11.455, 8.5], floorColor: WOOD, floorFinish: "parquet" },
  ],

  furniture: [
    // Kitchen: the whole west wall of the séjour (0 → 4.42 m). Sage green
    // 60 cm base units, black worktop, oven under the hob, oak wall cabinets
    // with black open shelves, dark 60 × 60 floor tiles.
    {
      name: "Carrelage cuisine",
      rect: [0, 0, 1.5, 4.42],
      h: 0.005,
      color: "#4a4a4a",
      finish: "tile60",
      solid: false,
    },
    { name: "Plinthe", rect: [0, 0, 0.56, 4.42], h: 0.1, color: "#1f2420" },
    {
      name: "Colonne frigo",
      rect: [0, 0, 0.62, 0.6],
      y: 0.1,
      h: 2.0,
      color: KITCHEN_GREEN,
      finish: "cabinetTall",
    },
    {
      name: "Meubles bas",
      rect: [0, 0.6, 0.6, 4.42],
      y: 0.1,
      h: 0.76,
      color: KITCHEN_GREEN,
      finish: "cabinet",
    },
    {
      name: "Plan de travail",
      rect: [0, 0.6, 0.64, 4.42],
      y: 0.86,
      h: 0.04,
      color: "#3a3a3a",
      finish: "stone",
    },
    { name: "Four", rect: [0.6, 1.825, 0.615, 2.375], y: 0.3, h: 0.58, color: "#111111" },
    { name: "Plaque de cuisson", rect: [0.04, 1.8, 0.56, 2.4], y: 0.9, h: 0.008, color: "#0d0d0d" },
    { name: "Évier", rect: [0.08, 3.4, 0.5, 4.2], y: 0.9, h: 0.008, color: "#3c3c3c" },
    { name: "Mitigeur", rect: [0.04, 3.77, 0.1, 3.83], y: 0.9, h: 0.32, color: "#111111" },
    { name: "Étagère ouverte", rect: [0, 1.2, 0.35, 1.5], y: 1.5, h: 0.7, color: "#151515" },
    {
      name: "Meubles hauts",
      rect: [0, 1.5, 0.35, 2.7],
      y: 1.5,
      h: 0.7,
      color: "#a07b55",
      finish: "oak",
    },
    { name: "Étagère ouverte", rect: [0, 2.7, 0.35, 3.0], y: 1.5, h: 0.7, color: "#151515" },
    // Cellier
    { name: "Gaine cellier", rect: [0.45, 4.52, 0.98, 5.08], h: 2.15, color: GAINE },
    { name: "Ballon eau chaude", rect: [2.42, 5.7, 3.03, 6.3], h: 1.8, color: "#f2f4f6" },
    {
      name: "Placard cellier",
      rect: [3.13, 4.52, 3.7, 6.35],
      h: 2.2,
      color: "#cfc6b8",
      finish: "cabinetTall",
    },
    // Entrée
    { name: "Gaine entrée", rect: [3.7, 7.86, 4.38, 8.5], h: 2.2, color: GAINE },
    { name: "Tableau électrique", rect: [5.21, 5.92, 5.81, 6.2], h: 2.0, color: "#e6e2da" },
    // Salle de bain
    { name: "Lave-linge", rect: [5.22, 3.8, 5.84, 4.4], h: 0.85, color: "#f2f4f6" },
    { name: "Double vasque", rect: [5.9, 3.8, 7.26, 4.3], h: 0.85, color: "#f2f4f6" },
    { name: "Baignoire", rect: [7.36, 4.2, 8.065, 5.82], h: 0.55, color: "#f8f9fa" },
    // WC
    { name: "WC", rect: [6.8, 6.0, 7.2, 6.65], h: 0.42, color: "#f2f4f6" },
    { name: "Gaine WC", rect: [7.51, 5.92, 8.065, 7.3], h: 2.2, color: GAINE },
    // Chambre 1
    {
      name: "Placard chambre 1",
      rect: [12.6, 7.9, 14.25, 8.5],
      h: 2.3,
      color: "#cfc6b8",
      finish: "cabinetTall",
    },
    // Balcony railings
    { name: "Garde-corps nord", rect: [7.73, -0.23, 9.83, -0.15], h: 1.0, color: "#6b7076" },
    { name: "Garde-corps est", rect: [9.75, -0.23, 9.83, 3.5], h: 1.0, color: "#6b7076" },
  ],

  // Just inside the front door (x 4.85–5.75), looking up the entrée toward the séjour
  spawn: { x: 5.0, z: 8.15, yaw: 0.2 },
};
