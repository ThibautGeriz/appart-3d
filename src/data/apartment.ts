/**
 * Apartment layout — pure data, no rendering code.
 * All dimensions in meters. Boxes are center + size (w along x, d along z).
 *
 * Plan (origin at apartment center):
 *   - South half (z > 0.5): living room + kitchen
 *   - North-east (x > 0,  z < 0.5): bedroom
 *   - North-west (x < 0,  z < 0.5): bathroom
 *   - Doors are gaps between wall segments.
 */

export interface WallDef {
  /** center x */
  x: number;
  /** center z */
  z: number;
  /** size along x */
  w: number;
  /** size along z */
  d: number;
}

export interface FurnitureDef {
  x: number;
  z: number;
  w: number;
  d: number;
  /** height */
  h: number;
  color: string;
  /** blocks the player (default true) */
  solid?: boolean;
}

export interface DecorDef {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  opacity?: number;
}

export interface RoomDef {
  label: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface ApartmentDef {
  width: number;
  depth: number;
  wallHeight: number;
  wallThickness: number;
  wallColor: string;
  floorColor: string;
  ceilingColor: string;
  walls: WallDef[];
  rooms: RoomDef[];
  furniture: FurnitureDef[];
  decor: DecorDef[];
  spawn: { x: number; z: number; yaw: number };
}

export const APARTMENT_DEF: ApartmentDef = {
  width: 10,
  depth: 8,
  wallHeight: 2.5,
  wallThickness: 0.2,
  wallColor: "#e8e4dc",
  floorColor: "#b98a5e",
  ceilingColor: "#f5f5f0",

  walls: [
    // Outer shell (x ∈ [-5, 5], z ∈ [-4, 4])
    { x: 0, z: -4, w: 10.4, d: 0.2 }, // north
    { x: 0, z: 4, w: 10.4, d: 0.2 }, // south
    { x: -5, z: 0, w: 0.2, d: 8 }, // west
    { x: 5, z: 0, w: 0.2, d: 8 }, // east
    // Interior row along z = 0.5 (gaps = doors, 1m wide)
    //   bathroom door: x ∈ [-3.6, -2.6], bedroom door: x ∈ [0.8, 1.8]
    { x: -4.3, z: 0.5, w: 1.4, d: 0.2 },
    { x: -0.9, z: 0.5, w: 3.4, d: 0.2 },
    { x: 3.4, z: 0.5, w: 3.2, d: 0.2 },
    // Divider between bedroom and bathroom
    { x: 0, z: -1.75, w: 0.2, d: 4.5 },
  ],

  // Usable room surfaces (inner dimensions, for the "cotes" overlay)
  rooms: [
    { label: "Chambre", x: 2.5, z: -1.75, w: 4.8, d: 4.3 },
    { label: "Salle de bain", x: -2.5, z: -1.75, w: 4.8, d: 4.3 },
    { label: "Séjour / Cuisine", x: 0, z: 2.25, w: 9.8, d: 3.3 },
  ],

  furniture: [
    // Bedroom
    { x: 3.7, z: -2.6, w: 1.6, d: 2.1, h: 0.5, color: "#7f96b3" }, // bed
    { x: 0.7, z: -3.5, w: 1.6, d: 0.6, h: 2.1, color: "#8a6f52" }, // wardrobe
    // Living room
    { x: -1.6, z: 3.2, w: 2.2, d: 0.9, h: 0.85, color: "#5c7f99" }, // sofa
    { x: -1.6, z: 1.8, w: 1.0, d: 0.6, h: 0.4, color: "#9c7a54", solid: false }, // coffee table
    { x: -1.6, z: 0.85, w: 1.6, d: 0.4, h: 0.5, color: "#333333" }, // TV stand
    { x: 2.8, z: 2.6, w: 1.4, d: 0.9, h: 0.75, color: "#9c7a54" }, // dining table
    // Kitchen (along east wall)
    { x: 4.35, z: 1.4, w: 1.1, d: 2.4, h: 0.92, color: "#d8d3c8" }, // counter
    { x: 4.5, z: -0.05, w: 0.7, d: 0.7, h: 1.8, color: "#c9ccd1" }, // fridge
    // Bathroom
    { x: -4.35, z: -3.35, w: 1.1, d: 1.1, h: 2.2, color: "#bcd8e0" }, // shower
    { x: -2.75, z: -3.5, w: 0.5, d: 0.7, h: 0.8, color: "#f2f4f6" }, // toilet
    { x: -4.55, z: -1.6, w: 0.55, d: 1.0, h: 0.85, color: "#f2f4f6" }, // sink
  ],

  decor: [
    // Windows (glass, non-colliding)
    { x: 2.8, y: 1.5, z: -3.92, w: 1.4, h: 1.2, d: 0.08, color: "#bfe3f2", opacity: 0.5 }, // bedroom
    { x: -1.6, y: 1.7, z: 3.92, w: 2.0, h: 1.2, d: 0.08, color: "#bfe3f2", opacity: 0.5 }, // living
    { x: 4.87, y: 1.7, z: 1.4, w: 0.08, h: 1.2, d: 1.4, color: "#bfe3f2", opacity: 0.5 }, // kitchen
  ],

  // Spawn in the living room, facing north (-Z) toward the interior wall / doors
  spawn: { x: 0, z: 2, yaw: 0 },
};
