import type * as THREE from "three";
import type { ApartmentDef } from "../data/apartment";
import { roomAt } from "./furnishing";
import { allFurniture, wallPieces } from "./plan";

/**
 * Per-room culling and lazy loading. Rooms are linked when an opening (door,
 * open passage, window or French window) joins them; from where the camera
 * stands, its room and the rooms up to VISIBLE_DEPTH links away can be seen
 * (through a doorway, then the next one), the rest of the apartment cannot
 * and is not drawn. A room's models load the first time it can be seen.
 */

/** Links from the camera's room that stay visible (2: through two doorways). */
export const VISIBLE_DEPTH = 2;
/** Outside the apartment (roomAt's fallback). */
const OUTSIDE = "Autre";

export type RoomGraph = Map<string, Set<string>>;

/** Rooms joined by each opening of the plan: a point on each side of it. Pure. */
export function roomGraph(def: ApartmentDef): RoomGraph {
  const graph: RoomGraph = new Map();
  const link = (a: string, b: string) => {
    if (a === b || a === OUTSIDE || b === OUTSIDE) return;
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      graph.set(x, (graph.get(x) ?? new Set()).add(y));
    }
  };
  for (const wall of def.walls) {
    const alongX = wall.from[1] === wall.to[1];
    const reach = wall.thickness / 2 + 0.2;
    for (const o of wallPieces(wall, def.wallHeight).openings) {
      const cx = (o.minX + o.maxX) / 2;
      const cz = (o.minZ + o.maxZ) / 2;
      const [a, b] = alongX
        ? [roomAt(def, cx, cz - reach), roomAt(def, cx, cz + reach)]
        : [roomAt(def, cx - reach, cz), roomAt(def, cx + reach, cz)];
      link(a, b);
    }
  }
  // open passages (no wall, no opening): areas of two rooms sharing an edge
  // that is not walled all along (entrée → séjour, entrée → dégagement)
  // walls, and floor-to-ceiling built-ins (the entrée cupboard closes the
  // cellier off) count as closed
  const walls = [
    ...def.walls.flatMap((w) => wallPieces(w, def.wallHeight).solid),
    ...allFurniture(def)
      .filter((f) => (f.y ?? 0) + f.h >= 2)
      .map(({ rect: [minX, minZ, maxX, maxZ] }) => ({ minX, minZ, maxX, maxZ, minY: 0 })),
  ];
  // 5 cm tolerance: a sliding door on its rear track sits a little behind the edge
  const m = 0.05;
  const walled = (x: number, z: number) =>
    walls.some(
      (b) => x >= b.minX - m && x <= b.maxX + m && z >= b.minZ - m && z <= b.maxZ + m && b.minY < 1,
    );
  const rooms = def.areas.map(
    (a, i) => roomAt(def, (a.rect[0] + a.rect[2]) / 2, (a.rect[1] + a.rect[3]) / 2) || String(i),
  );
  for (let i = 0; i < def.areas.length; i++) {
    for (let j = i + 1; j < def.areas.length; j++) {
      if (rooms[i] === rooms[j]) continue;
      for (const edge of sharedEdges(def.areas[i].rect, def.areas[j].rect)) {
        const steps = Math.max(1, Math.round(edge.length / 0.1));
        for (let s = 0; s <= steps; s++) {
          const [x, z] = edge.at(s / steps);
          if (!walled(x, z)) {
            link(rooms[i], rooms[j]);
            break;
          }
        }
      }
    }
  }
  // every room is a node, even one with no opening listed
  for (let i = 0; i < def.areas.length; i++) {
    const area = def.areas[i];
    const room = roomAt(def, (area.rect[0] + area.rect[2]) / 2, (area.rect[1] + area.rect[3]) / 2);
    if (!graph.has(room) && room !== OUTSIDE) graph.set(room, new Set());
  }
  return graph;
}

type Rect = [number, number, number, number];

