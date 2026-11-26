/** Movement intent produced by any input device (keyboard or touch). */
export interface MoveIntent {
  /** -1 (back) .. 1 (forward) */
  forward: number;
  /** -1 (left) .. 1 (right) */
  strafe: number;
}

/** Look delta in radians, already scaled by the input device. */
export interface LookDelta {
  yaw: number;
  pitch: number;
  /** left-button drag: orbit the camera in third person instead of turning */
  orbit?: boolean;
  /** mouse-wheel notches, > 0 = zoom out */
  zoom?: number;
}

export const IDLE_LOOK: LookDelta = { yaw: 0, pitch: 0 };

export const IDLE_INTENT: MoveIntent = { forward: 0, strafe: 0 };

/** Screen position (client px) of a click / tap meant as "go there". */
export type ClickHandler = (clientX: number, clientY: number) => void;

/** Common interface for all input sources. */
export interface InputSource {
  /** Advance time-based input (e.g. hold-to-rotate keys). Call once per frame. */
  update(dt: number): void;
  moveIntent(): MoveIntent;
  consumeLook(): LookDelta;
  /** the user is dragging to look right now */
  looking(): boolean;
  /** click / tap without drag (click-to-move) */
  onClick(handler: ClickHandler): void;
  dispose(): void;
}
