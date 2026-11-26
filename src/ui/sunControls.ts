import type { HudHandles } from "./hud";
import type { Lighting, SunState } from "../lighting/environment";

const HOUR_STEP = 0.25;
const MIN_HOUR = 4;
const MAX_HOUR = 23;

/** 14.5 → "14:30". Pure. */
export function formatClock(hour: number): string {
  const totalMinutes = Math.round(hour * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function clampHour(hour: number): number {
  return Math.max(MIN_HOUR, Math.min(MAX_HOUR, hour));
}

/** Start at the current hour if it is daytime, otherwise late morning. */
export function defaultHour(now: Date): number {
  const hour = now.getHours() + now.getMinutes() / 60;
  return hour >= 8 && hour <= 19 ? Math.round(hour / HOUR_STEP) * HOUR_STEP : 11;
}

/** Wire the sun panel (slider + month) and the O/P keys to the lighting. */
export function bindSunControls(hud: HudHandles, lighting: Lighting, initial: SunState): void {
  const state = { ...initial, hour: clampHour(initial.hour) };
  const apply = () => {
    hud.hourInput.value = String(state.hour);
    hud.hourLabel.textContent = formatClock(state.hour);
    hud.monthSelect.value = String(state.month);
    lighting.setTime(state);
  };

  hud.sunButton.addEventListener("click", () => {
    hud.sunPanel.hidden = !hud.sunPanel.hidden;
    hud.sunButton.classList.toggle("active", !hud.sunPanel.hidden);
  });
  hud.hourInput.addEventListener("input", () => {
    state.hour = Number(hud.hourInput.value);
    apply();
  });
  hud.monthSelect.addEventListener("change", () => {
    state.month = Number(hud.monthSelect.value);
    apply();
  });
  window.addEventListener("keydown", (e) => {
    if (e.code !== "KeyO" && e.code !== "KeyP") return;
    state.hour = clampHour(state.hour + (e.code === "KeyP" ? HOUR_STEP : -HOUR_STEP));
    apply();
  });

  apply();
}
