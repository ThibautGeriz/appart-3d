import type { Collider, Vec2 } from "./movement";

/**
 * Click-to-move pathfinding on a walkable grid. Pure.
 *
 * Cells whose center is closer than `radius` to a collider are blocked, so a
 * path through free cells is a path the player's circle can follow. A* finds
 * the cell path (8 neighbours, no corner cutting), then it is straightened
 * by dropping waypoints that have a clear line of sight to the next ones.
 */
export interface NavGrid {
  minX: number;
  minZ: number;
  cell: number;
  cols: number;
  rows: number;
  /** 1 = walkable */
  walkable: Uint8Array;
}

function circleHits(x: number, z: number, c: Collider, radius: number): boolean {
  const dx = x - Math.max(c.minX, Math.min(x, c.maxX));
  const dz = z - Math.max(c.minZ, Math.min(z, c.maxZ));
  return dx * dx + dz * dz < radius * radius;
}

export function buildNavGrid(
  colliders: Collider[],
  bounds: Collider,
  radius: number,
  cell = 0.1,
): NavGrid {
  const cols = Math.ceil((bounds.maxX - bounds.minX) / cell) + 1;
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / cell) + 1;
  const walkable = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const z = bounds.minZ + r * cell;
    // only test colliders crossing this row band, it keeps the build fast
    const row = colliders.filter((c) => c.minZ - radius <= z && c.maxZ + radius >= z);
    for (let q = 0; q < cols; q++) {
      const x = bounds.minX + q * cell;
      walkable[r * cols + q] = row.some((c) => circleHits(x, z, c, radius)) ? 0 : 1;
    }
  }
  return { minX: bounds.minX, minZ: bounds.minZ, cell, cols, rows, walkable };
}

const index = (g: NavGrid, q: number, r: number) => r * g.cols + q;
const inside = (g: NavGrid, q: number, r: number) => q >= 0 && r >= 0 && q < g.cols && r < g.rows;

export function cellOf(g: NavGrid, p: Vec2): [number, number] {
  return [Math.round((p.x - g.minX) / g.cell), Math.round((p.z - g.minZ) / g.cell)];
}

function center(g: NavGrid, q: number, r: number): Vec2 {
  return { x: g.minX + q * g.cell, z: g.minZ + r * g.cell };
}

export function isWalkable(g: NavGrid, p: Vec2): boolean {
  const [q, r] = cellOf(g, p);
  return inside(g, q, r) && g.walkable[index(g, q, r)] === 1;
}

/** Nearest walkable cell within `maxCells` (spiral search), or null. */
function nearestWalkable(
  g: NavGrid,
  q0: number,
  r0: number,
  maxCells = 6,
): [number, number] | null {
  for (let d = 0; d <= maxCells; d++) {
    for (let dq = -d; dq <= d; dq++) {
      for (let dr = -d; dr <= d; dr++) {
        if (Math.max(Math.abs(dq), Math.abs(dr)) !== d) continue;
        const q = q0 + dq;
        const r = r0 + dr;
        if (inside(g, q, r) && g.walkable[index(g, q, r)]) return [q, r];
      }
    }
  }
  return null;
}

/** Every cell on the segment is walkable (sampled at half a cell). */
export function lineOfSight(g: NavGrid, a: Vec2, b: Vec2): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (g.cell * 0.5));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    if (!isWalkable(g, { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false;
  }
  return true;
}

/** Binary min-heap on f-score, keyed by cell index. */
class Heap {
  private items: { i: number; f: number }[] = [];
  get size() {
    return this.items.length;
  }
  push(i: number, f: number) {
    const a = this.items;
    a.push({ i, f });
    let k = a.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (a[p].f <= a[k].f) break;
      [a[p], a[k]] = [a[k], a[p]];
      k = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0].i;
    const last = a.pop() as { i: number; f: number };
    if (a.length) {
      a[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === k) break;
        [a[m], a[k]] = [a[k], a[m]];
        k = m;
      }
    }
    return top;
  }
}

const NEIGHBOURS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

/**
 * Waypoints from `start` to `goal` (goal included, start excluded), or null
 * when the goal cannot be reached. A goal slightly inside a wall's clearance
 * snaps to the nearest walkable point.
 */
export function findPath(g: NavGrid, start: Vec2, goal: Vec2): Vec2[] | null {
  const s = nearestWalkable(g, ...cellOf(g, start));
  const t = nearestWalkable(g, ...cellOf(g, goal));
  if (!s || !t) return null;
  const startIndex = index(g, s[0], s[1]);
  const goalIndex = index(g, t[0], t[1]);
  const cost = new Float32Array(g.walkable.length).fill(Infinity);
  const from = new Int32Array(g.walkable.length).fill(-1);
  const closed = new Uint8Array(g.walkable.length);
  const h = (q: number, r: number) => {
    const dq = Math.abs(q - t[0]);
    const dr = Math.abs(r - t[1]);
    return Math.max(dq, dr) + (Math.SQRT2 - 1) * Math.min(dq, dr); // octile
  };
  const open = new Heap();
  cost[startIndex] = 0;
  open.push(startIndex, h(s[0], s[1]));
  while (open.size) {
    const current = open.pop();
    if (current === goalIndex) break;
    if (closed[current]) continue;
    closed[current] = 1;
    const q = current % g.cols;
    const r = (current - q) / g.cols;
    for (const [dq, dr, step] of NEIGHBOURS) {
      const nq = q + dq;
      const nr = r + dr;
      if (!inside(g, nq, nr) || !g.walkable[index(g, nq, nr)]) continue;
      // no corner cutting: both orthogonal neighbours must be free for a diagonal
      if (dq && dr && (!g.walkable[index(g, q + dq, r)] || !g.walkable[index(g, q, r + dr)]))
        continue;
      const next = index(g, nq, nr);
      const c = cost[current] + step;
      if (c < cost[next]) {
        cost[next] = c;
        from[next] = current;
        open.push(next, c + h(nq, nr));
      }
    }
  }
  if (startIndex !== goalIndex && from[goalIndex] < 0) return null;

  const cells: Vec2[] = [];
  for (let i = goalIndex; i !== startIndex && i >= 0; i = from[i]) {
    const q = i % g.cols;
    cells.push(center(g, q, (i - q) / g.cols));
  }
  cells.reverse();
  // the exact goal when it is walkable, its snapped cell otherwise
  if (isWalkable(g, goal) && cells.length) cells[cells.length - 1] = goal;
  return simplify(g, start, cells);
}

/** Drop waypoints that are visible from the previous kept point. */
export function simplify(g: NavGrid, start: Vec2, cells: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  let anchor = start;
  for (let i = 0; i < cells.length; i++) {
    const next = cells[i + 1];
    if (next && lineOfSight(g, anchor, next)) continue;
    out.push(cells[i]);
    anchor = cells[i];
  }
  return out;
}
