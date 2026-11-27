import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { APARTMENT_DEF } from "../data/apartment";
import { CATALOG, product } from "../data/catalog";
import { sofaLayout } from "../apartment/furnishing";
import { buildColliders } from "../apartment/plan";
import { ease } from "../apartment/furniture";
import { mergeSliding, SOFA_BUILDERS } from "../models/furniture/sofa";
import { DECOR } from "../models/furniture/decor";

const sliding = CATALOG.filter((p) => p.sofa?.backTravel);
const names = (o: THREE.Object3D) => {
  const out: string[] = [];
  o.traverse((x) => /^sofa-back-[xz]/.test(x.name) && out.push(x.name));
  return out;
};

describe("sliding sofa backs (dossiers avance-recule)", () => {
  it("the Roma and the Albatros slide, not the BoConcept Bolzano", () => {
    expect(sliding.map((p) => p.id).sort()).toEqual([
      "sofa-albatros-222",
      "sofa-roma-210",
      "sofa-roma-corner",
    ]);
    expect(product("sofa-roma-210").sofa!.backTravel).toBeCloseTo(0.18); // 104 → 122 cm
    expect(product("sofa-albatros-222").sofa!.backTravel).toBeCloseTo(0.13); // 112 → 125 cm
  });

  it("their models name every back cushion (the long side along z, a return along x)", () => {
    expect(
      names(SOFA_BUILDERS["sofa-roma-210"](product("sofa-roma-210"))).filter((n) =>
        n.endsWith("z"),
      ),
    ).toHaveLength(3); // two back cushions + the throw cushions' holder
    const corner = names(SOFA_BUILDERS["sofa-roma-corner"](product("sofa-roma-corner")));
    expect(corner.some((n) => n.endsWith("x"))).toBe(true);
    expect(
      names(SOFA_BUILDERS["sofa-albatros-222"](product("sofa-albatros-222"))).length,
    ).toBeGreaterThan(0);
  });

  it("the throw cushions slide with the backs", () => {
    for (const id of ["sofa-roma-210", "sofa-roma-corner", "sofa-albatros-222"]) {
      const cushions: THREE.Object3D[] = [];
      SOFA_BUILDERS[id](product(id)).traverse(
        (o) => o.name === DECOR && o instanceof THREE.Mesh && cushions.push(o),
      );
      expect(cushions.length, id).toBeGreaterThan(0);
      for (const c of cushions) expect(c.parent!.name, id).toMatch(/^sofa-back-z/);
    }
  });

  it("the export merges them per material, same size, backs still apart", () => {
    for (const id of ["sofa-roma-210", "sofa-roma-corner", "sofa-albatros-222"]) {
      const g = SOFA_BUILDERS[id](product(id));
      const merged = mergeSliding(g);
      const size = (o: THREE.Object3D) =>
        new THREE.Box3().setFromObject(o, true).getSize(new THREE.Vector3());
      expect(size(merged).distanceTo(size(g)), id).toBeLessThan(1e-6);
      let meshes = 0;
      merged.traverse((o) => o instanceof THREE.Mesh && meshes++);
      expect(meshes, id).toBeLessThanOrEqual(12);
      expect(merged.getObjectByName("sofa-back-z"), id).toBeDefined();
      expect(merged.getObjectByName("sofa-back-z")!.getObjectByName(DECOR), id).toBeDefined();
    }
  });

  it("the exported GLBs keep them as their own nodes", async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
    for (const p of sliding) {
      const doc = await io.read(`models/${p.id}.glb`);
      const nodes = doc
        .getRoot()
        .listNodes()
        .map((n) => n.getName());
      expect(nodes.filter((n) => /^sofa-back-[xz]/.test(n)).length, p.id).toBeGreaterThan(0);
    }
  });

  it("there is room behind each to slide all the way (the gap to the wall)", () => {
    const walls = buildColliders(APARTMENT_DEF);
    for (const [id, living] of Object.entries(APARTMENT_DEF.furnishing.living)) {
      const p = product(id);
      const travel = p.sofa?.backTravel;
      if (!travel) continue;
      const placed = sofaLayout(living, p);
      // the sofa's back side: opposite its facing
      const back = { "+z": [0, -1], "-z": [0, 1], "+x": [-1, 0], "-x": [1, 0] }[living.sofa.facing];
      const [x0, z0, x1, z1] = placed.rect;
      const edge = back[1] < 0 ? z0 : back[1] > 0 ? z1 : back[0] < 0 ? x0 : x1;
      // nearest wall behind, across the sofa's width
      let gap = Infinity;
      for (const c of walls) {
        if (back[0] === 0) {
          const overlaps = c.maxX > x0 + 0.05 && c.minX < x1 - 0.05;
          const d = back[1] < 0 ? edge - c.maxZ : c.minZ - edge;
          if (overlaps && d >= -1e-6) gap = Math.min(gap, d);
        } else {
          const overlaps = c.maxZ > z0 + 0.05 && c.minZ < z1 - 0.05;
          const d = back[0] < 0 ? edge - c.maxX : c.minX - edge;
          if (overlaps && d >= -1e-6) gap = Math.min(gap, d);
        }
      }
      expect(gap, id).toBeGreaterThanOrEqual(travel - 1e-6);
    }
  });

  it("slides smoothly", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5);
    expect(ease(0.1)).toBeLessThan(0.1);
  });
});
