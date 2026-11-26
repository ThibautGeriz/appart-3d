/** Movement intent produced by any input device (keyboard or touch). */
export interface MoveIntent {
  /** -1 (back) .. 1 (forward) */
  forward: number;
  /** -1 (left) .. 1 (right) */
  strafe: number;
  run: boolean;
}

/** Look delta in radians, already scaled by the input device. */
export interface LookDelta {
  yaw: number;
  pitch: number;
}

export const IDLE_LOOK: LookDelta = { yaw: 0, pitch: 0 };

export const IDLE_INTENT: MoveIntent = { forward: 0, strafe: 0, run: false };

/** Common interface for all input sources. */
export interface InputSource {
  /** Advance time-based input (e.g. hold-to-rotate keys). Call once per frame. */
  update(dt: number): void;
  moveIntent(): MoveIntent;
  consumeLook(): LookDelta;
  dispose(): void;
}
