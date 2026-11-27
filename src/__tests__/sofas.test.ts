import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CATALOG, productsOf } from "../data/catalog";
import { APARTMENT_DEF } from "../data/apartment";
import { SOFA_BUILDERS } from "../models/furniture/sofa";
import { productSpecs } from "../ui/furniturePanel";

const albatros = CATALOG.find((p) => p.id === "sofa-albatros-222")!;

describe("sofas", () => {
  it("Albatros 222: the price tag's element 350 (L.222 × H.95 × P.112 cm)", () => {
    expect([albatros.w, albatros.h, albatros.d]).toEqual([2.22, 0.95, 1.12]);
    expect(albatros.price).toBe(3115);
    expect(albatros.seatFoamDensity).toBe(30);
    expect(albatros.madeIn).toBeUndefined(); // not published by the seller
  });

  it("every sofa has a seat foam density, a builder and a living-room layout", () => {
    for (const p of productsOf("sofa")) {
      expect(p.seatFoamDensity, p.id).toBeGreaterThan(0);
      expect(SOFA_BUILDERS[p.id], p.id).toBeDefined();
      expect(APARTMENT_DEF.furnishing.living[p.id], p.id).toBeDefined();
    }
  });

  it("Albatros model: 4 legs on the floor, height from the backs", () => {
    const g = SOFA_BUILDERS[albatros.id](albatros);
    const box = new THREE.Box3().setFromObject(g, true);
    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.y).toBeCloseTo(0.95, 2);
    const legs = g.children.filter(
      (o) => o instanceof THREE.Mesh && (o.material as THREE.Material).name === "titanium dark",
    );
    expect(legs).toHaveLength(4);
  });

  it("shows origin and foam density for sofas only", () => {
    expect(productSpecs(albatros)).toBe("Fabrication : non communiquée · assise 30 kg/m³");
    const roma = CATALOG.find((p) => p.id === "sofa-roma-210")!;
    expect(productSpecs(roma)).toBe("Fabrication : Italie · assise 30 kg/m³");
    expect(productSpecs(CATALOG.find((p) => p.kind === "table")!)).toBe("");
  });
});
