import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { inspectModel } from "../viewer/inspect";
import { modelSources } from "../viewer/sources";
import { CATALOG } from "../data/catalog";

describe("inspectModel", () => {
  it("measures the bounding box in cm and lists shared materials once", () => {
    const material = new THREE.MeshPhongMaterial({ color: "#ff0000", shininess: 30 });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.5), material));
    const second = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), material);
    second.position.y = 0.45; // pokes 2.5 cm above the first box
    g.add(second);
    const report = inspectModel(g);
    expect(report.size).toEqual({ w: 60, d: 50, h: 92.5 });
    expect(report.materials).toHaveLength(1);
    expect(report.materials[0]).toMatchObject({ color: "#ff0000", shininess: 30, meshes: 2 });
  });
});

describe("modelSources", () => {
  const sources = modelSources();

  it("lists every catalog product with its page and size", () => {
    for (const p of CATALOG) {
      const s = sources.find((m) => m.file === p.id);
      expect(s?.url).toBe(p.url);
      expect(s?.expected.w).toBeCloseTo(p.w * 100, 1);
    }
  });

  it("lists the layout props at their footprint, sink with its Franke page", () => {
    const sink = sources.find((m) => m.file === "kitchen-sink");
    expect(sink?.url).toContain("franke.com");
    const washer = sources.find((m) => m.file === "washing-machine");
    expect(washer?.expected.h).toBe(85);
    expect(sources.some((m) => m.file === "avatar")).toBe(false);
  });

  it("has unique files", () => {
    expect(new Set(sources.map((m) => m.file)).size).toBe(sources.length);
  });
});

describe("inspectModel on rotated parts", () => {
  it("measures the real extent, not the rotated local box", () => {
    const g = new THREE.Group();
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 32));
    leg.rotation.y = Math.PI / 4; // a round leg turned 45° is still 20 cm wide
    g.add(leg);
    expect(inspectModel(g).size.w).toBeCloseTo(20, 0);
  });
});
