import { describe, expect, it } from "vitest";
import { BoxGeometry, PlaneGeometry } from "three";
import { applyWorldUVs } from "../apartment/uv";

function uvs(geometry: BoxGeometry | PlaneGeometry): number[][] {
  const uv = geometry.getAttribute("uv");
  return Array.from({ length: uv.count }, (_, i) => [uv.getX(i), uv.getY(i)]);
}

describe("world UVs", () => {
  it("maps a floor in meters, independent of its size", () => {
    const floor = new PlaneGeometry(4, 2);
    floor.rotateX(-Math.PI / 2);
    floor.translate(2, 0, 1); // x ∈ [0, 4], z ∈ [0, 2]
    applyWorldUVs(floor, [1.2, 1.2]);
    const us = uvs(floor).map(([u]) => u);
    expect(Math.min(...us)).toBeCloseTo(0);
    expect(Math.max(...us)).toBeCloseTo(4 / 1.2);
  });

  it("starts the pattern at the given origin (cabinet doors line up)", () => {
    // a 1.8 m long cabinet front along z, starting at z = 0.6, 0.1 m above the floor
    const cabinet = new BoxGeometry(0.6, 0.76, 1.8);
    cabinet.translate(0.3, 0.1 + 0.38, 0.6 + 0.9);
    applyWorldUVs(cabinet, [0.6, 0.76], [0, 0.1, 0.6]);
    const normal = cabinet.getAttribute("normal");
    const front = uvs(cabinet).filter((_, i) => normal.getX(i) > 0.5);
    expect(Math.min(...front.map(([u]) => u))).toBeCloseTo(0);
    expect(Math.max(...front.map(([u]) => u))).toBeCloseTo(3); // 3 doors
    expect(Math.min(...front.map(([, v]) => v))).toBeCloseTo(0);
    expect(Math.max(...front.map(([, v]) => v))).toBeCloseTo(1); // one door high
  });
});
