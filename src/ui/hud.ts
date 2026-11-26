import "./hud.css";

export interface HudHandles {
  hint: HTMLElement;
  crosshair: HTMLElement | null;
  joyBase: HTMLElement;
  joyKnob: HTMLElement;
  runButton: HTMLElement;
}

/** Build the HUD overlay (hint, crosshair, touch joystick + run button). */
export function createHud(container: HTMLElement, isTouch: boolean): HudHandles {
  const hud = document.createElement("div");
  hud.className = "hud";

  const hint = document.createElement("div");
  hint.className = "hud-hint";
  hint.textContent = isTouch
    ? "Gauche : marcher · Droite : regarder · Bouton : courir"
    : "Cliquez pour capturer la souris · ZQSD / WASD : se déplacer · Q/E : tourner · Maj : courir";
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

  container.appendChild(hud);

  return { hint, crosshair, joyBase, joyKnob, runButton };
}
