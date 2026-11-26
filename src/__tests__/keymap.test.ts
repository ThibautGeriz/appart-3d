import { describe, expect, it } from "vitest";
import { intentFromCodes, keyToAction } from "../controls/keymap";

describe("keyToAction", () => {
  it("maps physical WASD positions", () => {
    expect(keyToAction("KeyW")).toBe("forward");
    expect(keyToAction("KeyA")).toBe("left");
    expect(keyToAction("KeyS")).toBe("back");
    expect(keyToAction("KeyD")).toBe("right");
  });

  it("maps arrow keys as an alternative", () => {
    expect(keyToAction("ArrowUp")).toBe("forward");
    expect(keyToAction("ArrowDown")).toBe("back");
    expect(keyToAction("ArrowLeft")).toBe("left");
    expect(keyToAction("ArrowRight")).toBe("right");
  });

  it("maps both shifts to run", () => {
    expect(keyToAction("ShiftLeft")).toBe("run");
    expect(keyToAction("ShiftRight")).toBe("run");
  });

  it("returns undefined for unrelated keys", () => {
    expect(keyToAction("KeyE")).toBeUndefined();
    expect(keyToAction("Escape")).toBeUndefined();
  });
});

describe("intentFromCodes", () => {
  // KeyboardEvent.code is physical: on AZERTY, the key printed "Z" emits
  // code "KeyW", so holding physical WASD (printed ZQSD) produces these
  // exact codes — French layouts work with no extra remapping.
  it("builds a forward+run intent from held codes", () => {
    expect(intentFromCodes(["KeyW", "ShiftLeft"])).toEqual({ forward: 1, strafe: 0, run: true });
  });

  it("combines opposing keys to a neutral intent", () => {
    expect(intentFromCodes(["KeyW", "KeyS"])).toEqual({ forward: 0, strafe: 0, run: false });
  });

  it("ignores unrelated keys", () => {
    expect(intentFromCodes(["Space", "KeyD"])).toEqual({ forward: 0, strafe: 1, run: false });
  });

  it("produces an idle intent for no keys", () => {
    expect(intentFromCodes([])).toEqual({ forward: 0, strafe: 0, run: false });
  });
});
