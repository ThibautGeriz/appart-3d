import type { Collider } from "../player/movement";
import type { WallDef, ApartmentDef } from "../data/apartment";

export interface Interval {
  min: number;
  max: number;
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
 * Gaps (e.g. doorways) between colliders crossing a given z line.
 * Used to verify the apartment plan stays walkable.
 */
export function findGapsAlongZ(colliders: Collider[], z: number): Interval[] {
  const row = colliders
    .filter((c) => c.minZ <= z && c.maxZ >= z)
    .map((c) => ({ min: c.minX, max: c.maxX }));
  const merged = mergeIntervals(row);
  const gaps: Interval[] = [];
  for (let i = 1; i < merged.length; i++) {
    if (merged[i].min > merged[i - 1].max) {
      gaps.push({ min: merged[i - 1].max, max: merged[i].min });
    }
  }
  return gaps;
}

/** AABB colliders for a wall segment. Pure. */
export function wallCollider(wall: WallDef): Collider {
  return {
    minX: wall.x - wall.w / 2,
    maxX: wall.x + wall.w / 2,
    minZ: wall.z - wall.d / 2,
    maxZ: wall.z + wall.d / 2,
  };
}

/** The apartment outer bounds (including wall thickness), for validation. */
export function apartmentBounds(def: ApartmentDef): Collider {
  const hx = def.width / 2 + def.wallThickness;
  const hz = def.depth / 2 + def.wallThickness;
  return { minX: -hx, maxX: hx, minZ: -hz, maxZ: hz };
}
