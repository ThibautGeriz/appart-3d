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
  /** glazed leaves side by side (2 = casement opening in the middle) */
  panes?: number;
  /** black metal guardrail on the outside face (low sills) */
  guardrail?: boolean;
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
  | "kitchenTile"
  | "lacquer"
  | "grass"
  | "facade";

export interface AreaDef {
  /** room name; unlabeled areas still get floor/ceiling */
  label?: string;
  /** room an unlabeled area belongs to (open to it, shares its lights) */
  room?: string;
  rect: Rect;
  floorColor: string;
  floorFinish?: Finish;
  /** lowered ceiling height (HSFP), defaults to the wall height */
  ceiling?: number;
  /** no ceiling (balcony) */
  outdoor?: boolean;
}

/** Detailed model drawn instead of a box (see src/apartment/props.ts). */
export type PropModel = "washingMachine" | "toilet";

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
  /** below 1 = see-through (glass), does not cast shadows */
  opacity?: number;
  /** draw a detailed model in the footprint instead of a box */
  model?: PropModel;
  /** direction the model's front faces (default +z) */
  facing?: Facing;
  /** blocks the player (default true) */
  solid?: boolean;
}

export type KitchenModule =
  | { kind: "door"; width: number }
  /** drawer front heights, top to bottom (sum = carcass height above the plinth) */
  | { kind: "drawers"; width: number; fronts: number[] }
  /** built-in oven with filler strips `below` / `above` it */
  | { kind: "oven"; width: number; below: number; above: number };

/** Straight kitchen run against the wall x = `wallX`, facing +x. */
export interface KitchenDef {
  wallX: number;
  /** modules are laid out from startZ toward endZ (left → right when facing the run) */
  startZ: number;
  endZ: number;
  modules: KitchenModule[];
  depth: number;
  plinth: number;
  /** carcass top (worktop underside) */
  height: number;
  frontColor: string;
  frontFinish?: Finish;
  plinthColor: string;
  /** seen through the gaps between fronts */
  carcassColor: string;
  handleColor: string;
  ovenColor: string;
  ovenGlassColor: string;
  worktop: { thickness: number; overhang: number; color: string; finish?: Finish };
  /** z ranges on the worktop */
  sink: [number, number];
  /** tap position (defaults to the sink center) */
  tapZ?: number;
  hob: [number, number];
  wallCabinets: {
    z: [number, number];
    doors: number;
    bottom: number;
    height: number;
    depth: number;
    color: string;
    finish?: Finish;
    /** integrated hood under this z range */
    hood?: [number, number];
  };
  /** tiles in front of the run */
  floor: { depth: number; color: string; finish?: Finish };
}

/** Direction a wall light faces, into the room. */
export type Facing = "+x" | "-x" | "+z" | "-z";

export type LightDef =
  /** ceiling light point (plan: red ✕ / SP), hangs under the local ceiling */
  | { kind: "ceiling"; x: number; z: number }
  /** wall sconce on the wall face at (x, z), washing the wall up and down */
  | { kind: "sconce"; x: number; z: number; y: number; facing: Facing }
  /** LED strip (under cabinets) at (x, z), lighting the wall below it */
  | { kind: "strip"; x: number; z: number; y: number; length: number; facing: Facing };

/** Built-in cupboard with doors on its `facing` side. */
export interface ClosetDef {
  name: string;
  /** "sliding": two leaves on offset tracks with pulls; "flush": doors in the
   * wall plane, wall finish, shadow gaps only, push-to-open (no handles) */
  style: "sliding" | "flush";
  /** full footprint, carcass + doors */
  rect: Rect;
  facing: Facing;
  height: number;
  doors: number;
  color: string;
  finish?: Finish;
  pullColor: string;
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
  kitchen: KitchenDef;
  closets: ClosetDef[];
  lights: LightDef[];
  spawn: { x: number; z: number; yaw: number };
}

