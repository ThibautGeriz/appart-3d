import { bowlSpans, KUBUS_2_KNG_120 } from "../data/sink";
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
  // Carcasses, hollowed under the sink: the bowls hang into the sink cabinet
  const carcass = (z0: number, z1: number, h = top - k.plinth) =>
    add("Caissons", [x0, z0, front - FRONT, z1], k.plinth, h, k.carcassColor);
  const underSink = top - KUBUS_2_KNG_120.bowlDepth - 0.03 - k.plinth;
  carcass(zMin, k.sink[0]);
  carcass(k.sink[0], k.sink[1], underSink);
  carcass(k.sink[1], zMax);

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

  // Worktop with a small front overhang, cut out over the undermount sink's
  // bowls; all pieces share one texture origin, so the stone runs across them
  const worktopTop = top + k.worktop.thickness;
  const worktopFront = front + k.worktop.overhang;
  const worktop = (rect: Rect) =>
    add("Plan de travail", rect, top, k.worktop.thickness, k.worktop.color, {
      finish: k.worktop.finish,
      uvOrigin: [x0, top, zMin],
    });
  const sinkCenter = (k.sink[0] + k.sink[1]) / 2;
  const sinkX0 = x0 + k.sinkBack;
  const bowlX0 = sinkX0 + (KUBUS_2_KNG_120.width - KUBUS_2_KNG_120.bowlWidth) / 2;
  const bowlX1 = bowlX0 + KUBUS_2_KNG_120.bowlWidth;
  // the large bowl towards +z: the sink's local +x runs along -z (it faces +x)
  const openings = bowlSpans(KUBUS_2_KNG_120)
    .map(([a, b]) => [sinkCenter - b, sinkCenter - a] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  let z = zMin;
  for (const [o0, o1] of openings) {
    worktop([x0, z, worktopFront, o0]);
    worktop([x0, o0, bowlX0, o1]); // behind the bowl
    worktop([bowlX1, o0, worktopFront, o1]); // in front of it
    z = o1;
  }
  worktop([x0, z, worktopFront, zMax]);

  add(
    "Évier",
    [sinkX0, k.sink[0], sinkX0 + KUBUS_2_KNG_120.width, k.sink[1]],
    top,
    KUBUS_2_KNG_120.bowlDepth,
    "#5b5f63",
    {
      model: "kitchenSink",
      facing: "+x",
      solid: false,
    },
  );
  // Mixer behind the sink, centred on it
  const tapZ = k.tapZ ?? sinkCenter;
  const tapX = x0 + k.sinkBack / 2 + 0.005;
  add(
    "Mitigeur",
    [tapX - 0.03, tapZ - 0.03, tapX + 0.27, tapZ + 0.03],
    worktopTop,
    0.36,
    k.handleColor,
    {
      model: "kitchenTap",
      facing: "+x",
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
