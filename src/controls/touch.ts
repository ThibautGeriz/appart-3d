import { IDLE_LOOK, type InputSource, type LookDelta, type MoveIntent } from "./types";
import type { HudHandles } from "../ui/hud";

const JOY_RADIUS = 64; // px — max thumb travel
const TOUCH_LOOK_SENSITIVITY = 0.0045; // radians per px

/**
 * Touch input:
 *  - left ~45% of the screen: virtual joystick (move)
 *  - rest of the screen: drag to look
 *  - HUD run button: hold to run
 */
export class TouchInput implements InputSource {
  private joyId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private joyVec = { x: 0, y: 0 }; // clamped px offset
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private pendingLook: LookDelta = { ...IDLE_LOOK };
  private running = false;
  private attached = true;

  constructor(
    private container: HTMLElement,
    private hud: HudHandles,
  ) {
    container.addEventListener("pointerdown", this.onPointerDown);
    container.addEventListener("pointermove", this.onPointerMove);
    container.addEventListener("pointerup", this.onPointerUp);
    container.addEventListener("pointercancel", this.onPointerUp);
    const run = hud.runButton;
    run.addEventListener("pointerdown", this.onRunDown);
    run.addEventListener("pointerup", this.onRunUp);
    run.addEventListener("pointercancel", this.onRunUp);
  }

  private onRunDown = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      this.hud.runButton.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture unsupported — ignore */
    }
    this.running = true;
    this.hud.runButton.classList.add("active");
  };

  private onRunUp = () => {
    this.running = false;
    this.hud.runButton.classList.remove("active");
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return; // desktop path handles mice
    if (e.clientX < window.innerWidth * 0.45) {
      if (this.joyId !== null) return;
      this.joyId = e.pointerId;
      this.joyOrigin = { x: e.clientX, y: e.clientY };
      this.joyVec = { x: 0, y: 0 };
      this.showJoystick(e.clientX, e.clientY, 0, 0);
    } else {
      if (this.lookId !== null) return;
      this.lookId = e.pointerId;
      this.lookLast = { x: e.clientX, y: e.clientY };
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerId === this.joyId) {
      const dx = e.clientX - this.joyOrigin.x;
      const dy = e.clientY - this.joyOrigin.y;
      const len = Math.hypot(dx, dy);
      const scale = len > JOY_RADIUS ? JOY_RADIUS / len : 1;
      this.joyVec = { x: dx * scale, y: dy * scale };
      this.showJoystick(this.joyOrigin.x, this.joyOrigin.y, this.joyVec.x, this.joyVec.y);
    } else if (e.pointerId === this.lookId) {
      this.pendingLook.yaw -= (e.clientX - this.lookLast.x) * TOUCH_LOOK_SENSITIVITY;
      this.pendingLook.pitch -= (e.clientY - this.lookLast.y) * TOUCH_LOOK_SENSITIVITY;
      this.lookLast = { x: e.clientX, y: e.clientY };
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === this.joyId) {
      this.joyId = null;
      this.joyVec = { x: 0, y: 0 };
      this.hideJoystick();
    } else if (e.pointerId === this.lookId) {
      this.lookId = null;
    }
  };

  private showJoystick(originX: number, originY: number, knobX: number, knobY: number): void {
    const { joyBase, joyKnob } = this.hud;
    joyBase.style.display = "block";
    joyKnob.style.display = "block";
    joyBase.style.left = `${originX}px`;
    joyBase.style.top = `${originY}px`;
    joyKnob.style.left = `${originX + knobX}px`;
    joyKnob.style.top = `${originY + knobY}px`;
  }

  private hideJoystick(): void {
    this.hud.joyBase.style.display = "none";
    this.hud.joyKnob.style.display = "none";
  }

  moveIntent(): MoveIntent {
    return {
      forward: -this.joyVec.y / JOY_RADIUS,
      strafe: this.joyVec.x / JOY_RADIUS,
      run: this.running,
    };
  }

  consumeLook(): LookDelta {
    const look = this.pendingLook;
    this.pendingLook = { ...IDLE_LOOK };
    return look;
  }

  dispose(): void {
    if (!this.attached) return;
    this.attached = false;
    this.container.removeEventListener("pointerdown", this.onPointerDown);
    this.container.removeEventListener("pointermove", this.onPointerMove);
    this.container.removeEventListener("pointerup", this.onPointerUp);
    this.container.removeEventListener("pointercancel", this.onPointerUp);
    this.hud.runButton.removeEventListener("pointerdown", this.onRunDown);
    this.hud.runButton.removeEventListener("pointerup", this.onRunUp);
    this.hud.runButton.removeEventListener("pointercancel", this.onRunUp);
    this.hideJoystick();
  }
}