const WOOD = "#ffffff"; // the oak plank scan carries its own color
const TILE = "#d9d6cf";
const OUTDOOR = "#9a9fa5";
const GAINE = "#f4f3f0"; // boxed-in shafts, painted white like the walls
const KITCHEN_TILE = "#6a6a6a";

const OUTER = 0.25;
const INNER = 0.1;

const door = (at: number, width = 0.8): OpeningDef => ({ at, width, sill: 0, head: 2.04 });
// All windows are tall: 20 cm from the floor
const window = (at: number, width: number): OpeningDef => ({
  at,
  width,
  panes: 2,
  guardrail: true,
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
  wallColor: "#ffffff",
  wallFinish: "plaster",
  ceilingColor: "#ffffff",
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
      to: [3.7, 4.47],
      thickness: INNER,
      openings: [door(1.52, 0.9)],
    },

    // ── Cellier + placard ─────────────────────────────────────────────
    { from: [0.365, 4.42], to: [0.365, 6.6], thickness: 0.17 },
    { from: [0.28, 6.475], to: [3.7, 6.475], thickness: OUTER },
    { from: [3.08, 4.52], to: [3.08, 6.35], thickness: INNER },

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
    // North façade of the bedrooms (Ch. 2 French window onto the balcony, Ch. 1 window)
    {
      from: [7.45, 3.65],
      to: [14.43, 3.65],
      thickness: 0.3,
      // Ch. 2 French window opens onto the balcony: left open (walkable), no guardrail
      openings: [frenchWindow(1.2, 0.75, false), window(4.41, 1.4)],
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
    // Lowered ceiling band along the séjour's south side, up to the entrée wall (plan: HSFP 2.15)
    {
      room: "Séjour / Cuisine",
      rect: [0, 3.8, 5.12, 4.47],
      floorColor: WOOD,
      floorFinish: "parquet",
      ceiling: 2.15,
    },
    {
      label: "Balcon",
      rect: [7.73, -0.15, 9.75, 3.5],
      floorColor: OUTDOOR,
      floorFinish: "tile60",
      outdoor: true,
    },
    {
      label: "Cellier",
      rect: [0.45, 4.47, 3.7, 6.35],
      // same dark 60 × 120 tiles as the kitchen
      floorColor: KITCHEN_TILE,
      floorFinish: "kitchenTile",
      ceiling: 2.15,
    },
    {
      label: "Entrée",
      rect: [3.7, 4.47, 5.12, 5.87],
      floorColor: WOOD,
      floorFinish: "parquet",
      ceiling: 2.2,
    },
    {
      room: "Entrée",
      rect: [3.7, 5.87, 5.86, 8.5],
      floorColor: WOOD,
      floorFinish: "parquet",
      ceiling: 2.2,
    },
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
    {
      room: "Chambre 1",
      rect: [10.36, 7.35, 11.455, 8.5],
      floorColor: WOOD,
      floorFinish: "parquet",
    },
  ],

  furniture: [
    // Cellier
    { name: "Gaine cellier", rect: [0.45, 4.52, 0.98, 5.08], h: 2.15, color: GAINE },
    { name: "Ballon eau chaude", rect: [2.42, 5.7, 3.03, 6.3], h: 1.8, color: "#f2f4f6" },
    // Entrée
    // Shaft by the front door, as on the plan: boxed-in wall, plaster up to the 2.20 m ceiling
    {
      name: "Gaine entrée",
      rect: [3.7, 7.86, 4.38, 8.5],
      h: 2.2,
      color: "#ffffff",
      finish: "plaster",
    },
    { name: "Tableau électrique", rect: [5.21, 5.92, 5.81, 6.2], h: 2.0, color: "#e6e2da" },
    // Salle de bain
    {
      name: "Lave-linge",
      rect: [5.22, 3.8, 5.82, 4.4],
      h: 0.85,
      color: "#f2f4f6",
      model: "washingMachine",
      facing: "+z",
    },
    // Double vanity: wall-hung oak cabinet, white top with two basins, mirror
    {
      name: "Meuble vasque",
      rect: [5.9, 3.8, 7.26, 4.3],
      y: 0.3,
      h: 0.52,
      color: "#ffffff",
      finish: "oak",
    },
    { name: "Plan vasque", rect: [5.9, 3.8, 7.26, 4.32], y: 0.82, h: 0.03, color: "#f4f4f2" },
    { name: "Vasque 1", rect: [6.13, 3.88, 6.57, 4.24], y: 0.85, h: 0.12, color: "#fbfbfa" },
    { name: "Vasque 2", rect: [6.65, 3.88, 7.09, 4.24], y: 0.85, h: 0.12, color: "#fbfbfa" },
    {
      name: "Robinet 1",
      rect: [6.33, 3.82, 6.37, 3.88],
      y: 0.85,
      h: 0.25,
      color: "#151515",
      solid: false,
    },
    {
      name: "Robinet 2",
      rect: [6.85, 3.82, 6.89, 3.88],
      y: 0.85,
      h: 0.25,
      color: "#151515",
      solid: false,
    },
    {
      name: "Miroir",
      rect: [6.0, 3.8, 7.16, 3.82],
      y: 1.15,
      h: 0.8,
      color: "#c9d6dc",
      solid: false,
    },
    // Italian (walk-in) shower in place of the bath: flush floor, fixed glass
    // screen on the room side, black shower column on the wall
    {
      name: "Sol douche",
      rect: [7.36, 4.2, 8.065, 5.82],
      h: 0.004,
      color: "#7b7d80",
      finish: "tile30",
      solid: false,
    },
    { name: "Caniveau", rect: [7.38, 5.7, 8.04, 5.76], h: 0.006, color: "#2a2a2a", solid: false },
    {
      name: "Paroi de douche",
      rect: [7.35, 4.2, 7.37, 5.2],
      h: 2.0,
      color: "#dfeef3",
      opacity: 0.25,
    },
    {
      name: "Profilé paroi",
      rect: [7.345, 4.2, 7.375, 5.2],
      y: 2.0,
      h: 0.02,
      color: "#151515",
      solid: false,
    },
    {
      name: "Colonne de douche",
      rect: [8.02, 4.98, 8.05, 5.01],
      y: 0.9,
      h: 1.15,
      color: "#151515",
      solid: false,
    },
    {
      name: "Pomme de douche",
      rect: [7.78, 4.86, 8.05, 5.13],
      y: 2.05,
      h: 0.015,
      color: "#151515",
      solid: false,
    },
    // WC
    // Wall-hung toilet on the boxed-in cistern ("tablette medium" on the plan)
    {
      name: "Coffrage WC",
      rect: [6.75, 5.92, 7.45, 6.12],
      h: 1.12,
      color: "#ffffff",
      finish: "plaster",
    },
    {
      name: "WC",
      rect: [6.92, 6.12, 7.28, 6.68],
      h: 0.42,
      color: "#f2f4f6",
      model: "toilet",
      facing: "+z",
    },
    { name: "Gaine WC", rect: [7.51, 5.92, 8.065, 7.3], h: 2.2, color: GAINE },
    // Chambre 1
    // Balcony railings
    { name: "Garde-corps nord", rect: [7.73, -0.23, 9.83, -0.15], h: 1.0, color: "#6b7076" },
    { name: "Garde-corps est", rect: [9.75, -0.23, 9.83, 3.5], h: 1.0, color: "#6b7076" },
  ],

  // Kitchen (architect's render): the whole west wall of the séjour, no
  // fridge. Left → right: 3 doors (sink above the 2nd), 3 drawers, oven under
  // the hob, a narrow door, 3 drawers. Oak wall cabinets at the window end
  // with an integrated hood above the hob.
  kitchen: {
    wallX: 0,
    startZ: 4.42,
    endZ: 0,
    modules: [
      { kind: "door", width: 0.5 },
      { kind: "door", width: 0.5 },
      { kind: "door", width: 0.5 },
      { kind: "drawers", width: 0.9, fronts: [0.13, 0.26, 0.37] },
      { kind: "oven", width: 0.6, below: 0.11, above: 0.07 },
      { kind: "door", width: 0.4 },
      { kind: "drawers", width: 1.02, fronts: [0.23, 0.255, 0.275] },
    ],
    depth: 0.6,
    plinth: 0.1,
    height: 0.86,
    frontColor: "#8a9d93",
    frontFinish: "lacquer",
    plinthColor: "#1c1c1c",
    carcassColor: "#2b302d",
    handleColor: "#151515",
    ovenColor: "#141414",
    ovenGlassColor: "#2a2622",
    worktop: { thickness: 0.04, overhang: 0.02, color: "#3a3a3a", finish: "stone" },
    // wide sink over the first two doors, tap toward its right
    sink: [3.47, 4.37],
    tapZ: 3.75,
    hob: [1.44, 2.0],
    wallCabinets: {
      z: [0, 2.1],
      doors: 3,
      bottom: 1.5,
      height: 0.83,
      depth: 0.35,
      color: "#ffffff",
      finish: "oak",
      hood: [1.4, 2.06],
    },
    floor: { depth: 1.2, color: KITCHEN_TILE, finish: "kitchenTile" },
  },

  // Built-in cupboards ("Pl." on the plan), sliding doors
  closets: [
    {
      // between the cellier and the entrée, opening onto the entrée (HSFP 2.20)
      // sliding doors facing the entrée, in line with the entrée wall below
      // it (x 3.70, as on the plan)
      name: "Placard entrée",
      style: "sliding",
      rect: [3.13, 4.52, 3.7, 6.35],
      facing: "+x",
      height: 2.2,
      doors: 2,
      color: "#eceae6",
      finish: "lacquer",
      pullColor: "#9a9a9a",
    },
    {
      name: "Placard chambre 1",
      style: "sliding",
      rect: [12.6, 7.9, 14.25, 8.5],
      facing: "-z",
      height: 2.5,
      doors: 2,
      color: "#f4f3f0",
      finish: "lacquer",
      pullColor: "#9a9a9a",
    },
  ],

  lights: [
    // Ceiling light points from the plan (red ✕ and "SP" marks). The red
    // dots next to the doors are switches and the circled D is a smoke
    // detector, so they are not lights.
    { kind: "ceiling", x: 1.42, z: 1.89 }, // séjour, kitchen side
    { kind: "ceiling", x: 4.78, z: 1.89 }, // séjour
    { kind: "ceiling", x: 6.23, z: 4.87 }, // salle de bain
    { kind: "ceiling", x: 9.77, z: 5.5 }, // chambre 2
    { kind: "ceiling", x: 12.86, z: 5.78 }, // chambre 1
    { kind: "ceiling", x: 1.73, z: 5.44 }, // cellier
    { kind: "ceiling", x: 4.71, z: 6.47 }, // entrée
    { kind: "ceiling", x: 6.26, z: 6.6 }, // WC
    { kind: "ceiling", x: 8.08, z: 7.89 }, // dégagement
    // Wall lights from the plan
    { kind: "sconce", x: 6.64, z: 3.8, y: 2.05, facing: "+z" }, // SdB, above the mirror
    { kind: "sconce", x: 7.73, z: 0.3, y: 2.0, facing: "+x" }, // balcony, outdoor
    // Not on the plan, as requested: LED strip under the kitchen wall
    // cabinets (architect's render) and a light above the kitchen sink
    { kind: "strip", x: 0, z: 1.05, y: 1.47, length: 2.1, facing: "+x" },
    { kind: "sconce", x: 0, z: 3.92, y: 1.75, facing: "+x" },
  ],

  // Just inside the front door (x 4.85–5.75), looking up the entrée toward the séjour
  spawn: { x: 5.0, z: 8.15, yaw: 0.2 },
};
