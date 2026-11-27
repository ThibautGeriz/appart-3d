/**
 * Frame-rate counter for the HUD: frames per second and frame time, averaged
 * over a short window so the number is readable, coloured against the
 * performance budget (AGENTS.md: 60 fps target, 30 fps floor).
 */

/** Seconds between two refreshes of the display. */
const WINDOW = 0.5;

export type FpsLevel = "good" | "ok" | "low";

export interface FpsReading {
  fps: number;
  /** average frame time, ms */
  ms: number;
  level: FpsLevel;
}

/** 55+ is on target, 30+ playable, below the floor is low. Pure. */
export function fpsLevel(fps: number): FpsLevel {
  return fps >= 55 ? "good" : fps >= 30 ? "ok" : "low";
}

/** Averages frames over WINDOW seconds; `tick` returns a reading once per window. */
export class FpsMeter {
  private frames = 0;
  private elapsed = 0;

  tick(dt: number): FpsReading | null {
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed < WINDOW) return null;
    const fps = this.frames / this.elapsed;
    const reading = { fps, ms: (this.elapsed / this.frames) * 1000, level: fpsLevel(fps) };
    this.frames = 0;
    this.elapsed = 0;
    return reading;
  }
}

/** "60 FPS · 16,7 ms". Pure. */
export function fpsText({ fps, ms }: FpsReading): string {
  return `${Math.round(fps)} FPS · ${ms.toFixed(1).replace(".", ",")} ms`;
}

/** The counter element, top centre; call `update` every frame with the real (unclamped) dt. */
export function createFpsCounter(container: HTMLElement): { update(dt: number): void } {
  const el = document.createElement("div");
  el.className = "hud-fps";
  el.textContent = "– FPS";
  container.appendChild(el);
  const meter = new FpsMeter();
  return {
    update(dt) {
      const reading = meter.tick(dt);
      if (!reading) return;
      el.textContent = fpsText(reading);
      el.dataset.level = reading.level;
    },
  };
}
