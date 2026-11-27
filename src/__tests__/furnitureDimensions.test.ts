import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import { furnishingLayout } from "../apartment/furnishing";
import { clearances, fixedObstacles, furnitureCotes } from "../apartment/furnitureDimensions";
import { CATALOG } from "../data/catalog";
import type { Placement } from "../apartment/furnishing";

const bolzano = CATALOG.find((p) => p.id === "sofa-bolzano-214")!;
const at = (rotationY: number): Placement => ({
  product: bolzano,
  x: 5,
  z: 2,
  rotationY,
  rect: [0, 0, 0, 0],
});
const length = ([a, b]: [number[], number[]]) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

describe("furniture dimension lines", () => {
  it("draws width, depth and height at the product's size, each with two ticks", () => {
    const { segments, tags } = furnitureCotes([at(0)]);
    expect(segments).toHaveLength(9); // 3 lines + 2 ticks each
    const [width, , , depth, , , height] = segments.map(length);
    expect(width).toBeCloseTo(2.14, 5);
    expect(depth).toBeCloseTo(0.91, 5);
    expect(height).toBeCloseTo(0.76, 5);
    expect(tags).toEqual([
      { text: "Bolzano 214\nL 214 × P 91 × H 76 cm", position: [5, 0.76 + 0.18, 2] },
    ]);
  });

  it("puts the width line in front of the piece, whichever way it faces", () => {
    // rotated half a turn: its front faces -z, so the width line is behind z
    const [[a]] = furnitureCotes([at(Math.PI)]).segments;
    expect(a[2]).toBeCloseTo(2 - 0.91 / 2 - 0.06, 5);
    const [[b]] = furnitureCotes([at(0)]).segments;
    expect(b[2]).toBeCloseTo(2 + 0.91 / 2 + 0.06, 5);
  });

  it("tags identical pieces once (the dining chairs)", () => {
    const placements = furnishingLayout(APARTMENT_DEF.furnishing, {
      ...Object.fromEntries(APARTMENT_DEF.furnishing.slots.map((s) => [s.id, s.default])),
    } as Parameters<typeof furnishingLayout>[1]);
    const { segments, tags } = furnitureCotes(placements);
    const products = new Set(placements.map((p) => p.product.id));
    expect(tags).toHaveLength(products.size);
    expect(segments).toHaveLength(9 * placements.length);
    expect(placements.length).toBeGreaterThan(products.size); // chairs repeat
  });
});

describe("clearances", () => {
  const piece = (id: string, kind: string, rect: [number, number, number, number]): Placement =>
    ({
      product: { ...bolzano, id, kind },
      x: 0,
      z: 0,
      rotationY: 0,
      rect,
    }) as Placement;

  it("measures each side to the nearest wall facing it", () => {
    const sofa = piece("s", "sofa", [0, 0, 2, 1]);
    const wall: [number, number, number, number] = [2.43, -1, 2.6, 3]; // 43 cm to its right
    const list = clearances([sofa], [wall]);
    expect(list).toHaveLength(1);
    expect(list[0].gap).toBeCloseTo(0.43, 5);
    expect(list[0].from).toEqual([2, 0.5]);
    expect(list[0].to[0]).toBeCloseTo(2.43, 5);
  });

  it("skips pieces against the wall, far walls, and walls that do not face it", () => {
    const sofa = piece("s", "sofa", [0, 0, 2, 1]);
    const against: [number, number, number, number] = [2.004, 0, 2.2, 1];
    const far: [number, number, number, number] = [-3, 0, -2.5, 1]; // 2.5 m to its left
    const aside: [number, number, number, number] = [0, 2.5, 2, 2.7]; // 1.5 m behind… too far
    const offAxis: [number, number, number, number] = [3, 3, 4, 4];
    expect(clearances([sofa], [against, far, aside, offAxis])).toEqual([]);
  });

  it("draws one line between two pieces, none inside a dining set", () => {
    const sofa = piece("s", "sofa", [0, 0, 2, 1]);
    const table = piece("t", "coffeeTable", [0.5, 1.43, 1.5, 2.13]);
    const between = clearances([sofa, table], []).filter((c) => Math.abs(c.gap - 0.43) < 1e-6);
    expect(between).toHaveLength(1);
    const dining = piece("d", "table", [5, 0, 6.8, 0.9]);
    const chair = piece("c", "chair", [5.2, 0.95, 5.7, 1.45]);
    expect(clearances([dining, chair], [])).toEqual([]);
  });

  it("the Roma 210 layout: coffee table 43 cm in front of the sofa", () => {
    const selection = Object.fromEntries(
      APARTMENT_DEF.furnishing.slots.map((s) => [s.id, s.default]),
    ) as Parameters<typeof furnishingLayout>[1];
    const placements = furnishingLayout(APARTMENT_DEF.furnishing, {
      ...selection,
      sofa: "sofa-roma-210",
    });
    const list = clearances(placements, fixedObstacles(APARTMENT_DEF));
    const sofa = placements.find((p) => p.product.id === "sofa-roma-210")!;
    const [, minZ] = sofa.rect;
    const front = list.find((c) => Math.abs(c.from[1] - minZ) < 1e-6 && c.to[1] < c.from[1]);
    expect(front?.gap).toBeCloseTo(0.43, 2);
  });
});
