import * as THREE from "three";
import type { ApartmentDef, Rect } from "../data/apartment";
import type { Placement } from "./furnishing";
import { formatCm } from "./dimensionLines";
import { makeRoomSprite } from "./dimensions";
import { allFurniture, blocksPlayer, wallPieces } from "./plan";

/**
 * Dimension lines of the furniture ("cotes" of each piece), shown with the
 * walls' (CÔTES / Tab): its width along its front edge and its depth along
 * its right side, drawn on the floor just outside it, its height up a front
 * corner, each with end ticks; and one tag above it with its name and
 * L × P × H. Identical pieces (the dining chairs) share one tag.
 * Clearances too: from each side of a piece to the nearest wall, built-in
 * or other piece facing it (in green, in cm).
 */

/** Gap between the piece and its dimension lines. */
const OFFSET = 0.06;
/** Half length of the end ticks. */
const TICK = 0.04;
/** Lines a hair above the floor (no z-fighting). */
const FLOOR_Y = 0.006;
/** Tag above the piece. */
const TAG_GAP = 0.18;
const TAG_SCALE = 0.0008; // a little smaller than the room tags
const COLOR = "#1d5fa8";
const CLEARANCE_COLOR = "#1f7a3d";
/** Clearances shown: from touching (under 1 cm: against it) to a walkway. */
const MIN_GAP = 0.01;
const MAX_GAP = 1.2;
/** The two sides must face each other over at least this much. */
const MIN_OVERLAP = 0.05;
const GAP_LABEL_HEIGHT = 0.07; // m, on the floor

export type Point = [number, number, number];
export type Segment = [Point, Point];

export interface FurnitureCotes {
  segments: Segment[];
  tags: { text: string; position: Point }[];
}

/** Model-local (x, y, z) → world, for a placement (rotation about y, then the offset). */
function toWorld(p: Placement, [lx, y, lz]: Point): Point {
  const c = Math.cos(p.rotationY);
  const s = Math.sin(p.rotationY);
  return [p.x + lx * c + lz * s, y, p.z - lx * s + lz * c];
}

/** Line from a to b with ticks across it at both ends, along `across` (model-local). */
function dimension(a: Point, b: Point, across: Point): Segment[] {
  const tick = (q: Point): Segment => [
    [q[0] - across[0] * TICK, q[1] - across[1] * TICK, q[2] - across[2] * TICK],
    [q[0] + across[0] * TICK, q[1] + across[1] * TICK, q[2] + across[2] * TICK],
  ];
  return [[a, b], tick(a), tick(b)];
}

/** Segments (world) and tags of every placed piece. Pure. */
export function furnitureCotes(placements: Placement[]): FurnitureCotes {
  const segments: Segment[] = [];
  const tags: FurnitureCotes["tags"] = [];
  const tagged = new Set<string>();
  for (const p of placements) {
    const { w, d, h } = p.product;
    const x0 = -w / 2;
    const x1 = w / 2;
    const front = d / 2;
    const back = -d / 2;
    const local: Segment[] = [
      // width, on the floor in front of it
      ...dimension([x0, FLOOR_Y, front + OFFSET], [x1, FLOOR_Y, front + OFFSET], [0, 0, 1]),
      // depth, on the floor along its right side
      ...dimension([x1 + OFFSET, FLOOR_Y, back], [x1 + OFFSET, FLOOR_Y, front], [1, 0, 0]),
      // height, up its front right corner
      ...dimension([x1 + OFFSET, 0, front + OFFSET], [x1 + OFFSET, h, front + OFFSET], [1, 0, 0]),
    ];
    for (const [a, b] of local) segments.push([toWorld(p, a), toWorld(p, b)]);
    if (!tagged.has(p.product.id)) {
      tagged.add(p.product.id);
      tags.push({
        text: `${p.product.name}\nL ${formatCm(w)} × P ${formatCm(d)} × H ${formatCm(h)} cm`,
        position: [p.x, h + TAG_GAP, p.z],
      });
    }
  }
  return { segments, tags };
}

/** A clearance on the plan: from a piece's side to what faces it, in x, z. */
export interface Clearance {
  from: [number, number];
  to: [number, number];
  /** meters */
  gap: number;
}

interface Box {
  rect: Rect;
  /** placement index, or -1 for walls and built-ins */
  owner: number;
}

/** A dining set touches by design: no clearance between its chairs and table. */
function together(a: Placement, b: Placement): boolean {
  const kinds = [a.product.kind, b.product.kind];
  return kinds.includes("chair") && kinds.every((k) => k === "chair" || k === "table");
}

/**
 * Clearances of every piece: on each of its four sides, the gap to the
 * nearest wall, built-in or other piece facing it (over MIN_OVERLAP), when
 * between MIN_GAP and MAX_GAP; one line per pair of pieces. `fixed` are the
 * walls and built-ins (plan rects). Pure.
 */
