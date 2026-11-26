import { describe, expect, it } from "vitest";
import { APARTMENT_DEF, type WallDef } from "../data/apartment";
import { apartmentBounds, buildColliders, findGaps, wallPieces } from "../apartment/plan";
import type { Collider } from "../player/movement";

const colliders = buildColliders(APARTMENT_DEF);
const PLAYER_RADIUS = 0.3;

function wallAt(from: [number, number], to: [number, number]): WallDef {
  const wall = APARTMENT_DEF.walls.find(
    (w) => w.from[0] === from[0] && w.from[1] === from[1] && w.to[0] === to[0] && w.to[1] === to[1],
  );
  if (!wall) throw new Error(`no wall ${from} → ${to}`);
  return wall;
}

/** Horizontal lengths of the full-height parts and the openings of a wall, in order. */
function wallRun(wall: WallDef): number[] {
  const pieces = wallPieces(wall, APARTMENT_DEF.wallHeight);
  const fullHeight = pieces.solid.filter(
    (p) => p.minY === 0 && p.maxY === APARTMENT_DEF.wallHeight,
  );
  const alongX = wall.from[1] === wall.to[1];
  return [...fullHeight, ...pieces.openings]
    .sort((a, b) => (alongX ? a.minX - b.minX : a.minZ - b.minZ))
    .map((p) => Math.round((alongX ? p.maxX - p.minX : p.maxZ - p.minZ) * 1000) / 1000);
}

function circleHits(x: number, z: number, c: Collider): boolean {
  const dx = x - Math.max(c.minX, Math.min(x, c.maxX));
  const dz = z - Math.max(c.minZ, Math.min(z, c.maxZ));
  return dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS;
}

/** Grid flood fill of where the player can stand, starting at the spawn. */
function reachableFromSpawn(step = 0.05): (x: number, z: number) => boolean {
  const b = apartmentBounds(APARTMENT_DEF);
  const cols = Math.ceil((b.maxX - b.minX) / step) + 1;
  const rows = Math.ceil((b.maxZ - b.minZ) / step) + 1;
  const toIndex = (x: number, z: number) =>
    Math.round((z - b.minZ) / step) * cols + Math.round((x - b.minX) / step);
  const free = (i: number) => {
    const x = b.minX + (i % cols) * step;
    const z = b.minZ + Math.floor(i / cols) * step;
    return !colliders.some((c) => circleHits(x, z, c));
  };
  const seen = new Uint8Array(cols * rows);
  const queue = [toIndex(APARTMENT_DEF.spawn.x, APARTMENT_DEF.spawn.z)];
  seen[queue[0]] = 1;
  while (queue.length > 0) {
    const i = queue.pop() as number;
    const col = i % cols;
    const neighbors = [col > 0 ? i - 1 : -1, col < cols - 1 ? i + 1 : -1, i - cols, i + cols];
    for (const n of neighbors) {
      if (n < 0 || n >= seen.length || seen[n]) continue;
      seen[n] = 1;
      if (free(n)) queue.push(n);
      else seen[n] = 2;
    }
  }
  return (x, z) => seen[toIndex(x, z)] === 1;
}

describe("apartment layout", () => {
  it("matches the séjour measurements (A, B, C along the north façade)", () => {
    expect(wallRun(wallAt([0, -0.125], [7.45, -0.125]))).toEqual([0.7, 1.46, 2.04, 1.46, 1.79]);
  });

  it("matches the séjour measurements (1, 2, 3 along the balcony wall)", () => {
    // 2 = the sliding door, split into a fixed and an open leaf
    expect(wallRun(wallAt([7.59, 0], [7.59, 3.695]))).toEqual([0.9, 0.89, 0.89, 1.015]);
  });

  it("matches the séjour measurement D", () => {
    expect(wallRun(wallAt([5.12, 3.7475], [7.45, 3.7475]))).toEqual([2.33]);
  });

  it("puts every window 20 cm above the floor", () => {
    const glazed = APARTMENT_DEF.walls.flatMap((w) => w.openings ?? []).filter((o) => o.glass);
    expect(glazed.length).toBeGreaterThan(0);
    for (const opening of glazed) {
      expect([0, 0.2]).toContain(opening.sill);
    }
    const windows = glazed.filter((o) => o.sill > 0);
    expect(windows.length).toBe(3);
  });

  it("rejects openings that overflow their wall", () => {
    const wall: WallDef = {
      from: [0, 0],
      to: [1, 0],
      thickness: 0.1,
      openings: [{ at: 0.5, width: 0.8, sill: 0, head: 2 }],
    };
    expect(() => wallPieces(wall, 2.5)).toThrow();
  });

  it("finds the front door in the south façade", () => {
    const doors = findGaps(colliders, "x", 8.595);
    expect(doors.some((g) => g.max - g.min >= 0.8)).toBe(true);
  });

  it("spawns the player clear of all colliders", () => {
    const { x, z } = APARTMENT_DEF.spawn;
    expect(colliders.some((c) => circleHits(x, z, c))).toBe(false);
  });

  it("can walk from the front door into every room", () => {
    const reachable = reachableFromSpawn();
    const probes: Record<string, [number, number]> = {
      "Séjour / Cuisine": [3.5, 2],
      Balcon: [8.7, 1.5],
      Cellier: [1.8, 5.5],
      SdB: [6.5, 5.2],
      WC: [6.3, 6.9],
      Dégagement: [8, 7.9],
      "Chambre 2": [9.8, 5.5],
      "Chambre 1": [12.8, 4.5],
    };
    for (const [room, [x, z]] of Object.entries(probes)) {
      expect(reachable(x, z), room).toBe(true);
    }
  });

  it("keeps furniture inside the apartment footprint", () => {
    const b = apartmentBounds(APARTMENT_DEF);
    for (const { name, rect } of APARTMENT_DEF.furniture) {
      expect(rect[0], name).toBeGreaterThanOrEqual(b.minX - 0.1);
      expect(rect[1], name).toBeGreaterThanOrEqual(b.minZ - 0.1);
      expect(rect[2], name).toBeLessThanOrEqual(b.maxX + 0.1);
      expect(rect[3], name).toBeLessThanOrEqual(b.maxZ + 0.1);
    }
  });
});
