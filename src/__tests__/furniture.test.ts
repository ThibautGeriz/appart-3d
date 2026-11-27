import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { APARTMENT_DEF } from "../data/apartment";
import { CATALOG, product } from "../data/catalog";
import {
  bedroomLayout,
  budget,
  defaultSelection,
  fits,
  diningLayout,
  formatEuros,
  furnishingLayout,
  roomAt,
  seatsPerSide,
} from "../apartment/furnishing";
import { CHAIR_BUILDERS } from "../models/furniture/chairs";
import { segmentDistance, TABLE_BUILDERS } from "../models/furniture/tables";
import { SOFA_BUILDERS } from "../models/furniture/sofa";
import { SIDEBOARD_BUILDERS } from "../models/furniture/sideboards";
import { BEDROOM_BUILDERS } from "../models/furniture/bedroom";
import { STUDY_BUILDERS } from "../models/furniture/study";
import { liveEdge } from "../models/furniture/parts";
import { DECOR } from "../models/furniture/decor";

const BUILDERS = {
  ...CHAIR_BUILDERS,
  ...TABLE_BUILDERS,
  ...SOFA_BUILDERS,
  ...SIDEBOARD_BUILDERS,
  ...BEDROOM_BUILDERS,
  ...STUDY_BUILDERS,
};

describe("catalog models", () => {
  // "Must respect dimension": each model's bounding box is the seller's size
  for (const p of CATALOG) {
    it(`${p.id} is L ${p.w} × P ${p.d} × H ${p.h} m`, () => {
      const model = BUILDERS[p.id](p);
      model.updateMatrixWorld(true);
      // the product only: decor (books, lamps, cushions) is not part of it
      const box = new THREE.Box3();
      model.traverse((o) => {
        let decor = false;
        for (let x: THREE.Object3D | null = o; x; x = x.parent) decor ||= x.name === DECOR;
        if (!decor && o instanceof THREE.Mesh) box.expandByObject(o);
      });
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
      ...defaultSelection(APARTMENT_DEF.furnishing),
      table: "table-raia-220",
      chair: "chair-bistrot",
      coffeeTable: "coffee-dustin",
      sofa: "sofa-roma-210",
      sideboard: "sideboard-biwa",
      tvUnit: "tv-biwa",
      bed: "bed-petra",
      nightstand: "nightstand-oregon",
      shelfWindow: "shelf-borneo",
      shelfEntry: "shelf-fina",
      wallBed: "bed-consus",
      bookcase: "shelf-fina",
    });
    const rooms = budget(APARTMENT_DEF, placements);
    expect(rooms.map((r) => r.room)).toEqual(["Séjour / Cuisine", "Chambre", "Bureau"]);
    // bureau: the bed and the bookcase (the desk is already owned) + the office chair
    expect(rooms[2].total).toBeCloseTo(1578.9 + 590 + 1599, 2);
    const lines = Object.fromEntries(rooms[0].lines.map((l) => [l.product.id, l]));
    expect(lines["chair-bistrot"].quantity).toBe(6);
    expect(lines["chair-bistrot"].total).toBe(6 * 99);
    expect(rooms[0].total).toBeCloseTo(795 + 6 * 99 + 329 + 3386.46 + 489 + 359, 2);
    const bedroom = Object.fromEntries(rooms[1].lines.map((l) => [l.product.id, l]));
    expect(bedroom["nightstand-oregon"].quantity).toBe(2);
    expect(rooms[1].total).toBeCloseTo(525 + 2 * 179 + 489 + 590, 2);
  });

  it("names the room at a point", () => {
    expect(roomAt(APARTMENT_DEF, 3, 4)).toBe("Séjour / Cuisine"); // lowered band, same room
    expect(roomAt(APARTMENT_DEF, 8.5, 1)).toBe("Balcon");
  });

  it("formats euros the French way", () => {
    expect(formatEuros(1817)).toBe("1 817 €");
    expect(formatEuros(99)).toBe("99 €");
    expect(formatEuros(3386.46)).toBe("3\u202f386,46 €");
    expect(formatEuros(6780)).toBe("6\u202f780 €");
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

describe("chambre 1", () => {
  const def = APARTMENT_DEF.furnishing;
  const room: [number, number, number, number] = [11.455, 3.8, 14.25, 8.5];

  it("bed head against the east wall, a bedside table on each side", () => {
    for (const bed of CATALOG.filter((p) => p.kind === "bed")) {
      const [b, n1, n2] = bedroomLayout(def.bedroom, bed, product("nightstand-lundby"));
      expect(b.rect[2]).toBeCloseTo(14.25, 5); // headboard on the wall
      expect(b.rect[2] - b.rect[0]).toBeCloseTo(bed.d, 5); // runs west
      expect(b.rect[0]).toBeGreaterThan(room[0] + 0.4); // passage at the foot
      for (const n of [n1, n2]) {
        expect(n.rect[2]).toBeCloseTo(14.25, 5);
        // beside the bed, not overlapping it
        expect(n.rect[1] >= b.rect[3] - 1e-9 || n.rect[3] <= b.rect[1] + 1e-9).toBe(true);
        expect(n.rect[1]).toBeGreaterThan(room[1]);
        expect(n.rect[3]).toBeLessThan(7.9); // clear of the wardrobe
      }
    }
  });

  it("shelves: only the ones that fit their wall can be chosen", () => {
    const window = def.slots.find((s) => s.id === "shelfWindow")!;
    const entry = def.slots.find((s) => s.id === "shelfEntry")!;
    expect(fits(window, product("shelf-borneo"))).toBe(true);
    expect(fits(window, product("shelf-fina"))).toBe(false);
    expect(fits(entry, product("shelf-fina"))).toBe(true);
    expect(fits(entry, product("shelf-seatle"))).toBe(false);
    expect(fits(entry, product("bed-lunja"))).toBe(false); // wrong kind
  });

  it("the window shelf stays clear of the window (x 11.86 → 13.26)", () => {
    const placed = furnishingLayout(def, defaultSelection(def));
    const shelf = placed.find((p) => p.z < 4 && p.product.kind === "shelf")!;
    expect(shelf.rect[0]).toBeGreaterThanOrEqual(13.25);
    expect(shelf.rect[1]).toBeCloseTo(3.8, 5);
  });

  it("every slot's default is a product that fits it", () => {
    for (const s of def.slots) expect(fits(s, product(s.default)), s.id).toBe(true);
  });
});
