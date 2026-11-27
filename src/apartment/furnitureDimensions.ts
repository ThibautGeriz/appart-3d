import * as THREE from "three";
import type { Placement } from "./furnishing";
import { formatCm } from "./dimensionLines";
import { makeRoomSprite } from "./dimensions";

/**
 * Dimension lines of the furniture ("cotes" of each piece), shown with the
 * walls' (CÔTES / Tab): its width along its front edge and its depth along
 * its right side, drawn on the floor just outside it, its height up a front
 * corner, each with end ticks; and one tag above it with its name and
 * L × P × H. Identical pieces (the dining chairs) share one tag.
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

/** The overlay for a set of placements: one line mesh, one sprite per tag. */
export function buildFurnitureDimensions(placements: Placement[]): THREE.Group {
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
  return group;
}

/**
 * Keep the furniture's dimension lines in `overlay` (the dimensions group,
 * toggled with the walls'), rebuilt whenever the furniture changes.
 */
export function attachFurnitureDimensions(
  overlay: THREE.Object3D,
  furniture: { placements: Placement[]; onChange(listener: () => void): void },
): void {
  let current: THREE.Group | null = null;
  const rebuild = () => {
    if (current) {
      overlay.remove(current);
      current.traverse((o) => {
        if (o instanceof THREE.LineSegments || o instanceof THREE.Sprite) {
          // sprites share one geometry (three's): only the lines own theirs
          if (o instanceof THREE.LineSegments) o.geometry.dispose();
          const material = o.material as THREE.Material & { map?: THREE.Texture | null };
          material.map?.dispose();
          material.dispose();
        }
      });
    }
    current = buildFurnitureDimensions(furniture.placements);
    overlay.add(current);
  };
  rebuild();
  furniture.onChange(rebuild);
}
