import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import baked from "../assets/lightmap/lightmap.json";
import {
  bakeScene,
  boxFace,
  boxLightmapUVs,
  lightmapAtlas,
  NEUTRAL,
  occluders,
  packAtlas,
  type Face,
} from "../lighting/lightmap";
import { bake } from "../lighting/bake";
import { probeRooms } from "../lighting/probes";
import { curtainPlan, dressingPlan, outletBoxes, sideIndoors } from "../apartment/dressing";
import { decorLayout, defaultSelection, furnishingLayout } from "../apartment/furnishing";
import type { Box } from "../apartment/plan";

const def = APARTMENT_DEF;

describe("lightmap layout", () => {
  const atlas = lightmapAtlas(def);

  it("the committed bake matches the layout (else: npm run bake:lightmap)", () => {
    expect(baked.signature).toBe(atlas.signature);
    expect([baked.width, baked.height]).toEqual([atlas.width, atlas.height]);
  });

  it("is deterministic and fits one texture", () => {
    expect(lightmapAtlas(def).signature).toBe(atlas.signature);
    expect(atlas.width).toBeLessThanOrEqual(2048);
    expect(atlas.height).toBeLessThanOrEqual(2048);
    expect(atlas.byKey.has(NEUTRAL.key)).toBe(true);
  });

  it("charts never overlap", () => {
    const taken = new Uint8Array(atlas.width * atlas.height);
    let overlaps = 0;
    for (const c of atlas.charts) {
      for (let j = -1; j <= c.nv; j++)
        for (let i = -1; i <= c.nu; i++) {
          const k = (c.y + j) * atlas.width + c.x + i;
          overlaps += taken[k];
          taken[k] = 1;
        }
    }
    expect(overlaps).toBe(0);
  });

  it("maps a floor point to its own chart", () => {
    const area = def.areas[0];
    const [x0, z0, x1, z1] = area.rect;
    const slab: Box = { minX: x0, maxX: x1, minZ: z0, maxZ: z1, minY: -0.1, maxY: 0 };
    const chart = atlas.byKey.get(boxFace(slab, 1, 1, [0, 0, 0]).key)!;
    expect(chart).toBeDefined();
    const uv = boxLightmapUVs(atlas, slab, [x0, 0, z0, x1, 0, z1], [0, 1, 0, 0, 1, 0]);
    expect(uv[0] * atlas.width).toBeCloseTo(chart.x, 3);
    expect(uv[1] * atlas.height).toBeCloseTo(chart.y, 3);
    expect(uv[2] * atlas.width).toBeCloseTo(chart.x + (x1 - x0) / 0.06, 2);
  });

  it("the walls, floors and ceilings all receive", () => {
    const scene = bakeScene(def);
    const floors = def.areas.length;
    const ceilings = def.areas.filter((a) => !a.outdoor).length;
    const up = scene.faces.filter((f) => f.axis === 1 && f.sign > 0 && f.plane === 0);
    expect(up.length).toBeGreaterThanOrEqual(floors);
    expect(
      scene.faces.filter((f) => f.axis === 1 && f.sign < 0 && f.plane === def.wallHeight).length,
    ).toBe(ceilings);
  });
});

describe("baker", () => {
  // an open floor, and a 1 m cube standing on it
  const floor: Face = {
    key: "f",
    axis: 1,
    sign: 1,
    plane: 0,
    u0: 0,
    u1: 3,
    v0: 0,
    v1: 3,
    albedo: [0.5, 0.5, 0.5],
  };
  const atlas = packAtlas([floor], 0.25, 64);
  const cube: Box = { minX: 1, maxX: 2, minY: 0, maxY: 1, minZ: 1, maxZ: 2 };
  const floorBox: Box = { minX: 0, maxX: 3, minY: -0.1, maxY: 0, minZ: 0, maxZ: 3 };
  const occ = occluders(
    {
      faces: [floor],
      occluders: [
        { box: floorBox, faces: [null, null, null, floor, null, null] },
        { box: cube, faces: [null, null, null, null, null, null] },
      ],
    },
    atlas,
  );
  const light = bake(atlas, occ, { rays: 256, bounces: 1, ground: 0 });
  const at = (x: number, z: number) => {
    const c = atlas.charts[0];
    const i = Math.floor(x / 0.25);
    const j = Math.floor(z / 0.25);
    return light[(c.offset + j * c.nu + i) * 3];
  };

  it("an open floor gets the full sky (1)", () => {
    expect(at(0.1, 0.1)).toBeGreaterThan(0.7);
    expect(at(0.1, 0.1)).toBeLessThan(1.05);
  });

  it("is darker right next to the cube, and black under it", () => {
    expect(at(0.9, 1.5)).toBeLessThan(at(0.1, 1.5));
    expect(at(1.5, 1.5)).toBeLessThan(0.05);
  });
});

