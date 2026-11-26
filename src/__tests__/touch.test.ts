import { describe, expect, it } from "vitest";
import { joystickIntent, onJoystick } from "../controls/touch";

describe("touch joystick", () => {
  it("maps the thumb offset to forward / strafe", () => {
    expect(joystickIntent(0, -48, 48)).toEqual({ forward: 1, strafe: 0 });
    expect(joystickIntent(24, 0, 48).strafe).toBeCloseTo(0.5);
  });

  it("clamps the thumb to the ring", () => {
    const intent = joystickIntent(0, 200, 48);
    expect(intent.forward).toBeCloseTo(-1);
  });

  it("is idle at rest", () => {
    const intent = joystickIntent(0, 0, 48);
    expect(Math.abs(intent.forward) + Math.abs(intent.strafe)).toBe(0);
  });

  it("grabs touches on the small joystick only, so swipes and taps elsewhere look / move", () => {
    expect(onJoystick(76, 300, 76, 300, 48)).toBe(true);
    expect(onJoystick(76 + 60, 300, 76, 300, 48)).toBe(true); // a bit outside the ring
    expect(onJoystick(400, 300, 76, 300, 48)).toBe(false);
  });
});
