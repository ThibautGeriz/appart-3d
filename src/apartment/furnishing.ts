import type { ApartmentDef, Facing, Rect } from "../data/apartment";
import { product, type Product, type ProductKind } from "../data/catalog";
import { facingVector } from "./facing";
import { roomOf } from "./plan";

/**
 * Where the selected furniture goes: the dining table against a wall with
 * its chairs around it, the coffee table in the living area. Pure layout and
 * budget logic, no three.js.
 */

export interface DiningDef {
  /** middle of the wall the table's end stands against */
  wall: [number, number];
  /** the table runs from the wall in this direction */
  towards: Facing;
  /** gap between the wall and the table end */
  gap: number;
  /** most chairs around the table (sides first, then the far end) */
  maxChairs: number;
}

export interface CoffeeTableDef {
  /**
   * where the table goes: its edge(s) picked by `align` sit on `anchor`
   * (align -1 = min side, 1 = max side, 0 = centre, per axis), so the gaps to
   * the sofa and walls hold whatever coffee table is chosen
   */
  anchor: [number, number];
  align: [number, number];
  /** direction of the table's length */
  along: Facing;
}

/** A living-room arrangement, tied to the sofa it is drawn for. */
export interface LivingDef {
  /** sofa centre (of its bounding box) and the way its long side's front faces */
  sofa: { center: [number, number]; facing: Facing };
  coffeeTable: CoffeeTableDef;
  /** TV unit facing the sofa */
  tvUnit: CoffeeTableDef;
}

export interface FurnishingDef {
  dining: DiningDef;
  /** living-room layout per sofa product id */
  living: Record<string, LivingDef>;
  /** sideboard against a wall (along "-x": its front faces -z, …) */
  sideboard: CoffeeTableDef;
  /** selection when nothing is saved yet */
  defaults: Selection;
}

export type Selection = Record<ProductKind, string>;

export interface Placement {
  product: Product;
  x: number;
  z: number;
  /** rotation about y (the model's +z front turns towards `facing`) */
  rotationY: number;
  /** footprint on the plan, for the colliders */
  rect: Rect;
  /** several rectangles when the footprint is not one (corner sofa) */
  rects?: Rect[];
}

/** Minimum width per diner along the table. */
const PLACE_WIDTH = 0.6;

/** Rotation that turns a model's local +x towards `dir` (its +z then faces left of it). */
function rotationAlong([fx, fz]: [number, number]): number {
  return Math.atan2(-fz, fx);
}

/** Rotation that turns a model's local +z (its front) towards `dir`. */
function rotationFacing([fx, fz]: [number, number]): number {
  return Math.atan2(fx, fz);
}

/** Axis-aligned footprint of a w × d model centered at (x, z), its length along `dir`. */
function footprint(x: number, z: number, w: number, d: number, lengthAlongX: boolean): Rect {
  const [hx, hz] = lengthAlongX ? [w / 2, d / 2] : [d / 2, w / 2];
  return [x - hx, z - hz, x + hx, z + hz];
}

/** Diners per long side of a table. Pure. */
export function seatsPerSide(length: number): number {
  return Math.max(1, Math.floor(length / PLACE_WIDTH + 1e-6));
}

/**
 * Dining table + chairs. The chairs stand half under the table (centered on
 * its edge), evenly along both long sides, then one at the far end if
 * `maxChairs` allows; none at the wall end. Pure.
 */
export function diningLayout(def: DiningDef, table: Product, chair: Product): Placement[] {
  const dir = facingVector(def.towards);
  const side: [number, number] = [-dir[1], dir[0]];
  const alongX = dir[1] === 0;
  const cx = def.wall[0] + dir[0] * (def.gap + table.w / 2);
  const cz = def.wall[1] + dir[1] * (def.gap + table.w / 2);
  const placements: Placement[] = [
    {
      product: table,
      x: cx,
      z: cz,
      rotationY: rotationAlong(dir),
      rect: footprint(cx, cz, table.w, table.d, alongX),
    },
  ];
  const addChair = (x: number, z: number, facing: [number, number]) =>
    placements.push({
      product: chair,
      x,
      z,
      rotationY: rotationFacing(facing),
      rect: footprint(x, z, chair.w, chair.d, facing[1] !== 0),
    });
  const n = Math.min(seatsPerSide(table.w), Math.floor(def.maxChairs / 2));
  for (let i = 0; i < n; i++) {
    const t = -table.w / 2 + (table.w * (i + 0.5)) / n;
    for (const s of [-1, 1]) {
      const x = cx + dir[0] * t + side[0] * s * (table.d / 2);
      const z = cz + dir[1] * t + side[1] * s * (table.d / 2);
      addChair(x, z, [-side[0] * s, -side[1] * s]);
    }
  }
  // head of the table, opposite the wall
  if (2 * n < def.maxChairs) {
    addChair(cx + (dir[0] * table.w) / 2, cz + (dir[1] * table.w) / 2, [-dir[0], -dir[1]]);
  }
  return placements;
}

