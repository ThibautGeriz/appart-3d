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
  center: [number, number];
  /** direction of the table's length */
  along: Facing;
}

export interface FurnishingDef {
  dining: DiningDef;
  coffeeTable: CoffeeTableDef;
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
  const [x, z] = def.center;
  return {
    product: table,
    x,
    z,
    rotationY: rotationAlong(dir),
    rect: footprint(x, z, table.w, table.d, dir[1] === 0),
  };
}

/** Everything to place for a selection. Pure. */
export function furnishingLayout(def: FurnishingDef, selection: Selection): Placement[] {
  return [
    ...diningLayout(def.dining, product(selection.table), product(selection.chair)),
    coffeeTableLayout(def.coffeeTable, product(selection.coffeeTable)),
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

/** 1234.5 → "1 235 €" (French grouping). Pure. */
export function formatEuros(amount: number): string {
  const rounded = Math.round(amount).toString();
  return `${rounded.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;
}
