import { describe, expect, it } from "vitest";
import { intentFromCodes, keyToAction, mouseMode, turnFromCodes } from "../controls/keymap";

describe("keyToAction (World of Warcraft layout)", () => {
  it("maps W/S to forward/back and A/D to turning", () => {
    expect(keyToAction("KeyW")).toBe("forward");
    expect(keyToAction("KeyS")).toBe("back");
    expect(keyToAction("KeyA")).toBe("turnLeft");
    expect(keyToAction("KeyD")).toBe("turnRight");
  });

  it("maps Q/E to strafing", () => {
    expect(keyToAction("KeyQ")).toBe("strafeLeft");
    expect(keyToAction("KeyE")).toBe("strafeRight");
  });

  it("maps the arrows like W/S/A/D", () => {
    expect(keyToAction("ArrowUp")).toBe("forward");
    expect(keyToAction("ArrowDown")).toBe("back");
    expect(keyToAction("ArrowLeft")).toBe("turnLeft");
    expect(keyToAction("ArrowRight")).toBe("turnRight");
  });

  it("maps both shifts to run and ignores unrelated keys", () => {
    expect(keyToAction("ShiftLeft")).toBe("run");
    expect(keyToAction("ShiftRight")).toBe("run");
    expect(keyToAction("KeyR")).toBeUndefined();
    expect(keyToAction("Escape")).toBeUndefined();
  });
});

describe("intentFromCodes", () => {
  // KeyboardEvent.code is physical: on AZERTY the keys printed Z/Q/S/D emit
  // KeyW/KeyA/KeyS/KeyD and A/E emit KeyQ/KeyE, so French players get
  // ZQSD + A/E strafing with no remapping, as in the French WoW client.
  it("walks forward and runs", () => {
    expect(intentFromCodes(["KeyW", "ShiftLeft"])).toEqual({ forward: 1, strafe: 0, run: true });
  });

  it("does not move sideways on the turn keys", () => {
    expect(intentFromCodes(["KeyA"])).toEqual({ forward: 0, strafe: 0, run: false });
  });

  it("strafes with Q/E", () => {
    expect(intentFromCodes(["KeyQ"]).strafe).toBe(-1);
    expect(intentFromCodes(["KeyE"]).strafe).toBe(1);
  });

  it("strafes with A/D while the right mouse button is held (mouselook)", () => {
    expect(intentFromCodes(["KeyA"], true).strafe).toBe(-1);
    expect(intentFromCodes(["KeyD", "KeyE"], true).strafe).toBe(1); // clamped
  });

  it("combines opposing keys to a neutral intent", () => {
    expect(intentFromCodes(["KeyW", "KeyS"])).toEqual({ forward: 0, strafe: 0, run: false });
    expect(intentFromCodes([])).toEqual({ forward: 0, strafe: 0, run: false });
  });
});

describe("turnFromCodes", () => {
  it("turns left with A / ←, right with D / →", () => {
    expect(turnFromCodes(["KeyA"])).toBe(1);
    expect(turnFromCodes(["ArrowRight"])).toBe(-1);
    expect(turnFromCodes(["KeyA", "KeyD"])).toBe(0);
  });

  it("does not turn in mouselook (the keys strafe instead)", () => {
    expect(turnFromCodes(["KeyA"], true)).toBe(0);
  });
});

describe("mouseMode", () => {
  it("left drag looks, right drag is mouselook, both buttons walk forward", () => {
    expect(mouseMode(1)).toEqual({ looking: true, mouselook: false, forward: false });
    expect(mouseMode(2)).toEqual({ looking: true, mouselook: true, forward: false });
    expect(mouseMode(3)).toEqual({ looking: true, mouselook: true, forward: true });
    expect(mouseMode(0)).toEqual({ looking: false, mouselook: false, forward: false });
  });
});
