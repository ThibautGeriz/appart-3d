import {
  IDLE_LOOK,
  type ClickHandler,
  type InputSource,
  type LookDelta,
  type MoveIntent,
} from "./types";
import type { HudHandles } from "../ui/hud";

const TOUCH_LOOK_SENSITIVITY = 0.0045; // radians per px
const TAP_SLOP = 10; // px — a touch moving less than this is a tap
const TAP_TIME = 300; // ms
/** Touches this much outside the joystick ring still grab it. */
const JOY_GRAB = 1.35;

/** Thumb offset (px) → move intent, clamped to the ring. Pure. */
export function joystickIntent(dx: number, dy: number, radius: number): MoveIntent {
  const len = Math.hypot(dx, dy);
  const scale = len > radius ? radius / len : 1;
  return { forward: (-dy * scale) / radius, strafe: (dx * scale) / radius };
}

/** Is a touch on the joystick (its ring, a bit generous)? Pure. */
export function onJoystick(x: number, y: number, cx: number, cy: number, radius: number): boolean {
  return Math.hypot(x - cx, y - cy) <= radius * JOY_GRAB;
}

/**
 * Touch input:
 *  - small fixed joystick, bottom-left: move
 *  - swipe anywhere else: move the camera
 *  - tap anywhere else: walk there (click-to-move)
 */
export class TouchInput implements InputSource {
  private joyId: number | null = null;
  private joyCenter = { x: 0, y: 0, radius: 1 };
  private joyVec = { x: 0, y: 0 }; // px offset, clamped to the ring
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private lookStart = { x: 0, y: 0, t: 0, moved: false };
  private pendingLook: LookDelta = { ...IDLE_LOOK };
  private clickHandlers: ClickHandler[] = [];
  private attached = true;

  constructor(
    private container: HTMLElement,
    private hud: HudHandles,
  ) {
    container.addEventListener("pointerdown", this.onPointerDown);
    container.addEventListener("pointermove", this.onPointerMove);
    container.addEventListener("pointerup", this.onPointerUp);
    container.addEventListener("pointercancel", this.onPointerUp);
    hud.joyBase.style.display = "block";
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return; // desktop path handles mice
    const rect = this.hud.joyBase.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      radius: rect.width / 2,
    };
    if (
      this.joyId === null &&
      onJoystick(e.clientX, e.clientY, center.x, center.y, center.radius)
    ) {
      this.joyId = e.pointerId;
      this.joyCenter = center;
      this.moveKnob(e.clientX - center.x, e.clientY - center.y);
    } else if (this.lookId === null) {
      this.lookId = e.pointerId;
      this.lookLast = { x: e.clientX, y: e.clientY };
      this.lookStart = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerId === this.joyId) {
      this.moveKnob(e.clientX - this.joyCenter.x, e.clientY - this.joyCenter.y);
    } else if (e.pointerId === this.lookId) {
      const start = this.lookStart;
      if (!start.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < TAP_SLOP) return;
      start.moved = true;
      this.pendingLook.yaw -= (e.clientX - this.lookLast.x) * TOUCH_LOOK_SENSITIVITY;
      this.pendingLook.pitch -= (e.clientY - this.lookLast.y) * TOUCH_LOOK_SENSITIVITY;
      // a swipe moves the camera (orbits it in third person)
      this.pendingLook.orbit = true;
      this.lookLast = { x: e.clientX, y: e.clientY };
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === this.joyId) {
      this.joyId = null;
      this.moveKnob(0, 0);
    } else if (e.pointerId === this.lookId) {
      this.lookId = null;
      const start = this.lookStart;
      if (!start.moved && performance.now() - start.t < TAP_TIME && e.type === "pointerup") {
        for (const handler of this.clickHandlers) handler(start.x, start.y);
      }
    }
  };

  /** Clamp the thumb to the ring and draw the knob there. */
  private moveKnob(dx: number, dy: number): void {
    const radius = this.joyCenter.radius;
    const len = Math.hypot(dx, dy);
    const scale = len > radius ? radius / len : 1;
    this.joyVec = { x: dx * scale, y: dy * scale };
    this.hud.joyKnob.style.transform = `translate(calc(-50% + ${this.joyVec.x}px), calc(-50% + ${this.joyVec.y}px))`;
  }

  /** Nothing time-based to advance on touch. */
  update(_dt: number): void {}

  moveIntent(): MoveIntent {
    return joystickIntent(this.joyVec.x, this.joyVec.y, this.joyCenter.radius);
  }

  consumeLook(): LookDelta {
    const look = this.pendingLook;
    this.pendingLook = { ...IDLE_LOOK };
    return look;
  }

  looking(): boolean {
    return this.lookId !== null && this.lookStart.moved;
  }

  onClick(handler: ClickHandler): void {
    this.clickHandlers.push(handler);
  }

  dispose(): void {
    if (!this.attached) return;
    this.attached = false;
    this.container.removeEventListener("pointerdown", this.onPointerDown);
    this.container.removeEventListener("pointermove", this.onPointerMove);
    this.container.removeEventListener("pointerup", this.onPointerUp);
    this.container.removeEventListener("pointercancel", this.onPointerUp);
    this.hud.joyBase.style.display = "none";
  }
}
