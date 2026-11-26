import type { FurnitureDef, KitchenDef, KitchenModule, Rect } from "../data/apartment";

/** Gap between adjacent fronts (shadow line between doors/drawers). */
const GAP = 0.012;
const FRONT = 0.02; // front panel thickness
const HANDLE = { depth: 0.015, height: 0.012, inset: 0.03 };

/** Total length of the base unit run. */
export function runLength(kitchen: KitchenDef): number {
  return kitchen.modules.reduce((sum, m) => sum + m.width, 0);
}

/** z span of each module, laid out from `startZ` toward `endZ`. Pure. */
export function moduleSpans(
  kitchen: KitchenDef,
): { module: KitchenModule; z0: number; z1: number }[] {
  const dir = Math.sign(kitchen.endZ - kitchen.startZ);
  let cursor = kitchen.startZ;
  return kitchen.modules.map((module) => {
    const next = cursor + dir * module.width;
    const span = { module, z0: Math.min(cursor, next), z1: Math.max(cursor, next) };
    cursor = next;
    return span;
  });
}

/**
 * Expand the kitchen description into plain furniture boxes: plinth, carcass,
 * one front per door / drawer with shadow gaps, bar handles, oven, worktop,
 * sink, tap, hob, wall cabinets, hood and the tiled floor in front. Pure.
 * The run stands against the wall x = `wallX` and faces +x.
 */
export function expandKitchen(k: KitchenDef): FurnitureDef[] {
  const items: FurnitureDef[] = [];
  const x0 = k.wallX;
  const front = x0 + k.depth;
  const zMin = Math.min(k.startZ, k.endZ);
  const zMax = Math.max(k.startZ, k.endZ);
  const top = k.height; // carcass top, worktop sits on it
  const add = (
    name: string,
    rect: Rect,
    y: number,
    h: number,
    color: string,
    extra?: Partial<FurnitureDef>,
  ) => items.push({ name, rect, y, h, color, ...extra });

  add("Carrelage cuisine", [x0, zMin, x0 + k.floor.depth, zMax], 0, 0.005, k.floor.color, {
    finish: k.floor.finish,
    solid: false,
  });
  add("Plinthe", [x0, zMin, front - 0.05, zMax], 0, k.plinth, k.plinthColor);
  add("Caissons", [x0, zMin, front - FRONT, zMax], k.plinth, top - k.plinth, k.carcassColor);

  /** A front panel, with a bar handle near its top edge unless `handleWidth` is 0. */
  const panel = (
    name: string,
    z0: number,
    z1: number,
    y0: number,
    y1: number,
    handleWidth: number,
  ) => {
    add(
      name,
      [front - FRONT, z0 + GAP / 2, front, z1 - GAP / 2],
      y0 + GAP / 2,
      y1 - y0 - GAP,
      k.frontColor,
      { finish: k.frontFinish },
    );
    if (handleWidth <= 0) return;
    const zc = (z0 + z1) / 2;
    add(
      `${name} (poignée)`,
      [front, zc - handleWidth / 2, front + HANDLE.depth, zc + handleWidth / 2],
      y1 - HANDLE.inset - HANDLE.height,
      HANDLE.height,
      k.handleColor,
      { solid: false },
    );
  };

  for (const { module, z0, z1 } of moduleSpans(k)) {
    const w = z1 - z0;
    if (module.kind === "door") {
      panel("Porte", z0, z1, k.plinth, top, Math.min(0.12, w * 0.3));
    } else if (module.kind === "drawers") {
      let y = top;
      for (const h of module.fronts) {
        panel("Tiroir", z0, z1, y - h, y, Math.min(0.2, w * 0.35));
        y -= h;
      }
    } else {
      // Built-in oven: green filler strips above and below a black oven
      const ovenBottom = k.plinth + module.below;
      const ovenTop = top - module.above;
      panel("Bandeau four", z0, z1, k.plinth, ovenBottom, 0);
      panel("Bandeau four", z0, z1, ovenTop, top, 0);
      add(
        "Four",
        [front - FRONT, z0 + GAP, front, z1 - GAP],
        ovenBottom,
        ovenTop - ovenBottom,
        k.ovenColor,
      );
      add(
        "Four (vitre)",
        [front, z0 + 0.06, front + 0.003, z1 - 0.06],
        ovenBottom + 0.08,
        (ovenTop - ovenBottom) * 0.55,
        k.ovenGlassColor,
        { solid: false },
      );
      add(
        "Four (poignée)",
        [front, z0 + 0.08, front + HANDLE.depth, z1 - 0.08],
        ovenTop - 0.09,
        HANDLE.height,
        k.handleColor,
        { solid: false },
      );
    }
  }

  // Worktop with a small front overhang, then what sits on it
  const worktopTop = top + k.worktop.thickness;
  add(
    "Plan de travail",
    [x0, zMin, front + k.worktop.overhang, zMax],
    top,
    k.worktop.thickness,
    k.worktop.color,
    {
      finish: k.worktop.finish,
    },
  );
  add("Évier", [x0 + 0.08, k.sink[0], front - 0.08, k.sink[1]], worktopTop, 0.004, "#1b1b1b", {
    solid: false,
  });
  const tapZ = k.tapZ ?? (k.sink[0] + k.sink[1]) / 2;
  add(
    "Mitigeur",
    [x0 + 0.05, tapZ - 0.025, x0 + 0.1, tapZ + 0.025],
    worktopTop,
    0.34,
    k.handleColor,
    {
      solid: false,
    },
  );
  add(
    "Bec du mitigeur",
    [x0 + 0.05, tapZ - 0.012, x0 + 0.27, tapZ + 0.012],
    worktopTop + 0.31,
    0.025,
    k.handleColor,
    {
      solid: false,
    },
  );
  add(
    "Plaque de cuisson",
    [x0 + 0.05, k.hob[0], front - 0.05, k.hob[1]],
    worktopTop,
    0.005,
    "#0c0c0c",
    {
      solid: false,
    },
  );

  // Wall cabinets: one carcass, N door fronts, hood under part of it
  const wc = k.wallCabinets;
  const [c0, c1] = [Math.min(...wc.z), Math.max(...wc.z)];
  add(
    "Meubles hauts (caissons)",
    [x0, c0, x0 + wc.depth - FRONT, c1],
    wc.bottom,
    wc.height,
    wc.color,
    {
      finish: wc.finish,
    },
  );
  const doorWidth = (c1 - c0) / wc.doors;
  for (let i = 0; i < wc.doors; i++) {
    const z0 = c0 + i * doorWidth;
    add(
      "Meuble haut (porte)",
      [x0 + wc.depth - FRONT, z0 + GAP / 2, x0 + wc.depth, z0 + doorWidth - GAP / 2],
      wc.bottom + GAP / 2,
      wc.height - GAP,
      wc.color,
      { finish: wc.finish },
    );
  }
  if (wc.hood) {
    add(
      "Hotte",
      [x0 + 0.05, wc.hood[0], x0 + wc.depth - 0.03, wc.hood[1]],
      wc.bottom - 0.03,
      0.03,
      "#b9bbbd",
    );
  }
  return items;
}
