import * as THREE from "three";
import type { Finish } from "../data/apartment";
import woodFloorUrl from "../assets/textures/wood_floor.jpg";
import oakVeneerUrl from "../assets/textures/oak_veneer_01.jpg";
import concreteUrl from "../assets/textures/smooth_concrete_floor.jpg";

/**
 * Surface textures: CC0 photo scans (wood, stone, see src/assets/textures)
 * and procedural canvas patterns. Textures are multiplied by the material
 * color from the data, so the data keeps control of the tint.
 */

const SIZE = 512; // px for procedural patterns
const PHOTO_SIZE = 1024; // px, the texture budget cap

interface FinishSpec {
  /** real-world size of one texture tile, meters (u, v) */
  size: [number, number];
  draw?: (ctx: CanvasRenderingContext2D, random: () => number) => void;
  /** photo scan drawn first (then `draw` on top, e.g. grout lines) */
  photo?: string;
  /** turn the photo to normalized gray, so the material color sets the tint */
  grayscale?: boolean;
  /** rescale the photo so its mean brightness is this (0–1), keeping its colors */
  brightness?: number;
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
  // Oak plank floor (photo scan, planks along v)
  parquet: { size: [1.7, 1.7], photo: woodFloorUrl, brightness: 0.62 },
  tile30: { size: [0.6, 0.6], draw: (ctx, random) => tiles(ctx, random, 2) },
  tile60: { size: [1.2, 1.2], draw: (ctx, random) => tiles(ctx, random, 2) },
  oak: { size: [0.9, 0.9], photo: oakVeneerUrl, brightness: 0.5 },
  // Matte lacquered fronts: fine paint grain, soft vertical roller marks and
  // a gentle light falloff, so flat fronts do not look like plastic
  lacquer: {
    size: [0.6, 0.8],
    draw: (ctx, random) => {
      const g = ctx.createLinearGradient(0, 0, 0, SIZE);
      g.addColorStop(0, gray(1));
      g.addColorStop(1, gray(0.93));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, SIZE, SIZE);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = gray(0.9 + random() * 0.1, 0.12);
        ctx.fillRect(random() * SIZE, 0, 1 + random() * 3, SIZE);
      }
      speckle(ctx, random, 12000, 0.86, 1, 1.5);
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
  // Dark mottled stone worktop: gray concrete scan tinted near-black
  stone: { size: [1, 1], photo: concreteUrl, grayscale: true },
  // Large 60 × 120 cm porcelain tiles, concrete look (long side along v,
  // i.e. along a wall running in z)
  kitchenTile: {
    size: [1.2, 1.2],
    photo: concreteUrl,
    grayscale: true,
    draw: (ctx) => {
      ctx.strokeStyle = gray(0.45, 0.9);
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, PHOTO_SIZE / 2, PHOTO_SIZE);
      ctx.strokeRect(PHOTO_SIZE / 2, 0, PHOTO_SIZE / 2, PHOTO_SIZE);
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

const luma = (data: Uint8ClampedArray, i: number) =>
  0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

function meanLuma(data: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += luma(data, i);
  return sum / (data.length / 4) || 1;
}

/** Grayscale with the mean brought to ~0.85, so tinting keeps the detail. Pure. */
export function normalizeGray(data: Uint8ClampedArray): void {
  const gain = (0.85 * 255) / meanLuma(data);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = luma(data, i) * gain;
  }
}

/** Scale RGB so the mean brightness becomes `target` (0–1), colors kept. Pure. */
export function normalizeBrightness(data: Uint8ClampedArray, target: number): void {
  const gain = (target * 255) / meanLuma(data);
  for (let i = 0; i < data.length; i += 4) {
    data[i] *= gain;
    data[i + 1] *= gain;
    data[i + 2] *= gain;
  }
}

function finishTexture(finish: Finish): THREE.CanvasTexture {
  const cached = textureCache.get(finish);
  if (cached) return cached;
  const spec = FINISHES[finish];
  const size = spec.photo ? PHOTO_SIZE : SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const random = seeded(finish.length * 7919 + 17);
  const texture = new THREE.CanvasTexture(canvas);
  if (spec.photo) {
    // Neutral placeholder until the scan has loaded
    ctx.fillStyle = gray(0.85);
    ctx.fillRect(0, 0, size, size);
    const image = new Image();
    image.onload = () => {
      ctx.drawImage(image, 0, 0, size, size);
      if (spec.grayscale || spec.brightness) {
        const pixels = ctx.getImageData(0, 0, size, size);
        if (spec.grayscale) normalizeGray(pixels.data);
        if (spec.brightness) normalizeBrightness(pixels.data, spec.brightness);
        ctx.putImageData(pixels, 0, 0);
      }
      spec.draw?.(ctx, random);
      texture.needsUpdate = true;
    };
    image.src = spec.photo;
  } else {
    spec.draw?.(ctx, random);
  }
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(finish, texture);
  return texture;
}

/** Shared Lambert material for a color + optional finish (and opacity). */
export function surfaceMaterial(
  color: string,
  finish?: Finish,
  opacity = 1,
): THREE.MeshLambertMaterial {
  const key = `${color}|${finish ?? ""}|${opacity}`;
  const cached = materialCache.get(key);
  if (cached) return cached;
  const material = new THREE.MeshLambertMaterial({
    color,
    map: finish ? finishTexture(finish) : null,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
  materialCache.set(key, material);
  return material;
}