export function clearances(placements: Placement[], fixed: Rect[]): Clearance[] {
  const boxes: Box[] = [
    ...fixed.map((rect) => ({ rect, owner: -1 })),
    ...placements.flatMap((p, owner) => (p.rects ?? [p.rect]).map((rect) => ({ rect, owner }))),
  ];
  const out: Clearance[] = [];
  const pairs = new Set<string>();
  placements.forEach((p, i) => {
    for (const [minX, minZ, maxX, maxZ] of p.rects ?? [p.rect]) {
      for (const [axis, sign] of [
        ["x", 1],
        ["x", -1],
        ["z", 1],
        ["z", -1],
      ] as const) {
        let best: { box: Box; gap: number; lo: number; hi: number } | null = null;
        for (const box of boxes) {
          if (box.owner === i) continue;
          const [ox0, oz0, ox1, oz1] = box.rect;
          // overlap across the direction, gap along it
          const lo = axis === "x" ? Math.max(minZ, oz0) : Math.max(minX, ox0);
          const hi = axis === "x" ? Math.min(maxZ, oz1) : Math.min(maxX, ox1);
          if (hi - lo < MIN_OVERLAP) continue;
          const gap =
            axis === "x"
              ? sign > 0
                ? ox0 - maxX
                : minX - ox1
              : sign > 0
                ? oz0 - maxZ
                : minZ - oz1;
          if (gap < -0.005 || gap > MAX_GAP) continue;
          if (!best || gap < best.gap) best = { box, gap, lo, hi };
        }
        if (!best || best.gap < MIN_GAP) continue; // against it, or nothing near
        const other = best.box.owner;
        if (other >= 0) {
          if (together(p, placements[other])) continue;
          const key = `${Math.min(i, other)}:${Math.max(i, other)}:${axis}`;
          if (pairs.has(key)) continue;
          pairs.add(key);
        }
        const mid = (best.lo + best.hi) / 2;
        const start = axis === "x" ? (sign > 0 ? maxX : minX) : sign > 0 ? maxZ : minZ;
        const end = start + sign * best.gap;
        out.push(
          axis === "x"
            ? { from: [start, mid], to: [end, mid], gap: best.gap }
            : { from: [mid, start], to: [mid, end], gap: best.gap },
        );
      }
    }
  });
  return out;
}

/** Walls (the parts standing on the floor) and built-in furniture, as plan rects. Pure. */
export function fixedObstacles(def: ApartmentDef): Rect[] {
  const rects: Rect[] = [];
  for (const wall of def.walls) {
    const pieces = wallPieces(wall, def.wallHeight);
    for (const b of [...pieces.solid, ...pieces.glass])
      if (b.minY < 0.3) rects.push([b.minX, b.minZ, b.maxX, b.maxZ]);
  }
  for (const item of allFurniture(def)) if (blocksPlayer(item)) rects.push(item.rect);
  return rects;
}

const gapTextures = new Map<string, THREE.CanvasTexture>();

/** A small centimetre label lying at floor level (world size, so it shrinks with distance). */
function gapLabel(text: string): THREE.Sprite {
  let texture = gapTextures.get(text);
  if (!texture) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const font = "700 30px system-ui, sans-serif";
    ctx.font = font;
    canvas.width = Math.ceil(ctx.measureText(text).width + 16);
    canvas.height = 40;
    ctx.font = font;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 10);
    ctx.fill();
    ctx.fillStyle = CLEARANCE_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    gapTextures.set(text, texture);
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, toneMapped: false }),
  );
  const { width, height } = texture.image as HTMLCanvasElement;
  sprite.scale.set((GAP_LABEL_HEIGHT * width) / height, GAP_LABEL_HEIGHT, 1);
  return sprite;
}

/** Clearance lines (with end ticks across them) and their labels. */
function buildClearances(list: Clearance[]): THREE.Group {
  const group = new THREE.Group();
  const points: number[] = [];
  for (const { from, to, gap } of list) {
    const alongX = from[1] === to[1];
    const tick = (x: number, z: number) =>
      alongX
        ? [x, FLOOR_Y, z - TICK, x, FLOOR_Y, z + TICK]
        : [x - TICK, FLOOR_Y, z, x + TICK, FLOOR_Y, z];
    points.push(from[0], FLOOR_Y, from[1], to[0], FLOOR_Y, to[1]);
    points.push(...tick(...from), ...tick(...to));
    const label = gapLabel(formatCm(gap));
    label.position.set((from[0] + to[0]) / 2, 0.05, (from[1] + to[1]) / 2);
    group.add(label);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  group.add(
    new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: CLEARANCE_COLOR, toneMapped: false }),
    ),
  );
  return group;
}

/** The overlay for a set of placements: one line mesh, one sprite per tag. */
export function buildFurnitureDimensions(placements: Placement[], fixed: Rect[] = []): THREE.Group {
  const group = new THREE.Group();
  group.name = "furniture dimensions";
  const { segments, tags } = furnitureCotes(placements);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      segments.flatMap(([a, b]) => [...a, ...b]),
      3,
    ),
  );
  group.add(
    new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: COLOR, toneMapped: false }),
    ),
  );
  for (const { text, position } of tags) {
    const sprite = makeRoomSprite(text, COLOR, TAG_SCALE);
    sprite.position.set(...position);
    group.add(sprite);
  }
  group.add(buildClearances(clearances(placements, fixed)));
  return group;
}

/**
 * Keep the furniture's dimension lines in `overlay` (the dimensions group,
 * toggled with the walls'), rebuilt whenever the furniture changes.
 */
export function attachFurnitureDimensions(
  overlay: THREE.Object3D,
  furniture: { placements: Placement[]; onChange(listener: () => void): void },
  def: ApartmentDef,
): void {
  const fixed = fixedObstacles(def);
  let current: THREE.Group | null = null;
  const rebuild = () => {
    if (current) {
      overlay.remove(current);
      current.traverse((o) => {
        if (o instanceof THREE.LineSegments || o instanceof THREE.Sprite) {
          // sprites share one geometry (three's): only the lines own theirs
          if (o instanceof THREE.LineSegments) o.geometry.dispose();
          const material = o.material as THREE.Material & { map?: THREE.Texture | null };
          // the clearance labels' textures are cached and shared
          if (
            material.map &&
            ![...gapTextures.values()].includes(material.map as THREE.CanvasTexture)
          )
            material.map.dispose();
          material.dispose();
        }
      });
    }
    current = buildFurnitureDimensions(furniture.placements, fixed);
    overlay.add(current);
  };
  rebuild();
  furniture.onChange(rebuild);
}
