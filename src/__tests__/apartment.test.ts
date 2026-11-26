import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import { apartmentBounds, findGapsAlongZ, wallCollider } from "../apartment/plan";
import { resolveCircle } from "../player/movement";

const colliders = [
  ...APARTMENT_DEF.walls.map(wallCollider),
  ...APARTMENT_DEF.furniture
    .filter((f) => f.solid !== false)
    .map((f) => ({
      minX: f.x - f.w / 2,
      maxX: f.x + f.w / 2,
      minZ: f.z - f.d / 2,
      maxZ: f.z + f.d / 2,
    })),
];

describe("apartment layout", () => {
  it("stays within the declared bounds", () => {
    const bounds = apartmentBounds(APARTMENT_DEF);
    for (const c of colliders) {
      expect(c.minX).toBeGreaterThanOrEqual(bounds.minX - 1e-9);
      expect(c.maxX).toBeLessThanOrEqual(bounds.maxX + 1e-9);
      expect(c.minZ).toBeGreaterThanOrEqual(bounds.minZ - 1e-9);
      expect(c.maxZ).toBeLessThanOrEqual(bounds.maxZ + 1e-9);
    }
  });

  it("has at least two walkable doorways (≥ 0.9 m) in the interior wall row", () => {
    // probe z inside the wall row (walls centered on z = 0.5, thickness 0.2)
    const doors = findGapsAlongZ(colliders, 0.5);
    const walkable = doors.filter((g) => g.max - g.min >= 0.9);
    expect(walkable.length).toBeGreaterThanOrEqual(2);
  });

  it("does not place furniture inside doorways", () => {
    for (const gap of findGapsAlongZ(colliders, 0.5)) {
      for (const f of APARTMENT_DEF.furniture) {
        const overlaps =
          f.x - f.w / 2 < gap.max && f.x + f.w / 2 > gap.min && Math.abs(f.z - 0.5) < 0.7;
        expect(overlaps).toBe(false);
      }
    }
  });

  it("spawns the player clear of all colliders", () => {
    const spawn = APARTMENT_DEF.spawn;
    const resolved = resolveCircle({ x: spawn.x, z: spawn.z }, colliders, 0.3);
    expect(resolved.x).toBeCloseTo(spawn.x);
    expect(resolved.z).toBeCloseTo(spawn.z);
  });
});
