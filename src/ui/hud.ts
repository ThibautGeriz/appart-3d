import "./hud.css";

export interface HudHandles {
  hint: HTMLElement;
  crosshair: HTMLElement | null;
  joyBase: HTMLElement;
  joyKnob: HTMLElement;
  dimButton: HTMLElement;
  sunButton: HTMLElement;
  lightButton: HTMLElement;
  sunPanel: HTMLElement;
  hourInput: HTMLInputElement;
  hourLabel: HTMLElement;
  monthSelect: HTMLSelectElement;
}

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/** Build the HUD overlay (hint, crosshair, touch joystick, toggles). */
export function createHud(container: HTMLElement, isTouch: boolean): HudHandles {
  const hud = document.createElement("div");
  hud.className = "hud";

  const hint = document.createElement("div");
  hint.className = "hud-hint";
  hint.textContent = isTouch
    ? "Joystick : marcher · Glisser : regarder · Toucher : aller ici"
    : "Clic : aller ici · Glisser : regarder · 2 boutons : avancer · Molette : vue 3e personne · ZQSD : avancer / tourner · A/E : de côté · Tab : cotes · L : lumières";
  hud.appendChild(hint);

  let crosshair: HTMLElement | null = null;
  if (!isTouch) {
    crosshair = document.createElement("div");
    crosshair.className = "hud-crosshair";
    hud.appendChild(crosshair);
  }

  const joyBase = document.createElement("div");
  joyBase.className = "hud-joy-base";
  hud.appendChild(joyBase);

  // small fixed joystick, bottom-left (touch only, shown by TouchInput)
  const joyKnob = document.createElement("div");
  joyKnob.className = "hud-joy-knob";
  joyBase.appendChild(joyKnob);

  // "Cotes" (dimensions) toggle — usable on both desktop and touch
  const dimButton = document.createElement("button");
  dimButton.className = "hud-dim";
  dimButton.textContent = "CÔTES";
  dimButton.type = "button";
  hud.appendChild(dimButton);

  // Sun panel: time of day + month
  const sunButton = document.createElement("button");
  sunButton.className = "hud-dim hud-sun";
  sunButton.textContent = "☀ SOLEIL";
  sunButton.type = "button";
  hud.appendChild(sunButton);

  const lightButton = document.createElement("button");
  lightButton.className = "hud-dim hud-light active";
  lightButton.textContent = "💡 LUMIÈRES";
  lightButton.type = "button";
  hud.appendChild(lightButton);

  const sunPanel = document.createElement("div");
  sunPanel.className = "hud-sun-panel";
  sunPanel.hidden = true;
  const hourRow = document.createElement("label");
  const hourLabel = document.createElement("span");
  const hourInput = document.createElement("input");
  Object.assign(hourInput, { type: "range", min: "4", max: "23", step: "0.25" });
  hourRow.append(hourLabel, hourInput);
  const monthSelect = document.createElement("select");
  MONTHS.forEach((name, i) => monthSelect.add(new Option(name, String(i))));
  sunPanel.append(hourRow, monthSelect);
  // Keep touches on the panel from driving the joystick / look controls
  sunPanel.addEventListener("pointerdown", (e) => e.stopPropagation());
  hud.appendChild(sunPanel);

  container.appendChild(hud);

  return {
    hint,
    crosshair,
    joyBase,
    joyKnob,
    dimButton,
    sunButton,
    lightButton,
    sunPanel,
    hourInput,
    hourLabel,
    monthSelect,
  };
}
