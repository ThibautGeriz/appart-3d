import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { loft, outline, outlinePoint } from "../models/shapes";
import { mannequin, MANNEQUIN_HEIGHT } from "../models/mannequin";
import { toilet } from "../models/toilet";
import { showerDrain, showerScreen, showerSet } from "../models/shower";
import { MODEL_FILES } from "../apartment/modelFiles";
import { modelFootprint } from "../apartment/facing";
import { allFurniture } from "../apartment/plan";
import { APARTMENT_DEF } from "../data/apartment";

/** Signed volume of a closed triangle mesh: positive when faces wind outwards. */
function signedVolume(g: THREE.BufferGeometry): number {
  const p = g.getAttribute("position");
  const index = g.getIndex();
  const count = index ? index.count : p.count;
  const at = (i: number) => new THREE.Vector3().fromBufferAttribute(p, index ? index.getX(i) : i);
  let volume = 0;
  for (let i = 0; i < count; i += 3) volume += at(i).dot(at(i + 1).cross(at(i + 2))) / 6;
  return volume;
}

function bbox(o: THREE.Object3D): THREE.Box3 {
  o.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(o);
}

describe("outline", () => {
  it("reaches the front, back and sides", () => {
    expect(outlinePoint(0, 0.2, 0.3, 0.1, 2, 6)[0]).toBeCloseTo(0.2);
    expect(outlinePoint(Math.PI / 2, 0.2, 0.3, 0.1, 2, 6)[1]).toBeCloseTo(0.3);
    expect(outlinePoint(-Math.PI / 2, 0.2, 0.3, 0.1, 2, 6)[1]).toBeCloseTo(-0.1);
  });

  it("is squarer at the back with a higher exponent", () => {
    const t = -Math.PI / 4;
    const round = outlinePoint(t, 1, 1, 1, 2, 2);
    const square = outlinePoint(t, 1, 1, 1, 2, 8);
    expect(Math.hypot(...square)).toBeGreaterThan(Math.hypot(...round));
  });
});

describe("loft", () => {
  const ring = (y: number, r: number) =>
    outline(32, r, r, r, 2, 2).map((p) => new THREE.Vector3(p.x, y, p.y));
  const cylinder = loft([ring(0, 1), ring(1, 1), ring(2, 1)]);

  it("is closed with outward faces (volume of a cylinder)", () => {
    // a 32-gon inscribed in the unit circle, 2 high
    expect(signedVolume(cylinder)).toBeCloseTo(2 * 16 * Math.sin((2 * Math.PI) / 32), 3);
  });

  it("has outward normals on the sides", () => {
    const p = cylinder.getAttribute("position");
    const n = cylinder.getAttribute("normal");
    for (let i = 0; i < 33 * 3; i++) {
      const radial = new THREE.Vector3(p.getX(i), 0, p.getZ(i));
      expect(radial.dot(new THREE.Vector3(n.getX(i), 0, n.getZ(i)))).toBeGreaterThan(0);
    }
  });
});

describe("models", () => {
  it("toilet: against the wall, inside its footprint width, seat at 40-46 cm", () => {
    const b = bbox(toilet(0.36, 0.56));
    expect(b.min.z).toBeCloseTo(-0.28, 2);
    expect(b.max.z).toBeLessThanOrEqual(0.285);
    expect(b.max.x).toBeLessThanOrEqual(0.182); // half the 36 cm width + 2 mm
    const lid = toilet(0.36, 0.56).getObjectByName("lid")!;
    expect(bbox(lid).max.y).toBeGreaterThan(0.43);
    expect(bbox(lid).max.y).toBeLessThan(0.47);
  });

  it("shower set: on the wall, rain head under 2.05 m", () => {
    const b = bbox(showerSet(0.3, 0.432));
    expect(b.min.z).toBeCloseTo(-0.216, 2);
    expect(b.max.y).toBeLessThan(2.05);
    expect(b.max.z).toBeLessThanOrEqual(0.216 + 0.001);
  });

  it("shower screen and drain fit their footprint", () => {
    const screen = bbox(showerScreen(1, 0.02, 2));
    expect(screen.max.x - screen.min.x).toBeCloseTo(1, 3);
    expect(screen.max.y).toBeCloseTo(2, 3);
    const drain = bbox(showerDrain(0.63, 0.07, 0.005));
    expect(drain.max.x - drain.min.x).toBeCloseTo(0.63, 3);
    expect(drain.max.y).toBeCloseTo(0.005, 4);
  });

  it("mannequin: 1.74 m, standing on the floor, feet pointing +z", () => {
    const m = mannequin();
    const b = bbox(m);
    expect(b.max.y).toBeCloseTo(MANNEQUIN_HEIGHT, 1);
    expect(b.min.y).toBeGreaterThanOrEqual(-0.002);
    expect(b.min.y).toBeLessThan(0.01);
    const foot = bbox(m.getObjectByName("foot_L")!);
    expect(foot.max.z).toBeGreaterThan(-foot.min.z);
    expect(bbox(m.getObjectByName("hand_L")!).min.x).toBeGreaterThan(0); // left is +x
  });
});

describe("model files", () => {
  it("every model used by the layout ships as a GLB", () => {
    const shipped = Object.keys(import.meta.glob("../../models/*.glb"));
    const used = allFurniture(APARTMENT_DEF)
      .filter((i) => i.model)
      .map((i) => MODEL_FILES[i.model!]);
    for (const file of [...used, MODEL_FILES.avatar]) {
      expect(shipped).toContain(`../../models/${file}.glb`);
    }
  });

  it("footprint width follows the facing", () => {
    expect(modelFootprint([0, 0, 2, 1], "+z")).toEqual([2, 1]);
    expect(modelFootprint([0, 0, 2, 1], "-x")).toEqual([1, 2]);
  });
});
