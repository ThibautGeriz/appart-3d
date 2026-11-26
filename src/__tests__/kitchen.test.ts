import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import { expandKitchen, moduleSpans, runLength } from "../apartment/kitchen";

const kitchen = APARTMENT_DEF.kitchen;

describe("kitchen", () => {
  it("fills the whole west wall of the séjour", () => {
    expect(runLength(kitchen)).toBeCloseTo(Math.abs(kitchen.endZ - kitchen.startZ));
  });

  it("lays modules out contiguously from left to right", () => {
    const spans = moduleSpans(kitchen);
    expect(spans[0].z1).toBeCloseTo(kitchen.startZ);
    expect(spans[spans.length - 1].z0).toBeCloseTo(kitchen.endZ);
    for (let i = 1; i < spans.length; i++) {
      expect(spans[i].z1).toBeCloseTo(spans[i - 1].z0);
    }
  });

  it("stacks drawer fronts to the full carcass height", () => {
    for (const module of kitchen.modules) {
      if (module.kind !== "drawers") continue;
      const total = module.fronts.reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(kitchen.height - kitchen.plinth, 2);
    }
  });

  it("puts the hob over the oven and the sink over plain doors", () => {
    const spans = moduleSpans(kitchen);
    const over = (range: [number, number]) =>
      spans.filter(({ z0, z1 }) => z0 < range[1] && z1 > range[0]).map((s) => s.module.kind);
    expect(over(kitchen.hob)).toEqual(["oven"]);
    expect(new Set(over(kitchen.sink))).toEqual(new Set(["door"]));
  });

  it("has no fridge or tall unit", () => {
    const items = expandKitchen(kitchen);
    const wallCabinetBottom = kitchen.wallCabinets.bottom;
    for (const item of items) {
      const y = item.y ?? 0;
      if (y < wallCabinetBottom - 0.1) {
        expect(y + item.h, item.name).toBeLessThan(1.3);
      }
    }
  });

  it("gives every door and drawer front a handle", () => {
    const items = expandKitchen(kitchen);
    const fronts = items.filter((i) => i.name === "Porte" || i.name === "Tiroir");
    const handles = items.filter((i) => i.name.endsWith("(poignée)") && !i.name.startsWith("Four"));
    expect(fronts.length).toBe(4 + 3 + 3);
    expect(handles.length).toBe(fronts.length);
  });
});