export function coffeeTableLayout(def: CoffeeTableDef, table: Product): Placement {
  const dir = facingVector(def.along);
  const alongX = dir[1] === 0;
  const [sx, sz] = alongX ? [table.w, table.d] : [table.d, table.w];
  const x = def.anchor[0] - (def.align[0] * sx) / 2;
  const z = def.anchor[1] - (def.align[1] * sz) / 2;
  return {
    product: table,
    x,
    z,
    rotationY: rotationAlong(dir),
    rect: footprint(x, z, table.w, table.d, dir[1] === 0),
  };
}

/** Model-frame rectangle → plan rectangle, for a model at (x, z) turned by `rotationY`. Pure. */
export function placeRect(
  [x0, z0, x1, z1]: [number, number, number, number],
  x: number,
  z: number,
  rotationY: number,
): Rect {
  const c = Math.round(Math.cos(rotationY));
  const s = Math.round(Math.sin(rotationY)); // quarter turns only
  const corners = [
    [x0, z0],
    [x1, z1],
  ].map(([px, pz]) => [x + px * c + pz * s, z - px * s + pz * c]);
  return [
    Math.min(corners[0][0], corners[1][0]),
    Math.min(corners[0][1], corners[1][1]),
    Math.max(corners[0][0], corners[1][0]),
    Math.max(corners[0][1], corners[1][1]),
  ];
}

export function sofaLayout(def: LivingDef, sofa: Product): Placement {
  const [x, z] = def.sofa.center;
  const rotationY = rotationFacing(facingVector(def.sofa.facing));
  const whole: [number, number, number, number] = [
    -sofa.w / 2,
    -sofa.d / 2,
    sofa.w / 2,
    sofa.d / 2,
  ];
  return {
    product: sofa,
    x,
    z,
    rotationY,
    rect: placeRect(whole, x, z, rotationY),
    rects: (sofa.parts ?? [whole]).map((part) => placeRect(part, x, z, rotationY)),
  };
}

/** Everything to place for a selection: the living room follows the sofa. Pure. */
export function furnishingLayout(def: FurnishingDef, selection: Selection): Placement[] {
  const living = def.living[selection.sofa];
  if (!living) throw new Error(`no living-room layout for ${selection.sofa}`);
  return [
    ...diningLayout(def.dining, product(selection.table), product(selection.chair)),
    sofaLayout(living, product(selection.sofa)),
    coffeeTableLayout(living.coffeeTable, product(selection.coffeeTable)),
    coffeeTableLayout(living.tvUnit, product(selection.tvUnit)),
    coffeeTableLayout(def.sideboard, product(selection.sideboard)),
  ];
}

export interface BudgetLine {
  product: Product;
  quantity: number;
  total: number;
}

export interface BudgetRoom {
  room: string;
  lines: BudgetLine[];
  total: number;
}

/** Room name at a plan point (the area's room or label). Pure. */
export function roomAt(def: ApartmentDef, x: number, z: number): string {
  const index = def.areas.findIndex(
    ({ rect }) => x >= rect[0] && x <= rect[2] && z >= rect[1] && z <= rect[3],
  );
  return index < 0 ? "Autre" : roomOf(def.areas[index], index);
}

/** Price of the placed furniture, grouped by room then product. Pure. */
export function budget(def: ApartmentDef, placements: Placement[]): BudgetRoom[] {
  const rooms = new Map<string, Map<string, BudgetLine>>();
  for (const p of placements) {
    const room = roomAt(def, p.x, p.z);
    const lines = rooms.get(room) ?? new Map<string, BudgetLine>();
    rooms.set(room, lines);
    const line = lines.get(p.product.id) ?? { product: p.product, quantity: 0, total: 0 };
    line.quantity += 1;
    line.total = line.quantity * p.product.price;
    lines.set(p.product.id, line);
  }
  return [...rooms].map(([room, lines]) => {
    const list = [...lines.values()];
    return { room, lines: list, total: list.reduce((s, l) => s + l.total, 0) };
  });
}

/** 1234 → "1 234 €", 3386.46 → "3 386,46 €" (French grouping, cents only when there are some). Pure. */
export function formatEuros(amount: number): string {
  const cents = Math.round(amount * 100);
  const euros = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  const rest = cents % 100;
  return rest === 0 ? `${euros} €` : `${euros},${String(rest).padStart(2, "0")} €`;
}
