import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import { ceilingAt } from "../apartment/plan";
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
