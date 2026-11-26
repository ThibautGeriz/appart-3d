import { IDLE_INTENT, type MoveIntent } from "./types";

export type MoveAction =
  | "forward"
  | "back"
  | "left"
  | "right"
  | "run"
  | "rotateLeft"
  | "rotateRight";

// Physical key codes (KeyboardEvent.code). On AZERTY keyboards the key
// labelled "Z" emits code "KeyW", so physical WASD positions work natively
// for French layouts — no remapping needed.
const KEY_ACTIONS: Record<string, MoveAction> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "run",
  ShiftRight: "run",
  KeyQ: "rotateLeft",
  KeyE: "rotateRight",
};

export function keyToAction(code: string): MoveAction | undefined {
  return KEY_ACTIONS[code];
}

/** Pure helper: build a MoveIntent from a set of currently held key codes. */
export function intentFromCodes(codes: Iterable<string>): MoveIntent {
  const intent: MoveIntent = { ...IDLE_INTENT };
  for (const code of codes) {
    switch (keyToAction(code)) {
      case "forward":
        intent.forward += 1;
        break;
      case "back":
        intent.forward -= 1;
        break;
      case "right":
        intent.strafe += 1;
        break;
      case "left":
        intent.strafe -= 1;
        break;
      case "run":
        intent.run = true;
        break;
    }
  }
  return intent;
}
