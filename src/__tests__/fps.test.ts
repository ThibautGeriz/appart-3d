import { describe, expect, it } from "vitest";
import { FpsMeter, fpsLevel, fpsText } from "../ui/fps";

describe("FPS counter", () => {
  it("reads once per half second, then starts a new window", () => {
    const meter = new FpsMeter();
    // 0.125 s frames add up exactly: 8 frames = 1 s = two windows
    const readings = Array.from({ length: 8 }, () => meter.tick(0.125)).filter((r) => r);
    expect(readings).toHaveLength(2);
    expect(readings[0]!.fps).toBe(8);
  });

  it("averages the frames of a window", () => {
    const meter = new FpsMeter();
    let reading = null;
    while (!reading) reading = meter.tick(1 / 60);
    expect(reading.fps).toBeCloseTo(60, 0);
    expect(reading.ms).toBeCloseTo(16.7, 1);
  });

  it("rates frame rates against the budget (60 target, 30 floor)", () => {
    expect(fpsLevel(60)).toBe("good");
    expect(fpsLevel(45)).toBe("ok");
    expect(fpsLevel(24)).toBe("low");
  });

  it("formats the French way", () => {
    expect(fpsText({ fps: 59.6, ms: 16.78, level: "good" })).toBe("60 FPS · 16,8 ms");
  });
});
