import { describe, expect, it } from "vitest";
import type { ApartmentDef, WallDef } from "../data/apartment";
import { APARTMENT_DEF } from "../data/apartment";
import {
  dimensionChains,
  formatCm,
  splitAtOpenings,
  subtractIntervals,
} from "../apartment/dimensionLines";

/** 4 m × 3 m room, 20 cm walls on their center lines, a door in the south wall. */
function room(extra: WallDef[] = []): ApartmentDef {
  const t = 0.2;
  const walls: WallDef[] = [
    { from: [-0.1, -0.1], to: [4.1, -0.1], thickness: t },
    {
      from: [-0.1, 3.1],
      to: [4.1, 3.1],
      thickness: t,
      openings: [{ at: 1.1, width: 0.8, sill: 0, head: 2.04 }],
    },
    { from: [-0.1, -0.2], to: [-0.1, 3.2], thickness: t },
    { from: [4.1, -0.2], to: [4.1, 3.2], thickness: t },
    ...extra,
  ];
  return {
    ...APARTMENT_DEF,
    walls,
    areas: [{ label: "Pièce", rect: [0, 0, 4, 3], floorColor: "#fff" }],
  };
}

const round = (v: number) => Math.round(v * 1000) / 1000;

describe("dimension chains", () => {
  it("formats centimeters", () => {
    expect(formatCm(0.8)).toBe("80");
    expect(formatCm(3.695)).toBe("370");
  });

  it("removes hidden parts from a span", () => {
    expect(
      subtractIntervals({ min: 0, max: 10 }, [
        { min: 4, max: 5 },
        { min: -1, max: 1 },
      ]),
    ).toEqual([
      { min: 1, max: 4 },
      { min: 5, max: 10 },
    ]);
  });

  it("splits a span at the opening jambs", () => {
    expect(splitAtOpenings({ min: 0, max: 4 }, [{ min: 1, max: 1.8 }])).toEqual([
      { min: 0, max: 1, opening: false },
      { min: 1, max: 1.8, opening: true },
      { min: 1.8, max: 4, opening: false },
    ]);
  });

  it("measures the interior faces only, between the walls cutting them", () => {
    const chains = dimensionChains(room());
    // Façades (nothing outside is an area): one interior face per wall
    expect(chains).toHaveLength(4);
    const north = chains.find((c) => c.axis === "x" && round(c.plane) === 0)!;
    expect(north.normal).toBe(1);
    expect([round(north.span.min), round(north.span.max)]).toEqual([0, 4]);
    const south = chains.find((c) => c.axis === "x" && round(c.plane) === 3)!;
    expect(south.segments.map((s) => [round(s.min), round(s.max), s.opening])).toEqual([
      [0, 1, false],
      [1, 1.8, true],
      [1.8, 4, false],
    ]);
    const west = chains.find((c) => c.axis === "z" && round(c.plane) === 0)!;
    expect([round(west.span.min), round(west.span.max)]).toEqual([0, 3]);
  });

  it("cuts a face where a partition abuts it", () => {
    const partition: WallDef = { from: [2, 0], to: [2, 3], thickness: 0.1 };
    const north = dimensionChains(room([partition])).filter(
      (c) => c.axis === "x" && round(c.plane) === 0,
    );
    expect(north.map((c) => [round(c.span.min), round(c.span.max)])).toEqual([
      [0, 1.95],
      [2.05, 4],
    ]);
  });

  it("merges collinear wall segments into one face", () => {
    const def = room();
    const [north] = def.walls;
    def.walls[0] = { ...north, to: [2, -0.1] };
    def.walls.push({ ...north, from: [2, -0.1] });
    const chains = dimensionChains(def).filter((c) => c.axis === "x" && round(c.plane) === 0);
    expect(chains.map((c) => [round(c.span.min), round(c.span.max)])).toEqual([[0, 4]]);
  });

  it("builds chains for the real apartment", () => {
    const chains = dimensionChains(APARTMENT_DEF);
    expect(chains.length).toBeGreaterThan(10);
    for (const chain of chains) {
      expect(chain.segments[0].min).toBeCloseTo(chain.span.min);
      expect(chain.segments[chain.segments.length - 1].max).toBeCloseTo(chain.span.max);
    }
  });
});
