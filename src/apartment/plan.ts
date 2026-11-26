import type { Collider } from "../player/movement";
import type { ApartmentDef, FurnitureDef, OpeningDef, Rect, WallDef } from "../data/apartment";

/** Pieces starting above this height do not block the player (lintels, wall cabinets). */
const BLOCKING_HEIGHT = 1.8;
const GLASS_THICKNESS = 0.03;

export interface Interval {
  min: number;
  max: number;
}

/** 3D axis-aligned box. */
export interface Box {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface WallPieces {
  /** opaque wall boxes (solid parts, sills, lintels) */
  solid: Box[];
  /** glazing panes filling glass openings */
  glass: Box[];
  /** the openings themselves, as boxes (for frames and labels) */
  openings: Box[];
}

/** Merge overlapping intervals (sorted output). Pure. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.min - b.min);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.min <= last.max) {
      last.max = Math.max(last.max, interval.max);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

/**
 * Gaps (e.g. doorways) between colliders crossing a given line.
 * `axis: "x"` probes the horizontal line z = `at`, `"z"` the vertical line x = `at`.
 */
export function findGaps(colliders: Collider[], axis: "x" | "z", at: number): Interval[] {
  const row = colliders
    .filter((c) => (axis === "x" ? c.minZ <= at && c.maxZ >= at : c.minX <= at && c.maxX >= at))
    .map((c) => (axis === "x" ? { min: c.minX, max: c.maxX } : { min: c.minZ, max: c.maxZ }));
  const merged = mergeIntervals(row);
  const gaps: Interval[] = [];
  for (let i = 1; i < merged.length; i++) {
    if (merged[i].min > merged[i - 1].max) {
      gaps.push({ min: merged[i - 1].max, max: merged[i].min });
    }
  }
  return gaps;
}

export function wallLength(wall: WallDef): number {
  return Math.abs(wall.to[0] - wall.from[0]) + Math.abs(wall.to[1] - wall.from[1]);
}

/**
 * Split a wall into boxes: full-height parts between openings, sills below
 * and lintels above each opening, and glass panes. Pure.
 */
export function wallPieces(wall: WallDef, wallHeight: number): WallPieces {
  const alongX = wall.from[1] === wall.to[1];
  if (!alongX && wall.from[0] !== wall.to[0]) {
    throw new Error(`Wall must be axis-aligned: ${JSON.stringify(wall)}`);
  }
  const start = alongX ? Math.min(wall.from[0], wall.to[0]) : Math.min(wall.from[1], wall.to[1]);
  const end = start + wallLength(wall);
  const center = alongX ? wall.from[1] : wall.from[0];
  const half = wall.thickness / 2;

  const box = (a: number, b: number, minY: number, maxY: number, halfT = half): Box =>
    alongX
      ? { minX: a, maxX: b, minY, maxY, minZ: center - halfT, maxZ: center + halfT }
      : { minX: center - halfT, maxX: center + halfT, minY, maxY, minZ: a, maxZ: b };

  const openings: OpeningDef[] = [...(wall.openings ?? [])].sort((a, b) => a.at - b.at);
  const pieces: WallPieces = { solid: [], glass: [], openings: [] };
  let cursor = start;
  for (const opening of openings) {
    const a = start + opening.at;
    const b = a + opening.width;
    if (a < cursor - 1e-9 || b > end + 1e-9) {
      throw new Error(`Opening out of wall bounds or overlapping: ${JSON.stringify(opening)}`);
    }
    if (a > cursor) pieces.solid.push(box(cursor, a, 0, wallHeight));
    if (opening.sill > 0) pieces.solid.push(box(a, b, 0, opening.sill));
    if (opening.head < wallHeight) pieces.solid.push(box(a, b, opening.head, wallHeight));
    pieces.openings.push(box(a, b, opening.sill, opening.head));
    if (opening.glass) {
      pieces.glass.push(box(a, b, opening.sill, opening.head, GLASS_THICKNESS / 2));
    }
    cursor = b;
  }
  if (cursor < end) pieces.solid.push(box(cursor, end, 0, wallHeight));
  return pieces;
}

export function rectCollider(rect: Rect): Collider {
  const [minX, minZ, maxX, maxZ] = rect;
  return { minX, minZ, maxX, maxZ };
}

function boxCollider(box: Box): Collider {
  return { minX: box.minX, maxX: box.maxX, minZ: box.minZ, maxZ: box.maxZ };
}

export function blocksPlayer(item: FurnitureDef): boolean {
  return item.solid !== false && (item.y ?? 0) < BLOCKING_HEIGHT;
}

/** All XZ colliders of the apartment: walls, glazing, solid furniture. Pure. */
export function buildColliders(def: ApartmentDef): Collider[] {
  const colliders: Collider[] = [];
  for (const wall of def.walls) {
    const pieces = wallPieces(wall, def.wallHeight);
    for (const piece of [...pieces.solid, ...pieces.glass]) {
      if (piece.minY < BLOCKING_HEIGHT) colliders.push(boxCollider(piece));
    }
  }
  for (const item of def.furniture) {
    if (blocksPlayer(item)) colliders.push(rectCollider(item.rect));
  }
  return colliders;
}

/** Bounding rectangle of all areas (the walkable footprint). */
export function apartmentBounds(def: ApartmentDef): Collider {
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const { rect } of def.areas) {
    bounds.minX = Math.min(bounds.minX, rect[0]);
    bounds.minZ = Math.min(bounds.minZ, rect[1]);
    bounds.maxX = Math.max(bounds.maxX, rect[2]);
    bounds.maxZ = Math.max(bounds.maxZ, rect[3]);
  }
  return bounds;
}
