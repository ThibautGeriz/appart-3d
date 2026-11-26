import "./hud.css";

export interface HudHandles {
  hint: HTMLElement;
  crosshair: HTMLElement | null;
  joyBase: HTMLElement;
  joyKnob: HTMLElement;
  runButton: HTMLElement;
  dimButton: HTMLElement;
  sunButton: HTMLElement;
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

/** Build the HUD overlay (hint, crosshair, touch joystick + run button). */
export function createHud(container: HTMLElement, isTouch: boolean): HudHandles {
  const hud = document.createElement("div");
  hud.className = "hud";

  const hint = document.createElement("div");
  hint.className = "hud-hint";
  hint.textContent = isTouch
    ? "Gauche : marcher · Droite : regarder · Bouton : courir"
    : "Cliquez pour capturer la souris · ZQSD / WASD : se déplacer · Q/E : tourner · Tab : cotes · O/P : heure · Maj : courir";
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

  const joyKnob = document.createElement("div");
  joyKnob.className = "hud-joy-knob";
  hud.appendChild(joyKnob);

  const runButton = document.createElement("button");
  runButton.className = "hud-run";
  runButton.textContent = "COURIR";
  runButton.type = "button";
  if (!isTouch) runButton.style.display = "none";
  hud.appendChild(runButton);

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
    runButton,
    dimButton,
    sunButton,
    sunPanel,
    hourInput,
    hourLabel,
    monthSelect,
  };
}