describe("reflection probes", () => {
  it("one per indoor room, at 1.4 m inside it", () => {
    const rooms = probeRooms(def);
    expect(rooms.has("Balcon")).toBe(false);
    for (const [, r] of rooms) {
      expect(r.position[1]).toBeCloseTo(1.4);
      expect(r.position[0]).toBeGreaterThan(r.min[0]);
      expect(r.position[2]).toBeLessThan(r.max[2]);
    }
  });
});

describe("set dressing", () => {
  const plan = dressingPlan(def);

  it("no skirting across a door opening", () => {
    for (const wall of def.walls) {
      for (const o of wall.openings ?? []) {
        if (o.sill > 0) continue;
        const alongX = wall.from[1] === wall.to[1];
        const start = alongX
          ? Math.min(wall.from[0], wall.to[0])
          : Math.min(wall.from[1], wall.to[1]);
        const [a, b] = [start + o.at + 0.01, start + o.at + o.width - 0.01];
        const c = alongX ? wall.from[1] : wall.from[0];
        for (const s of plan.filter((d) => d.kind === "skirting")) {
          const [lo, hi] = alongX ? [s.box.minX, s.box.maxX] : [s.box.minZ, s.box.maxZ];
          const [n0, n1] = alongX ? [s.box.minZ, s.box.maxZ] : [s.box.minX, s.box.maxX];
          const onWall = Math.abs((n0 + n1) / 2 - c) < wall.thickness;
          if (onWall) expect(hi <= a || lo >= b).toBe(true);
        }
      }
    }
  });

  it("curtains and sills only indoors (none on the balcony side)", () => {
    for (const c of curtainPlan(def)) {
      expect(sideIndoors(def, c.wall, c.side, (c.a + c.b) / 2)).toBe(true);
    }
    const balcony = def.areas.find((a) => a.outdoor)!.rect;
    for (const d of plan.filter((p) => p.kind === "sill" || p.kind === "rod")) {
      const x = (d.box.minX + d.box.maxX) / 2;
      const z = (d.box.minZ + d.box.maxZ) / 2;
      const outside = x > balcony[0] && x < balcony[2] && z > balcony[1] && z < balcony[3];
      expect(outside).toBe(false);
    }
  });

  it("a switch beside every door, at 1.05 m", () => {
    const doors = def.walls.flatMap((w) =>
      (w.openings ?? []).filter((o) => o.sill === 0 && !o.glass),
    );
    const plates = plan.filter((d) => d.kind === "plate");
    expect(plates.length).toBeGreaterThanOrEqual(doors.length);
    for (const p of plates) expect((p.box.minY + p.box.maxY) / 2).toBeCloseTo(1.05, 5);
  });

  it("the plan's sockets stand on a wall face, inside their room", () => {
    const boxes = outletBoxes(def.outlets);
    expect(boxes.filter((b) => b.kind === "plate")).toHaveLength(def.outlets.length);
    for (const o of def.outlets) {
      const inside = def.areas.some(
        ({ rect: [x0, z0, x1, z1] }) =>
          o.at[0] >= x0 - 0.01 &&
          o.at[0] <= x1 + 0.01 &&
          o.at[1] >= z0 - 0.01 &&
          o.at[1] <= z1 + 0.01,
      );
      expect(inside, JSON.stringify(o)).toBe(true);
    }
  });
});

describe("decor", () => {
  it("a rug under the coffee table and the bed, a plant clear of the furniture", () => {
    for (const sofa of ["sofa-roma-corner", "sofa-roma-210"]) {
      const selection = { ...defaultSelection(def.furnishing), sofa };
      const placed = furnishingLayout(def.furnishing, selection);
      const decor = decorLayout(def.furnishing, selection, placed);
      const coffee = placed.find((p) => p.product.kind === "coffeeTable")!;
      const rug = decor.find((d) => d.file === "decor-rug-living")!;
      expect([rug.x, rug.z]).toEqual([coffee.x, coffee.z]);
      expect(decor.some((d) => d.file === "decor-rug-bedroom")).toBe(true);
      const plant = decor.find((d) => d.file === "decor-plant")!.rect!;
      for (const p of placed) {
        for (const r of p.rects ?? [p.rect]) {
          const overlap = plant[0] < r[2] && plant[2] > r[0] && plant[1] < r[3] && plant[3] > r[1];
          expect(overlap, `${sofa}: plant vs ${p.product.id}`).toBe(false);
        }
      }
    }
  });
});
