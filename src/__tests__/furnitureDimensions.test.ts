import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import { furnishingLayout } from "../apartment/furnishing";
import { furnitureCotes } from "../apartment/furnitureDimensions";
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
