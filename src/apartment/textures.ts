import * as THREE from "three";
import type { Finish } from "../data/apartment";

/**
 * Procedural surface textures (no image assets to ship). Textures are drawn
 * near-white and multiplied by the material color from the data, so the data
 * keeps control of the colors and the texture only adds detail.
 */

const SIZE = 512; // px, well under the 1024 px budget

interface FinishSpec {
  /** real-world size of one texture tile, meters (u, v) */
  size: [number, number];
  draw: (ctx: CanvasRenderingContext2D, random: () => number) => void;
}

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const gray = (v: number, alpha = 1) => {
  const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgba(${c},${c},${c},${alpha})`;
};

/** Fine random speckles, for plaster, stone and grass. */
function speckle(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  count: number,
  min: number,
  max: number,
  radius: number,
): void {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = gray(min + random() * (max - min), 0.5);
    const r = radius * (0.5 + random());
    ctx.fillRect(random() * SIZE, random() * SIZE, r, r);
  }
}

/** Wavy darker lines along v (wood grain) inside a rectangle. */
function grain(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  x: number,
  y: number,
  w: number,
  h: number,
  lines: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = 0; i < lines; i++) {
    const gx = x + random() * w;
    const amp = 1 + random() * 3;
    const freq = 0.01 + random() * 0.03;
    ctx.strokeStyle = gray(0.62 + random() * 0.2, 0.35);
    ctx.lineWidth = 0.5 + random() * 1.5;
    ctx.beginPath();
    for (let gy = y; gy <= y + h; gy += 8) {
      const px = gx + Math.sin(gy * freq + i) * amp;
      if (gy === y) ctx.moveTo(px, gy);
      else ctx.lineTo(px, gy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function tiles(ctx: CanvasRenderingContext2D, random: () => number, perSide: number): void {
  const tile = SIZE / perSide;
  for (let i = 0; i < perSide; i++) {
    for (let j = 0; j < perSide; j++) {
      ctx.fillStyle = gray(0.9 + random() * 0.1);
      ctx.fillRect(i * tile, j * tile, tile, tile);
    }
  }
  speckle(ctx, random, 3000, 0.75, 1, 2);
  ctx.strokeStyle = gray(0.62);
  ctx.lineWidth = 3;
  for (let k = 0; k <= perSide; k++) {
    ctx.beginPath();
    ctx.moveTo(k * tile, 0);
    ctx.lineTo(k * tile, SIZE);
    ctx.moveTo(0, k * tile);
    ctx.lineTo(SIZE, k * tile);
    ctx.stroke();
  }
}

const FINISHES: Record<Finish, FinishSpec> = {
  plaster: {
    size: [2, 2],
    draw: (ctx, random) => {
      ctx.fillStyle = gray(0.97);
      ctx.fillRect(0, 0, SIZE, SIZE);
      speckle(ctx, random, 6000, 0.95, 1, 2);
    },
  },
  // Plank floor: 8 planks of 15 cm across, 1.2 m long, staggered joints
  parquet: {
    size: [1.2, 1.2],
    draw: (ctx, random) => {
      const plank = SIZE / 8;
      for (let i = 0; i < 8; i++) {
        const joint = random() * SIZE;
        for (const [y0, y1] of [
          [joint - SIZE, joint],
          [joint, joint + SIZE],
        ]) {
          ctx.fillStyle = gray(0.82 + random() * 0.18);
          ctx.fillRect(i * plank, y0, plank, y1 - y0);
          grain(
            ctx,
            random,
            i * plank,
            Math.max(0, y0),
            plank,
            Math.min(SIZE, y1) - Math.max(0, y0),
            7,
          );
        }
        ctx.fillStyle = gray(0.45, 0.8);
        ctx.fillRect(i * plank, joint - 1, plank, 2);
        ctx.fillRect(i * plank, 0, 1.5, SIZE);
      }
    },
  },
  tile30: { size: [0.6, 0.6], draw: (ctx, random) => tiles(ctx, random, 2) },
  tile60: { size: [1.2, 1.2], draw: (ctx, random) => tiles(ctx, random, 2) },
  oak: {
    size: [0.6, 0.7],
    draw: (ctx, random) => {
      ctx.fillStyle = gray(0.92);
      ctx.fillRect(0, 0, SIZE, SIZE);
      grain(ctx, random, 0, 0, SIZE, SIZE, 60);
      ctx.fillStyle = gray(0.4);
      ctx.fillRect(0, 0, 3, SIZE);
    },
  },
  // Base unit fronts: one 60 × 76 cm door per tile with a thin shadow gap
  cabinet: {
    size: [0.6, 0.76],
    draw: (ctx, random) => {
      ctx.fillStyle = gray(1);
      ctx.fillRect(0, 0, SIZE, SIZE);
      speckle(ctx, random, 1500, 0.92, 1, 2);
      ctx.strokeStyle = gray(0.35);
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, SIZE, SIZE);
    },
  },
  cabinetTall: {
    size: [0.6, 2.0],
    draw: (ctx, random) => {
      ctx.fillStyle = gray(1);
      ctx.fillRect(0, 0, SIZE, SIZE);
      speckle(ctx, random, 1500, 0.92, 1, 2);
      ctx.strokeStyle = gray(0.35);
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, SIZE, SIZE);
      // split between the fridge door and the freezer door
      ctx.fillStyle = gray(0.35);
      ctx.fillRect(0, SIZE * 0.36, SIZE, 3);
    },
  },
  stone: {
    size: [0.6, 0.6],
    draw: (ctx, random) => {
      ctx.fillStyle = gray(0.85);
      ctx.fillRect(0, 0, SIZE, SIZE);
      speckle(ctx, random, 14000, 0.5, 1.6, 2.5);
    },
  },
  grass: {
    size: [6, 6],
    draw: (ctx, random) => {
      ctx.fillStyle = gray(0.9);
      ctx.fillRect(0, 0, SIZE, SIZE);
      speckle(ctx, random, 20000, 0.6, 1.1, 3);
    },
  },
  // Residential façade: one 2.5 m bay × one 3 m storey, with a window
  facade: {
    size: [2.5, 3],
    draw: (ctx, random) => {
      ctx.fillStyle = gray(0.96);
      ctx.fillRect(0, 0, SIZE, SIZE);
      speckle(ctx, random, 3000, 0.85, 1, 3);
      const wx = SIZE * 0.22;
      const wy = SIZE * 0.2;
      const ww = SIZE * 0.56;
      const wh = SIZE * 0.55;
      ctx.fillStyle = gray(0.25);
      ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = gray(0.45);
      ctx.fillRect(wx + 6, wy + 6, ww / 2 - 9, wh - 12);
      ctx.fillRect(wx + ww / 2 + 3, wy + 6, ww / 2 - 9, wh - 12);
    },
  },
};

const textureCache = new Map<Finish, THREE.CanvasTexture>();
const materialCache = new Map<string, THREE.MeshLambertMaterial>();

/** Real-world size of one tile of a finish (for world-space UVs). */
export function finishSize(finish: Finish): [number, number] {
  return FINISHES[finish].size;
}

function finishTexture(finish: Finish): THREE.CanvasTexture {
  const cached = textureCache.get(finish);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  FINISHES[finish].draw(ctx, seeded(finish.length * 7919 + 17));
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(finish, texture);
  return texture;
}

/** Shared Lambert material for a color + optional finish. */
export function surfaceMaterial(color: string, finish?: Finish): THREE.MeshLambertMaterial {
  const key = `${color}|${finish ?? ""}`;
  const cached = materialCache.get(key);
  if (cached) return cached;
  const material = new THREE.MeshLambertMaterial({
    color,
    map: finish ? finishTexture(finish) : null,
  });
  materialCache.set(key, material);
  return material;
}
