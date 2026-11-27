import { describe, expect, it } from "vitest";
import { drawGrout, normalizeBrightness, normalizeGray } from "../apartment/pixels";
import ourTranscoder from "../../public/basis/basis_transcoder.js?raw";
import threeTranscoder from "three/examples/jsm/libs/basis/basis_transcoder.js?raw";

const rgba = (...pixels: [number, number, number][]) =>
  new Uint8Array(pixels.flatMap(([r, g, b]) => [r, g, b, 255]));

describe("scan processing (baked into the KTX2 textures)", () => {
  it("turns a scan to gray with its mean at 0.85", () => {
    const data = rgba([120, 110, 100], [100, 90, 80]);
    normalizeGray(data);
    expect(data[0]).toBe(data[1]);
    expect(data[1]).toBe(data[2]);
    expect((data[0] + data[4]) / 2).toBeCloseTo(0.85 * 255, -1);
  });

  it("rescales the brightness and keeps the colors", () => {
    const data = rgba([200, 100, 50]);
    normalizeBrightness(data, 0.5);
    expect(0.299 * data[0] + 0.587 * data[1] + 0.114 * data[2]).toBeCloseTo(127.5, -1);
    expect(data[0] / data[2]).toBeCloseTo(4, 1);
  });

  it("draws the grout joints at the edge and in the middle", () => {
    const size = 2048; // 4 px per joint
    const data = new Uint8Array(size * size * 4).fill(255);
    drawGrout(data, size);
    const at = (x: number, y: number) => data[(y * size + x) * 4];
    expect(at(0, 500)).toBeLessThan(150); // edge column
    expect(at(1023, 500)).toBeLessThan(150); // middle column
    expect(at(1024, 500)).toBeLessThan(150);
    expect(at(500, 0)).toBeLessThan(150); // edge row
    expect(at(500, 500)).toBe(255); // inside a tile
    expect(at(1030, 500)).toBe(255);
  });
});

describe("KTX2 transcoder", () => {
  it("public/basis is three's copy (copy both files again when upgrading three)", () => {
    expect(ourTranscoder === threeTranscoder).toBe(true);
  });
});
