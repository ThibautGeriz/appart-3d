import type { ApartmentDef, WallDef } from "../data/apartment";
import { exteriorSide, mergeIntervals, wallLength, type Interval } from "./plan";

/**
 * Dimension chains ("chaînes de cotes") drawn on the wall faces, like on an
 * architect's plan but in 3D: each visible stretch of wall face, between the
 * walls that cut it, is split at the door / window jambs. Pure.
 */

const EPS = 1e-6;
/** Shorter visible stretches (corner posts, jamb returns) get no dimension. */
const MIN_FACE = 0.15;

/** A vertical wall face, seen from the side its normal points to. */
export interface WallFace {
  /** "x": the face runs along x (constant z), "z": along z (constant x) */
  axis: "x" | "z";
  /** constant coordinate of the face plane (z for axis "x", x for axis "z") */
  plane: number;
  /** +1 / -1: direction the face looks to, along the other axis */
  normal: 1 | -1;
  /** extent along the axis */
  span: Interval;
  /** openings cut in the face, along the axis */
  openings: Interval[];
}

export interface DimensionSegment {
  min: number;
  max: number;
  /** true across a door / window, false along solid wall */
  opening: boolean;
}

export interface DimensionChain {
  axis: "x" | "z";
  plane: number;
  normal: 1 | -1;
  /** visible face, between the walls cutting it */
  span: Interval;
  /** consecutive parts of the span, split at the jambs */
  segments: DimensionSegment[];
}

function wallFrame(wall: WallDef) {
  const alongX = wall.from[1] === wall.to[1];
  const start = alongX ? Math.min(wall.from[0], wall.to[0]) : Math.min(wall.from[1], wall.to[1]);
  return {
    axis: (alongX ? "x" : "z") as "x" | "z",
    start,
    end: start + wallLength(wall),
    center: alongX ? wall.from[1] : wall.from[0],
    half: wall.thickness / 2,
  };
}

/** The two faces of a wall (interior ones only when the wall is a façade). Pure. */
export function wallFaces(def: ApartmentDef, wall: WallDef): WallFace[] {
  const { axis, start, end, center, half } = wallFrame(wall);
  const openings = (wall.openings ?? []).map((o) => ({
    min: start + o.at,
    max: start + o.at + o.width,
  }));
  const outside = exteriorSide(def, wall);
  return ([1, -1] as const)
    .filter((normal) => normal !== outside)
    .map((normal) => ({
      axis,
      plane: center + normal * half,
      normal,
      span: { min: start, max: end },
      openings,
    }));
}

/** Merge collinear faces looking the same way (a wall split in several segments). Pure. */
export function mergeFaces(faces: WallFace[]): WallFace[] {
  const groups: WallFace[][] = [];
  for (const face of faces) {
    const group = groups.find(
      ([g]) =>
        g.axis === face.axis && g.normal === face.normal && Math.abs(g.plane - face.plane) < EPS,
    );
    if (group) group.push(face);
    else groups.push([face]);
  }
  return groups.flatMap((group) =>
    mergeIntervals(group.map((f) => f.span)).map((span) => ({
      ...group[0],
      span,
      openings: group
        .flatMap((f) => f.openings)
        .filter((o) => o.min >= span.min - EPS && o.max <= span.max + EPS),
    })),
  );
}

/**
 * Parts of the face hidden inside other walls. A perpendicular wall hides the
 * face where it abuts or crosses it; a parallel one only when the face plane
 * runs through its thickness.
 */
function hiddenBy(face: WallFace, walls: WallDef[]): Interval[] {
  const hidden: Interval[] = [];
  for (const wall of walls) {
    const w = wallFrame(wall);
    if (w.axis === face.axis) {
      if (face.plane > w.center - w.half + EPS && face.plane < w.center + w.half - EPS) {
        hidden.push({ min: w.start, max: w.end });
      }
    } else if (face.plane >= w.start - EPS && face.plane <= w.end + EPS) {
      // Abutting from the side the face looks to, or crossing it
      const reaches = face.normal > 0 ? w.end > face.plane + EPS : w.start < face.plane - EPS;
      if (reaches) hidden.push({ min: w.center - w.half, max: w.center + w.half });
    }
  }
  return mergeIntervals(hidden);
}

/** Visible parts of an interval once the hidden ones are removed. Pure. */
export function subtractIntervals(span: Interval, holes: Interval[]): Interval[] {
  const parts: Interval[] = [];
  let cursor = span.min;
  for (const hole of mergeIntervals(holes)) {
    if (hole.max <= cursor || hole.min >= span.max) continue;
    if (hole.min > cursor) parts.push({ min: cursor, max: hole.min });
    cursor = Math.max(cursor, hole.max);
  }
  if (cursor < span.max) parts.push({ min: cursor, max: span.max });
  return parts;
}

/** Split a visible face stretch at the opening jambs. Pure. */
export function splitAtOpenings(span: Interval, openings: Interval[]): DimensionSegment[] {
  const segments: DimensionSegment[] = [];
  let cursor = span.min;
  for (const o of [...openings].sort((a, b) => a.min - b.min)) {
    const min = Math.max(o.min, span.min);
    const max = Math.min(o.max, span.max);
    if (max <= min + EPS) continue;
    if (min > cursor + EPS) segments.push({ min: cursor, max: min, opening: false });
    segments.push({ min, max, opening: true });
    cursor = max;
  }
  if (span.max > cursor + EPS) segments.push({ min: cursor, max: span.max, opening: false });
  return segments;
}

/** All dimension chains of the apartment. Pure. */
export function dimensionChains(def: ApartmentDef): DimensionChain[] {
  const faces = mergeFaces(def.walls.flatMap((wall) => wallFaces(def, wall)));
  const chains: DimensionChain[] = [];
  for (const face of faces) {
    for (const span of subtractIntervals(face.span, hiddenBy(face, def.walls))) {
      if (span.max - span.min < MIN_FACE) continue;
      chains.push({
        axis: face.axis,
        plane: face.plane,
        normal: face.normal,
        span,
        segments: splitAtOpenings(span, face.openings),
      });
    }
  }
  return chains;
}

/** Length in whole centimeters, as on a plan: "245". */
export function formatCm(meters: number): string {
  return String(Math.round(meters * 100));
}
