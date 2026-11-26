import { IDLE_INTENT, type MoveIntent } from "./types";

export type MoveAction =
  | "forward"
  | "back"
  | "turnLeft"
  | "turnRight"
  | "strafeLeft"
  | "strafeRight"
  | "run";

// World of Warcraft layout, on physical key codes (KeyboardEvent.code).
// On AZERTY the key printed "Z" emits "KeyW", "Q" emits "KeyA" and "A" emits
// "KeyQ", so French players get ZQSD + A/E strafing natively, as in WoW.
const KEY_ACTIONS: Record<string, MoveAction> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "turnLeft",
  ArrowLeft: "turnLeft",
  KeyD: "turnRight",
  ArrowRight: "turnRight",
  KeyQ: "strafeLeft",
  KeyE: "strafeRight",
  ShiftLeft: "run",
  ShiftRight: "run",
};

export function keyToAction(code: string): MoveAction | undefined {
  return KEY_ACTIONS[code];
}

/**
 * Build a MoveIntent from the held key codes. With `mouselook` (right mouse
 * button held, as in WoW) the turn keys strafe instead. Pure.
 */
export function intentFromCodes(codes: Iterable<string>, mouselook = false): MoveIntent {
  const intent: MoveIntent = { ...IDLE_INTENT };
  for (const code of codes) {
    switch (keyToAction(code)) {
      case "forward":
        intent.forward += 1;
        break;
      case "back":
        intent.forward -= 1;
        break;
      case "strafeRight":
        intent.strafe += 1;
        break;
      case "strafeLeft":
        intent.strafe -= 1;
        break;
      case "turnRight":
        if (mouselook) intent.strafe += 1;
        break;
      case "turnLeft":
        if (mouselook) intent.strafe -= 1;
        break;
      case "run":
        intent.run = true;
        break;
    }
  }
  intent.strafe = Math.max(-1, Math.min(1, intent.strafe));
  return intent;
}

/** -1 (right) .. 1 (left) turn from the held keys; none while in mouselook. Pure. */
export function turnFromCodes(codes: Iterable<string>, mouselook = false): number {
  if (mouselook) return 0;
  let turn = 0;
  for (const code of codes) {
    const action = keyToAction(code);
    if (action === "turnLeft") turn += 1;
    if (action === "turnRight") turn -= 1;
  }
  return turn;
}

/** Mouse buttons held → WoW mouse modes. Pure. */
export function mouseMode(buttons: number): {
  looking: boolean;
  mouselook: boolean;
  forward: boolean;
} {
  const left = (buttons & 1) !== 0;
  const right = (buttons & 2) !== 0;
  return { looking: left || right, mouselook: right, forward: left && right };
}
