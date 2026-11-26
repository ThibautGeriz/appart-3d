import { intentFromCodes } from "./keymap";
import { IDLE_LOOK, type InputSource, type LookDelta, type MoveIntent } from "./types";

const MOUSE_SENSITIVITY = 0.0022; // radians per pixel of mouse movement
const KEY_ROTATE_SPEED = Math.PI / 2; // radians per second (Q/E keys)

export class KeyboardMouseInput implements InputSource {
  private keys = new Set<string>();
  private pendingLook: LookDelta = { ...IDLE_LOOK };
  private canvas: HTMLElement;
  private attached = true;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("click", this.onClick);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("blur", this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!e.repeat) this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onClick = () => {
    if (document.pointerLockElement !== this.canvas) {
      try {
        const result = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        result?.catch(() => {
          /* user gesture invalid or lock cooldown — ignore */
        });
      } catch {
        /* pointer lock unsupported — ignore */
      }
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== this.canvas) return;
    this.pendingLook.yaw -= e.movementX * MOUSE_SENSITIVITY;
    this.pendingLook.pitch -= e.movementY * MOUSE_SENSITIVITY;
  };

  private onBlur = () => {
    this.keys.clear();
  };

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  /** Q/E rotate while held — accumulate yaw into the look delta. */
  update(dt: number): void {
    const rotate = (this.keys.has("KeyQ") ? 1 : 0) - (this.keys.has("KeyE") ? 1 : 0);
    if (rotate !== 0) {
      // Positive yaw turns left (Three.js Y-rotation convention)
      this.pendingLook.yaw += rotate * KEY_ROTATE_SPEED * dt;
    }
  }

  moveIntent(): MoveIntent {
    return intentFromCodes(this.keys);
  }

  consumeLook(): LookDelta {
    const look = this.pendingLook;
    this.pendingLook = { ...IDLE_LOOK };
    return look;
  }

  dispose(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("click", this.onClick);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("blur", this.onBlur);
    this.keys.clear();
  }
}
