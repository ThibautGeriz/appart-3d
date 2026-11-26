import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import { ceilingAt, roomRectsAt } from "../apartment/plan";
import { maskRects } from "../lighting/roomMask";
import { facingVector, lightPosition, nearestLights } from "../lighting/fixtures";

describe("light fixtures", () => {
  it("reads ceiling heights from the plan, lowered ceilings included", () => {
    expect(ceilingAt(APARTMENT_DEF, 3.5, 2)).toBe(2.5); // séjour
    expect(ceilingAt(APARTMENT_DEF, 1.8, 5.5)).toBe(2.15); // cellier (HSFP)
    expect(ceilingAt(APARTMENT_DEF, 8, 7.9)).toBe(2.15); // dégagement (HSFP)
    expect(ceilingAt(APARTMENT_DEF, 6.3, 6.6)).toBe(2.2); // WC (HSFP)
  });

  it("hangs ceiling lights under the local ceiling", () => {
    const cellier = APARTMENT_DEF.lights.find((l) => l.kind === "ceiling" && l.z > 5 && l.x < 3);
    expect(cellier).toBeDefined();
    const [, y] = lightPosition(APARTMENT_DEF, cellier!);
    expect(y).toBeLessThan(2.15);
  });

  it("puts every light point inside the apartment", () => {
    for (const light of APARTMENT_DEF.lights) {
      const inside = APARTMENT_DEF.areas.some(
        ({ rect }) =>
          light.x >= rect[0] - 0.1 &&
          light.x <= rect[2] + 0.1 &&
          light.z >= rect[1] - 0.1 &&
          light.z <= rect[3] + 0.1,
      );
      expect(inside, JSON.stringify(light)).toBe(true);
    }
  });

  it("matches the plan: 9 ceiling points, 2 wall lights, plus the kitchen extras", () => {
    const byKind = (kind: string) => APARTMENT_DEF.lights.filter((l) => l.kind === kind);
    expect(byKind("ceiling")).toHaveLength(9);
    expect(byKind("strip")).toHaveLength(1); // under the kitchen wall cabinets
    const sconces = byKind("sconce");
    expect(sconces).toHaveLength(3); // SdB mirror, balcony, kitchen sink
  });

  it("maps facings to unit vectors", () => {
    expect(facingVector("+x")).toEqual([1, 0]);
    expect(facingVector("-z")).toEqual([0, -1]);
  });

  it("picks the nearest fixtures first", () => {
    const positions: [number, number, number][] = [
      [0, 2, 0],
      [5, 2, 5],
      [1, 2, 1],
    ];
    expect(nearestLights(positions, 0.2, 0.2, 2)).toEqual([0, 2]);
  });
});

describe("room mask", () => {
  it("groups open areas into one room (séjour + its lowered band)", () => {
    expect(roomRectsAt(APARTMENT_DEF, 3, 2)).toHaveLength(2);
    expect(roomRectsAt(APARTMENT_DEF, 6.5, 5)).toHaveLength(1); // SdB
  });

  it("keeps the bathroom light out of the séjour", () => {
    const sdb = APARTMENT_DEF.lights.find(
      (l) => l.kind === "ceiling" && l.x > 6 && l.x < 6.5 && l.z < 5,
    );
    const [x, , z] = lightPosition(APARTMENT_DEF, sdb!);
    const rects = roomRectsAt(APARTMENT_DEF, x, z);
    const inside = (px: number, pz: number) =>
      rects.some(
        ([a, b, c, d]) => px >= a - 0.05 && px <= c + 0.05 && pz >= b - 0.05 && pz <= d + 0.05,
      );
    expect(inside(6.5, 5)).toBe(true); // bathroom floor
    expect(inside(6.5, 3.6)).toBe(false); // séjour floor behind wall D
    expect(inside(6.5, 3.695)).toBe(false); // séjour face of wall D
  });

  it("finds the right room for wall lights sitting on a boundary", () => {
    for (const light of APARTMENT_DEF.lights) {
      const [x, , z] = lightPosition(APARTMENT_DEF, light);
      expect(ceilingAt(APARTMENT_DEF, x, z)).toBeGreaterThan(2);
      expect(
        APARTMENT_DEF.areas.some(
          ({ rect }) => x >= rect[0] && x <= rect[2] && z >= rect[1] && z <= rect[3],
        ),
      ).toBe(true);
    }
  });

  it("rejects rooms with too many areas and pads short ones", () => {
    expect(maskRects([[0, 0, 1, 1]])).toHaveLength(2);
    expect(() =>
      maskRects([
        [0, 0, 1, 1],
        [1, 0, 2, 1],
        [2, 0, 3, 1],
      ]),
    ).toThrow();
  });
});
