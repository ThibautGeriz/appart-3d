import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import { expandKitchen, moduleSpans, runLength } from "../apartment/kitchen";
import { bowlSpans, KUBUS_2_KNG_120 } from "../data/sink";

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
    expect(over(kitchen.sink)).toEqual(["door", "door"]); // wide sink over two doors
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

describe("kitchen sink (Franke Kubus 2.0 KNG 120)", () => {
  const items = expandKitchen(kitchen);
  const sink = items.find((i) => i.model === "kitchenSink")!;
  const tap = items.find((i) => i.model === "kitchenTap")!;
  const center = (r: number[]) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];

  it("is 76 × 46 cm and the tap is centred on it", () => {
    expect(sink.rect[3] - sink.rect[1]).toBeCloseTo(KUBUS_2_KNG_120.length, 5);
    expect(sink.rect[2] - sink.rect[0]).toBeCloseTo(KUBUS_2_KNG_120.width, 5);
    expect(center(tap.rect)[1]).toBeCloseTo(center(sink.rect)[1], 5);
    // the tap stands on the worktop behind the sink
    expect(tap.rect[0]).toBeLessThan(sink.rect[0]);
  });

  it("leaves the worktop open over the two bowls only", () => {
    const worktop = items.filter((i) => i.name === "Plan de travail");
    const covered = (x: number, z: number) =>
      worktop.some(({ rect: [x0, z0, x1, z1] }) => x > x0 && x < x1 && z > z0 && z < z1);
    const [sx] = center(sink.rect);
    const spans = bowlSpans(KUBUS_2_KNG_120);
    const sz = center(sink.rect)[1];
    for (const [a, b] of spans) expect(covered(sx, sz - (a + b) / 2)).toBe(false); // bowl centres
    expect(covered(sx, sz - (spans[0][1] + spans[1][0]) / 2)).toBe(true); // bridge between bowls
    expect(covered(sx, kitchen.sink[0] - 0.05)).toBe(true);
    // one stone pattern across all pieces
    expect(new Set(worktop.map((w) => JSON.stringify(w.uvOrigin))).size).toBe(1);
  });

  it("bowls and rims add up to the sink length", () => {
    const spans = bowlSpans(KUBUS_2_KNG_120);
    expect(spans[0][1] - spans[0][0]).toBeCloseTo(0.464, 5);
    expect(spans[1][1] - spans[1][0]).toBeCloseTo(0.214, 5);
    const rim = spans[0][0] + KUBUS_2_KNG_120.length / 2;
    expect(spans[1][0] - spans[0][1]).toBeCloseTo(rim, 5);
    expect(KUBUS_2_KNG_120.length / 2 - spans[1][1]).toBeCloseTo(rim, 5);
  });
});
