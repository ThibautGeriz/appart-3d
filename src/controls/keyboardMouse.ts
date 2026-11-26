import { intentFromCodes, mouseMode, turnFromCodes } from "./keymap";
import {
  IDLE_LOOK,
  type ClickHandler,
  type InputSource,
  type LookDelta,
  type MoveIntent,
} from "./types";

const MOUSE_SENSITIVITY = 0.004; // radians per pixel while dragging
const KEY_TURN_SPEED = Math.PI * 0.75; // radians per second (A/D, ←/→)
/** A press that moves less than this and is released quickly is a click, not a drag. */
const CLICK_SLOP = 5; // px
const CLICK_TIME = 350; // ms

/**
 * World of Warcraft style keyboard + mouse, cursor always visible:
 *  - left drag: look around; right drag: turn (mouselook, A/D then strafe)
 *  - both buttons: walk forward
 *  - click (left or right, no drag): click-to-move
 */
export class KeyboardMouseInput implements InputSource {
  private keys = new Set<string>();
  private pendingLook: LookDelta = { ...IDLE_LOOK };
  private buttons = 0;
  private press: { x: number; y: number; t: number; moved: boolean } | null = null;
  private clickHandlers: ClickHandler[] = [];
  private attached = true;

  constructor(private canvas: HTMLElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("blur", this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!e.repeat) this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return; // touch is handled by TouchInput
    this.buttons = e.buttons;
    if (!this.press)
      this.press = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* capture unsupported — window listeners still work */
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !this.buttons) return;
    this.buttons = e.buttons;
    const press = this.press;
    if (press && !press.moved) {
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < CLICK_SLOP) return;
      press.moved = true;
    }
    this.canvas.style.cursor = "grabbing";
    this.pendingLook.yaw -= e.movementX * MOUSE_SENSITIVITY;
    this.pendingLook.pitch -= e.movementY * MOUSE_SENSITIVITY;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.buttons = e.buttons;
    if (this.buttons) return; // another button still held
    const press = this.press;
    this.press = null;
    this.canvas.style.cursor = "";
    if (press && !press.moved && performance.now() - press.t < CLICK_TIME) {
      for (const handler of this.clickHandlers) handler(press.x, press.y);
    }
  };

  private onContextMenu = (e: Event) => e.preventDefault();

  private onBlur = () => {
    this.keys.clear();
    this.buttons = 0;
    this.press = null;
  };

  /** Turn keys rotate while held — accumulate yaw into the look delta. */
  update(dt: number): void {
    const turn = turnFromCodes(this.keys, mouseMode(this.buttons).mouselook);
    // Positive yaw turns left (Three.js Y-rotation convention)
    if (turn !== 0) this.pendingLook.yaw += turn * KEY_TURN_SPEED * dt;
  }

  moveIntent(): MoveIntent {
    const mode = mouseMode(this.buttons);
    const intent = intentFromCodes(this.keys, mode.mouselook);
    if (mode.forward) intent.forward = Math.max(intent.forward, 1);
    return intent;
  }

  consumeLook(): LookDelta {
    const look = this.pendingLook;
    this.pendingLook = { ...IDLE_LOOK };
    return look;
  }

  looking(): boolean {
    return this.press?.moved ?? false;
  }

  onClick(handler: ClickHandler): void {
    this.clickHandlers.push(handler);
  }

  dispose(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("blur", this.onBlur);
    this.keys.clear();
  }
}
