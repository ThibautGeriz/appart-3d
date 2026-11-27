import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import { CATALOG } from "../data/catalog";
import { DETAILS } from "../data/catalogDetails";
import {
  catalogRows,
  facetCounts,
  filterRows,
  filters,
  modelSource,
  positionOf,
  priceAt,
  priceBounds,
  priceOf,
  sellerOf,
  SORT_KEYS,
  sortRows,
  sortValue,
} from "../catalog/rows";
import { CHAIR_BUILDERS } from "../models/furniture/chairs";
import { TABLE_BUILDERS } from "../models/furniture/tables";
import { SOFA_BUILDERS } from "../models/furniture/sofa";
import { SIDEBOARD_BUILDERS } from "../models/furniture/sideboards";
import { BEDROOM_BUILDERS } from "../models/furniture/bedroom";
import { STUDY_BUILDERS } from "../models/furniture/study";

const rows = catalogRows(APARTMENT_DEF.furnishing);
const names = (list: typeof rows) => list.map((r) => r.product.id);

describe("catalog details (sellers' pages)", () => {
  it("every product has its details, from at least one page", () => {
    for (const p of CATALOG) {
      const d = DETAILS[p.id];
      expect(d, p.id).toBeDefined();
      expect(d.seller, p.id).not.toBe("");
      expect(d.sources.length, p.id).toBeGreaterThan(0);
      for (const s of d.sources) expect(s.url, p.id).toMatch(/^https:\/\//);
    }
  });

  it("has no details for products that are not in the catalog", () => {
    const ids = new Set(CATALOG.map((p) => p.id));
    for (const id of Object.keys(DETAILS)) expect(ids.has(id), id).toBe(true);
  });

  it("keeps the figures plausible (kg/m³, Martindale cycles, kg, years)", () => {
    for (const p of CATALOG.filter((x) => x.seatFoamDensity !== undefined)) {
      expect(p.seatFoamDensity, p.id).toBeGreaterThan(10);
      expect(p.seatFoamDensity, p.id).toBeLessThan(80);
    }
    for (const [id, d] of Object.entries(DETAILS)) {
      if (d.martindale !== null) expect(d.martindale, id).toBeGreaterThan(5000);
      if (d.weightKg !== null) expect(d.weightKg, id).toBeLessThan(300);
      if (d.warrantyYears !== null) expect(d.warrantyYears, id).toBeLessThanOrEqual(30);
    }
  });
});

describe("catalog page rows", () => {
  it("lists where each product can go", () => {
    const olivia = rows.find((r) => r.product.id === "chair-olivia")!;
    expect(olivia.places).toEqual(["Séjour / Cuisine · Chaises"]);
    expect(olivia.kind).toBe("chaise");
  });

  it("counts the floor of an L-shaped sofa part by part", () => {
    const corner = rows.find((r) => r.product.id === "sofa-roma-corner")!;
    expect(corner.footprint).toBeCloseTo(3.12 * 1.04 + 1.04 * 0.93, 2);
  });

  it("sorts by size, both ways", () => {
    expect(names(sortRows(rows, "width", false))[0]).toBe("sofa-roma-corner");
    const narrowest = sortRows(rows, "width", true)[0];
    expect(narrowest.product.w).toBe(Math.min(...CATALOG.map((p) => p.w)));
    const tallest = sortRows(rows, "height", false)[0];
    expect(tallest.product.h).toBe(Math.max(...CATALOG.map((p) => p.h)));
  });

  it("lists unknown values last, whatever the direction", () => {
    for (const ascending of [true, false]) {
      const sorted = sortRows(rows, "density", ascending);
      const known = sorted.filter((r) => sortValue(r, "density") !== null);
      expect(known.length).toBeGreaterThan(0);
      expect(names(sorted.slice(0, known.length))).toEqual(names(known));
      const values = known.map((r) => sortValue(r, "density") as number);
      expect(values).toEqual([...values].sort((a, b) => (ascending ? a - b : b - a)));
    }
  });

  it("does not rank an owned product by price (nothing to pay)", () => {
    const sorted = sortRows(rows, "price", true);
    expect(sorted.at(-1)!.product.owned || !sorted.at(-1)!.product.price).toBe(true);
  });

  it("has a value for every sort key", () => {
    for (const { key } of SORT_KEYS) {
      expect(
        rows.some((r) => sortValue(r, key) !== null),
        key,
      ).toBe(true);
    }
  });

  it("filters by type and by text, accents aside", () => {
    expect(filterRows(rows, filters({ kinds: new Set(["chair"]) }))).toHaveLength(5);
    expect(names(filterRows(rows, filters({ search: "italie" }))).sort()).toEqual([
      "sofa-roma-210",
      "sofa-roma-corner",
    ]);
    const oak = filterRows(rows, filters({ search: "chene" }));
    expect(oak.length).toBeGreaterThan(3);
    expect(filterRows(rows, filters({ kinds: new Set(["sofa"]), search: "chene" }))).toHaveLength(
      0,
    );
  });

  it("filters by seller", () => {
    const shown = filterRows(rows, filters({ sellers: new Set(["Mobilier de France"]) }));
    expect(names(shown).sort()).toEqual(["sofa-roma-210", "sofa-roma-corner"]);
    const two = filterRows(
      rows,
      filters({ sellers: new Set(["Mobilier de France", "BoConcept"]) }),
    );
    expect(two).toHaveLength(3);
  });

  it("filters by price range, inclusive; a range leaves out the unpriced and owned", () => {
    const [lo, hi] = priceBounds(rows);
    expect(lo).toBe(Math.floor(Math.min(...rows.map(priceOf).filter((p) => p !== null))));
    expect(filterRows(rows, filters({ price: null }))).toHaveLength(rows.length);
    const all = filterRows(rows, filters({ price: [lo, hi] }));
    expect(all.length).toBe(rows.filter((r) => priceOf(r) !== null).length);
    expect(all.length).toBeLessThan(rows.length);
    const mid = filterRows(rows, filters({ price: [500, 1000] }));
    expect(mid.length).toBeGreaterThan(0);
    for (const r of mid) expect(r.product.price).toBeGreaterThanOrEqual(500);
    for (const r of mid) expect(r.product.price).toBeLessThanOrEqual(1000);
    expect(names(filterRows(rows, filters({ price: [6780, 6780] })))).toEqual(["sofa-roma-corner"]);
  });

  it("counts each facet given the others, every value listed", () => {
    const sellers = new Set(rows.map(sellerOf));
    const all = facetCounts(rows, filters(), "sellers");
    expect(new Set(all.keys())).toEqual(sellers);
    expect([...all.values()].reduce((a, b) => a + b, 0)).toBe(rows.length);
    // sofas only: the sofa sellers keep their count, the others drop to 0
    const sofas = facetCounts(rows, filters({ kinds: new Set(["sofa"]) }), "sellers");
    expect(sofas.size).toBe(sellers.size);
    expect(sofas.get("Mobilier de France")).toBe(2);
    expect(sofas.get("FlexiSpot")).toBe(0);
    // a facet's own selection does not narrow its counts (you can tick a second type)
    const kinds = facetCounts(rows, filters({ kinds: new Set(["sofa"]) }), "kinds");
    expect(kinds.get("chair")).toBe(5);
  });

  it("maps the price slider on a log scale, both ways", () => {
    const b = priceBounds(rows);
    expect(priceAt(0, b)).toBe(b[0]);
    expect(priceAt(1, b)).toBe(b[1]);
    // the middle of the track is the geometric mean (~ 660 €), not 3 400 €
    expect(priceAt(0.5, b)).toBe(Math.round(Math.sqrt(b[0] * b[1])));
    for (const price of [100, 795, 3386]) {
      expect(priceAt(positionOf(price, b), b)).toBeCloseTo(price, -1);
    }
  });

  it("points each model to the file that builds it", () => {
    const files: Record<string, Record<string, unknown>> = {
      "src/models/furniture/chairs.ts": CHAIR_BUILDERS,
      "src/models/furniture/tables.ts": TABLE_BUILDERS,
      "src/models/furniture/sofa.ts": SOFA_BUILDERS,
      "src/models/furniture/sideboards.ts": SIDEBOARD_BUILDERS,
      "src/models/furniture/bedroom.ts": BEDROOM_BUILDERS,
      "src/models/furniture/study.ts": STUDY_BUILDERS,
    };
    for (const p of CATALOG) expect(files[modelSource(p)]?.[p.id], p.id).toBeDefined();
  });
});
