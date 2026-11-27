/**
 * Pixel processing of the photo scans (RGBA bytes), baked into the KTX2
 * textures by scripts/encode-ktx2.ts. Pure, so it runs in Node.
 */

type Pixels = Uint8Array | Uint8ClampedArray;

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

const luma = (data: Pixels, i: number) =>
  0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

function meanLuma(data: Pixels): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += luma(data, i);
  return sum / (data.length / 4) || 1;
}

/** Grayscale with the mean brought to ~0.85, so tinting keeps the detail. */
export function normalizeGray(data: Pixels): void {
  const gain = (0.85 * 255) / meanLuma(data);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = clamp(luma(data, i) * gain);
  }
}

/** Scale RGB so the mean brightness becomes `target` (0–1), colors kept. */
export function normalizeBrightness(data: Pixels, target: number): void {
  const gain = (target * 255) / meanLuma(data);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(data[i] * gain);
    data[i + 1] = clamp(data[i + 1] * gain);
    data[i + 2] = clamp(data[i + 2] * gain);
  }
}

/**
 * Grout lines over a square tile: two columns of tiles (a vertical joint at
 * the edge and in the middle) and a horizontal joint at the edge, 2 px wide
 * per 1024 px, gray 0.45 at 90 %.
 */
export function drawGrout(data: Pixels, size: number): void {
  const w = size / 1024;
  const half = size / 2;
  const grout = 0.45 * 255;
  for (let y = 0; y < size; y++) {
    const row = y < w || y >= size - w;
    for (let x = 0; x < size; x++) {
      const col = x % half < w || x % half >= half - w;
      if (!row && !col) continue;
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) data[i + c] = clamp(data[i + c] * 0.1 + grout * 0.9);
    }
  }
}
