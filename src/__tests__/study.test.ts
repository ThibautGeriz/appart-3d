import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { APARTMENT_DEF } from "../data/apartment";
import { product, productsOf } from "../data/catalog";
import {
  coffeeTableLayout,
  defaultSelection,
  fits,
  furnishingLayout,
  slot,
  wallBedOpenRect,
} from "../apartment/furnishing";
import { apartmentBounds, buildColliders, rectCollider } from "../apartment/plan";
import { easeInOut, poseWallBed, stepOpening, WALL_BED_DURATION } from "../apartment/wallBed";
import { wallBed, wallBedGeometry } from "../models/furniture/study";
import { buildNavGrid, findPath } from "../player/navigation";

const { study } = APARTMENT_DEF.furnishing;
/** chambre 2 inner faces (bedroom drawing: 326 × 351 cm) */
const WEST = 8.135;
const EAST = 11.41;
const NORTH = 3.8;

const bedAt = (id: string) => coffeeTableLayout(study.wallBed, product(id));
const desk = coffeeTableLayout(study.desk, product("desk-flexispot-solid-wood"));

describe("chambre 2 layout (bedroom drawing)", () => {
  it("puts the wall bed against the west wall, centred on its 1.55 m zone", () => {
    for (const p of productsOf("wallBed")) {
      const bed = bedAt(p.id);
      expect(bed.rect[0]).toBeCloseTo(WEST); // back against the wall
      expect(bed.rect[2] - bed.rect[0]).toBeCloseTo(p.d); // depth into the room
      // zone: 1.00 m from the window wall, 1.55 m wide
      expect((bed.rect[1] + bed.rect[3]) / 2).toBeCloseTo(NORTH + 1.0 + 1.55 / 2);
    }
    // the Lenart Consus fits the zone, the Beganio is 2 cm wider on each side
    const consus = bedAt("bed-consus").rect;
    expect(consus[1]).toBeGreaterThanOrEqual(NORTH + 1.0);
    expect(consus[3]).toBeLessThanOrEqual(NORTH + 2.55);
  });

  it("puts the desk (120 × 60) on the east wall, 15 cm from the window wall", () => {
    expect(desk.rect).toEqual(
      [EAST - 0.6, NORTH + 0.15, EAST, NORTH + 1.35].map((v) => expect.closeTo(v, 5)),
    );
  });

  it("counts the desk as already owned (nothing to pay)", () => {
    const p = product("desk-flexispot-solid-wood");
    expect(p.owned).toBe(true);
    expect(p.price).toBe(0);
    expect(productsOf("desk")).toHaveLength(1); // not switchable
  });

  it("opens each bed to its open depth, clear of the desk", () => {
    for (const p of productsOf("wallBed")) {
      const open = wallBedOpenRect(bedAt(p.id))!;
      expect(open[0]).toBeCloseTo(WEST + p.d); // from the cabinet front
      expect(open[2]).toBeCloseTo(WEST + p.wallBed!.openDepth); // to the foot of the bed
      expect(desk.rect[0] - open[2], p.id).toBeGreaterThan(0.25); // room to walk to the desk
    }
  });

  it("puts the bookcase on the east wall, ending 11 cm from the door wall", () => {
    const bookcaseSlot = slot(APARTMENT_DEF.furnishing, "bookcase");
    for (const p of productsOf("shelf").filter((x) => fits(bookcaseSlot, x))) {
      const b = coffeeTableLayout(study.bookcase, p);
      expect(b.rect[2]).toBeCloseTo(EAST); // back against the wall
      expect(b.rect[3]).toBeCloseTo(7.3 - 0.11);
      expect(b.rect[1], p.id).toBeGreaterThanOrEqual(7.19 - 1.5 - 1e-6); // within its 150 cm zone
      expect(b.rect[1] - desk.rect[3], p.id).toBeGreaterThan(0.3); // clear of the desk
    }
    // too wide for the 150 cm zone: listed but not selectable
    expect(fits(bookcaseSlot, product("shelf-seatle"))).toBe(false);
  });

  it("keeps the desk reachable from the door with the bed open", () => {
    const placements = furnishingLayout(
      APARTMENT_DEF.furnishing,
      defaultSelection(APARTMENT_DEF.furnishing),
    );
    const colliders = [
      ...buildColliders(APARTMENT_DEF),
      ...placements.flatMap((p) => (p.rects ?? [p.rect]).map(rectCollider)),
      rectCollider(wallBedOpenRect(bedAt("bed-beganio"))!),
    ];
    const grid = buildNavGrid(colliders, apartmentBounds(APARTMENT_DEF), 0.25);
    expect(findPath(grid, { x: 9.36, z: 7.0 }, { x: 10.6, z: 4.6 })).not.toBeNull();
  });
});

describe("wall bed mechanism", () => {
  it("fits the folding part inside the cabinet when closed", () => {
    for (const p of productsOf("wallBed")) {
      const geo = wallBedGeometry(p);
      expect(geo.frontFromWall - geo.thickness, p.id).toBeGreaterThan(0.01);
      expect(geo.frontFromWall, p.id).toBeLessThanOrEqual(p.d);
      expect(geo.frontFromWall, p.id).toBeGreaterThan(p.d - 0.04); // front ~flush
      expect(geo.closedBottom + geo.length, p.id).toBeLessThan(p.h);
    }
  });

  it("folds down to the open depth, mattress on top, at sleeping height", () => {
    for (const p of productsOf("wallBed")) {
      const model = wallBed(p);
      poseWallBed(model, 1);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      // model frame: back against the wall at z = -d/2
      expect(box.max.z + p.d / 2, p.id).toBeCloseTo(p.wallBed!.openDepth, 2);
      const geo = wallBedGeometry(p);
      const fold = model.getObjectByName("fold")!;
      const foldBox = new THREE.Box3().setFromObject(fold);
      expect(foldBox.max.y, p.id).toBeCloseTo(geo.undersideHeight + geo.thickness, 1); // ~38 cm
      expect(foldBox.min.y, p.id).toBeGreaterThanOrEqual(-0.001); // feet on the floor, not below
      expect(foldBox.min.y, p.id).toBeLessThan(0.005);
      // head end inside the cabinet
      expect(foldBox.min.z + p.d / 2, p.id).toBeLessThan(p.d);
    }
  });

  it("swings clear of the floor and the cabinet top while opening", () => {
    for (const p of productsOf("wallBed")) {
      const model = wallBed(p);
      const fold = model.getObjectByName("fold")!;
      for (let t = 0; t <= 1; t += 0.05) {
        poseWallBed(model, t);
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(fold, true);
        expect(box.min.y, `${p.id} t=${t}`).toBeGreaterThan(-0.02);
        expect(box.max.y, `${p.id} t=${t}`).toBeLessThan(p.h - 0.019);
      }
    }
  });

  it("stays within the cabinet when closed", () => {
    const p = product("bed-consus");
    const model = wallBed(p);
    poseWallBed(model, 0);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    expect(box.max.z).toBeLessThanOrEqual(p.d / 2 + 1e-6);
    expect(box.max.y).toBeLessThanOrEqual(p.h + 1e-6);
  });

  it("animates over WALL_BED_DURATION with a gentle start and end", () => {
    let t = 0;
    let frames = 0;
    while (t < 1 && frames < 1000) {
      t = stepOpening(t, true, 1 / 60);
      frames++;
    }
    expect(frames / 60).toBeCloseTo(WALL_BED_DURATION, 1);
    expect(stepOpening(1, false, 1 / 60)).toBeLessThan(1);
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.1)).toBeLessThan(0.1); // slow start
  });
});
