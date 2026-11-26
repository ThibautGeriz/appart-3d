import type { ClosetDef, FurnitureDef, Rect } from "../data/apartment";
import { facingVector } from "./facing";

const LEAF = 0.02; // sliding door thickness
const TRACK = 0.025; // depth offset between the two sliding tracks
const PULL = { width: 0.025, height: 0.3, y: 1.0 };
const FLUSH_GAP = 0.005; // shadow gap around flush doors
const SHADOW = "#3b3b3b"; // carcass seen through the gaps

/**
 * Expand a built-in cupboard into boxes, front face toward `facing`. Pure.
 * - sliding: carcass, leaves on two offset tracks, a finger pull on each
 * - flush: doors in the wall plane with shadow gaps, nothing else visible
 */
export function expandCloset(c: ClosetDef): FurnitureDef[] {
  const [minX, minZ, maxX, maxZ] = c.rect;
  const [fx, fz] = facingVector(c.facing);
  const alongX = fx === 0; // doors run along x when the cupboard faces ±z
  const [a0, a1] = alongX ? [minX, maxX] : [minZ, maxZ];
  // front plane = the rect edge on the facing side
  const front = fx > 0 ? maxX : fx < 0 ? minX : fz > 0 ? maxZ : minZ;
  const out = fx + fz; // +1 or -1: direction from the carcass toward the room
  const depthBand = (d0: number, d1: number): [number, number] => {
    const p = front + out * d0;
    const q = front + out * d1;
    return [Math.min(p, q), Math.max(p, q)];
  };
  const box = (s0: number, s1: number, d: [number, number]): Rect =>
    alongX ? [s0, d[0], s1, d[1]] : [d[0], s0, d[1], s1];

  const depth = alongX ? maxZ - minZ : maxX - minX;
  if (c.style === "flush") {
    const items: FurnitureDef[] = [
      {
        name: `${c.name} (caisson)`,
        rect: box(a0, a1, depthBand(-depth, -LEAF)),
        h: c.height,
        color: SHADOW,
      },
    ];
    const doorWidth = (a1 - a0) / c.doors;
    for (let i = 0; i < c.doors; i++) {
      const s0 = a0 + i * doorWidth + FLUSH_GAP / 2;
      const s1 = a0 + (i + 1) * doorWidth - FLUSH_GAP / 2;
      items.push({
        name: `${c.name} (porte)`,
        rect: box(s0, s1, depthBand(-LEAF, 0)),
        y: FLUSH_GAP,
        h: c.height - 2 * FLUSH_GAP,
        color: c.color,
        finish: c.finish,
      });
    }
    return items;
  }

  const carcassDepth = depthBand(-depth, -LEAF - TRACK - 0.005);
  const items: FurnitureDef[] = [
    { name: `${c.name} (caisson)`, rect: box(a0, a1, carcassDepth), h: c.height, color: c.color },
  ];
  const leafWidth = (a1 - a0) / c.doors;
  // sliding leaves overlap by 3 cm, alternating tracks
  for (let i = 0; i < c.doors; i++) {
    const s0 = a0 + i * leafWidth - (i > 0 ? 0.015 : 0);
    const s1 = a0 + (i + 1) * leafWidth + (i < c.doors - 1 ? 0.015 : 0);
    // front track flush with the opening, back track just behind it
    const track = i % 2 === 0 ? depthBand(-LEAF, 0) : depthBand(-LEAF - TRACK, -TRACK);
    items.push({
      name: `${c.name} (porte)`,
      rect: box(s0, s1, track),
      h: c.height - 0.01,
      color: c.color,
      finish: c.finish,
    });
    // finger pull near the leaf's free edge (toward the middle)
    const pullAt = i % 2 === 0 ? s1 - 0.06 : s0 + 0.06;
    const pullDepth: [number, number] = [Math.min(...track) - 0.001, Math.max(...track) + 0.001];
    items.push({
      name: `${c.name} (poignée)`,
      rect: box(pullAt - PULL.width / 2, pullAt + PULL.width / 2, pullDepth),
      y: PULL.y,
      h: PULL.height,
      color: c.pullColor,
      solid: false,
    });
  }
  return items;
}
