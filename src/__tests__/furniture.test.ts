import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { APARTMENT_DEF } from "../data/apartment";
import { CATALOG, product } from "../data/catalog";
import {
  budget,
  diningLayout,
  formatEuros,
  furnishingLayout,
  roomAt,
  seatsPerSide,
} from "../apartment/furnishing";
import { CHAIR_BUILDERS } from "../models/furniture/chairs";
import { segmentDistance, TABLE_BUILDERS } from "../models/furniture/tables";
import { liveEdge } from "../models/furniture/parts";

const BUILDERS = { ...CHAIR_BUILDERS, ...TABLE_BUILDERS };

describe("catalog models", () => {
  // "Must respect dimension": each model's bounding box is the seller's size
  for (const p of CATALOG) {
    it(`${p.id} is L ${p.w} × P ${p.d} × H ${p.h} m`, () => {
      const model = BUILDERS[p.id](p);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      expect(size.x).toBeCloseTo(p.w, 1);
      expect(size.z).toBeCloseTo(p.d, 1);
      expect(size.y).toBeCloseTo(p.h, 2);
      expect(Math.abs(size.x - p.w)).toBeLessThan(0.012);
      expect(Math.abs(size.z - p.d)).toBeLessThan(0.012);
      expect(box.min.y).toBeGreaterThan(-0.005); // standing on the floor
      expect(box.min.y).toBeLessThan(0.03);
    });
  }

  it("every product has a builder and a price", () => {
    for (const p of CATALOG) {
      expect(BUILDERS[p.id], p.id).toBeDefined();
      expect(p.price).toBeGreaterThanOrEqual(0); // 0 = no price from the seller
    }
  });
});

describe("dining layout", () => {
  const def = APARTMENT_DEF.furnishing.dining;
  const table = product("table-valmo-220");
  const chair = product("chair-norway");
  const placed = diningLayout(def, table, chair);
  const chairs = placed.filter((p) => p.product.kind === "chair");

  it("puts the table end against the wall, between the windows", () => {
    const [minX, minZ, maxX, maxZ] = placed[0].rect;
    expect(minZ).toBeCloseTo(def.gap, 5);
    expect(maxZ - minZ).toBeCloseTo(table.w, 5); // runs into the room (+z)
    expect(maxX - minX).toBeCloseTo(table.d, 5);
    // north wall pier between the windows: x 2.16 → 4.20
    expect((minX + maxX) / 2).toBeCloseTo(3.18, 5);
  });

  it("seats 6 at most: 3 per side, none at the ends", () => {
    expect(seatsPerSide(1.8)).toBe(3);
    expect(seatsPerSide(2.2)).toBe(3);
    expect(seatsPerSide(3.0)).toBe(5);
    expect(chairs).toHaveLength(6);
    expect(chairs.filter((c) => Math.abs(c.x - 3.18) < 1e-6)).toHaveLength(0);
    for (const t of CATALOG.filter((p) => p.kind === "table")) {
      expect(diningLayout(def, t, chair).filter((p) => p.product.kind === "chair")).toHaveLength(6);
    }
  });

  it("adds the far-end chair only when the limit allows it", () => {
    const seven = diningLayout({ ...def, maxChairs: 7 }, table, chair);
    const head = seven.filter((p) => p.product.kind === "chair" && Math.abs(p.x - 3.18) < 1e-6);
    expect(head).toHaveLength(1);
    expect(head[0].z).toBeCloseTo(def.gap + table.w, 5);
    const front = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      head[0].rotationY,
    );
    expect(front.z).toBeCloseTo(-1, 5); // facing the table
  });

  it("has the chairs half under the table, facing it", () => {
    for (const c of chairs.filter((c) => Math.abs(c.x - 3.18) > 1e-6)) {
      expect(Math.abs(c.x - 3.18)).toBeCloseTo(table.d / 2, 5); // centered on the edge
      // front (+z local) turned towards the table centre
      const front = new THREE.Vector3(0, 0, 1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        c.rotationY,
      );
      expect(front.x * (3.18 - c.x)).toBeGreaterThan(0);
    }
  });

  it("chairs on one side do not overlap", () => {
    const west = chairs.filter((c) => c.x < 3.18 - 1e-6).sort((a, b) => a.z - b.z);
    for (let i = 1; i < west.length; i++)
      expect(west[i].rect[1]).toBeGreaterThan(west[i - 1].rect[3]);
  });

  it("the table length runs along the model's +x", () => {
    const along = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      placed[0].rotationY,
    );
    expect(along.z).toBeCloseTo(1, 5);
  });
});

describe("budget", () => {
  it("prices the selection by room: chairs times their count", () => {
    const placements = furnishingLayout(APARTMENT_DEF.furnishing, {
      table: "table-raia-220",
      chair: "chair-bistrot",
      coffeeTable: "coffee-dustin",
    });
    const rooms = budget(APARTMENT_DEF, placements);
    expect(rooms.map((r) => r.room)).toEqual(["Séjour / Cuisine"]);
    const lines = Object.fromEntries(rooms[0].lines.map((l) => [l.product.id, l]));
    expect(lines["chair-bistrot"].quantity).toBe(6);
    expect(lines["chair-bistrot"].total).toBe(6 * 99);
    expect(rooms[0].total).toBe(795 + 6 * 99 + 329);
  });

  it("names the room at a point", () => {
    expect(roomAt(APARTMENT_DEF, 3, 4)).toBe("Séjour / Cuisine"); // lowered band, same room
    expect(roomAt(APARTMENT_DEF, 8.5, 1)).toBe("Balcon");
  });

  it("formats euros the French way", () => {
    expect(formatEuros(1817)).toBe("1 817 €");
    expect(formatEuros(99)).toBe("99 €");
  });
});

describe("shapes", () => {
  it("live edge stays inside the slab", () => {
    for (const p of liveEdge(2.2, -0.5, 0.5, 0.05, 3)) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1.1 + 1e-9);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(0.5 + 1e-9);
    }
  });

  it("segment distance", () => {
    expect(segmentDistance([0, 0], [1, 0], [0, 1], [1, 1])).toBeCloseTo(1);
    expect(segmentDistance([0, 0], [1, 1], [0, 1], [1, 0])).toBe(0); // crossing
  });
});