/** Segments where two rectangles touch (one's edge on the other's), at least 0.3 m long. Pure. */
export function sharedEdges(
  a: Rect,
  b: Rect,
): { length: number; at: (t: number) => [number, number] }[] {
  const edges: { length: number; at: (t: number) => [number, number] }[] = [];
  const near = (p: number, q: number) => Math.abs(p - q) < 0.06; // areas meet under a wall's width
  // vertical edges (constant x)
  for (const [xa, xb] of [
    [a[2], b[0]],
    [a[0], b[2]],
  ]) {
    const z0 = Math.max(a[1], b[1]);
    const z1 = Math.min(a[3], b[3]);
    if (near(xa, xb) && z1 - z0 > 0.3) {
      const x = (xa + xb) / 2;
      edges.push({ length: z1 - z0, at: (t) => [x, z0 + (z1 - z0) * t] });
    }
  }
  // horizontal edges (constant z)
  for (const [za, zb] of [
    [a[3], b[1]],
    [a[1], b[3]],
  ]) {
    const x0 = Math.max(a[0], b[0]);
    const x1 = Math.min(a[2], b[2]);
    if (near(za, zb) && x1 - x0 > 0.3) {
      const z = (za + zb) / 2;
      edges.push({ length: x1 - x0, at: (t) => [x0 + (x1 - x0) * t, z] });
    }
  }
  return edges;
}

/** The room and every room up to `depth` links away. Pure. */
export function visibleRooms(graph: RoomGraph, room: string, depth = VISIBLE_DEPTH): Set<string> {
  // outside (third-person camera past a wall, balcony edge): draw everything
  if (!graph.has(room)) return new Set(graph.keys());
  const seen = new Set([room]);
  let frontier = [room];
  for (let d = 0; d < depth; d++) {
    frontier = frontier.flatMap((r) => [...(graph.get(r) ?? [])].filter((n) => !seen.has(n)));
    for (const r of frontier) seen.add(r);
  }
  return seen;
}

export interface RoomCuller {
  /** draw this object only when its room can be seen */
  add(object: THREE.Object3D, room: string): void;
  remove(object: THREE.Object3D): void;
  /** called with the newly visible rooms (load their models) */
  onReveal(listener: (rooms: Set<string>) => void): void;
  /** rooms seen from the camera now */
  visible: Set<string>;
  /** follow the camera; true when the visible set changed (redraw static shadows) */
  update(x: number, z: number): boolean;
  /** forget what was revealed: the next update reveals the visible rooms again (models changed) */
  rescan(): void;
  /** run `draw` with every room shown (a reflection probe captures its room's neighbours too) */
  withAll(draw: () => void): void;
}

export function createRoomCuller(def: ApartmentDef): RoomCuller {
  const graph = roomGraph(def);
  const objects = new Map<THREE.Object3D, string>();
  const listeners: ((rooms: Set<string>) => void)[] = [];
  const revealed = new Set<string>();
  let current = "";
  const culler: RoomCuller = {
    visible: new Set(),
    add(object, room) {
      objects.set(object, room);
      object.visible = culler.visible.has(room);
    },
    remove(object) {
      objects.delete(object);
    },
    onReveal(listener) {
      listeners.push(listener);
    },
    update(x, z) {
      const room = roomAt(def, x, z);
      if (room === current) return false;
      current = room;
      culler.visible = visibleRooms(graph, room);
      for (const [object, r] of objects) object.visible = culler.visible.has(r);
      const fresh = new Set([...culler.visible].filter((r) => !revealed.has(r)));
      for (const r of fresh) revealed.add(r);
      if (fresh.size) listeners.forEach((l) => l(fresh));
      return true;
    },
    rescan() {
      revealed.clear();
      current = "";
    },
    withAll(draw) {
      for (const object of objects.keys()) object.visible = true;
      try {
        draw();
      } finally {
        for (const [object, r] of objects) object.visible = culler.visible.has(r);
      }
    },
  };
  return culler;
}
