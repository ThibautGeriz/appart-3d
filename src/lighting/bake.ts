import { faceAxes, type Atlas, type Axis, type Occluder } from "./lightmap";

/*
 * Lightmap baker: a small CPU path tracer over axis-aligned boxes. For each
 * texel, cosine-weighted rays over the hemisphere: rays escaping the
 * building see the sky (brighter towards the zenith) or the ground; rays
 * hitting a surface see its reflected light from the previous pass. Pass 0
 * is the sky only, then `bounces` more. Values are relative to an open
 * horizontal surface under the same sky (1). Pure and deterministic (seeded).
 */

export interface BakeOptions {
  rays?: number;
  bounces?: number;
  /** radiance of the ground seen below the horizon (relative to the sky) */
  ground?: number;
  seed?: number;
  /** progress callback (0–1) */
  onProgress?: (done: number) => void;
}

/** Sky radiance seen in direction (dy = its height), normalised so an open floor gets 1. */
const SKY_NORMALISE = 1 / (0.6 + 0.4 * (2 / 3));
const skyRadiance = (dy: number) => (0.6 + 0.4 * dy) * SKY_NORMALISE;

/** Uniform grid over the occluders, cells listing the boxes overlapping them. */
interface Grid {
  min: [number, number, number];
  size: number;
  n: [number, number, number];
  start: Int32Array;
  items: Int32Array;
  boxes: Float64Array; // minX minY minZ maxX maxY maxZ per box
}

function buildGrid(occ: Occluder[], size = 0.25): Grid {
  const boxes = new Float64Array(occ.length * 6);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  occ.forEach(({ box: b }, i) => {
    boxes.set([b.minX, b.minY, b.minZ, b.maxX, b.maxY, b.maxZ], i * 6);
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], boxes[i * 6 + a]);
      max[a] = Math.max(max[a], boxes[i * 6 + 3 + a]);
    }
  });
  for (let a = 0; a < 3; a++) {
    min[a] -= 0.01;
    max[a] += 0.01;
  }
  const n: [number, number, number] = [0, 1, 2].map((a) =>
    Math.max(1, Math.ceil((max[a] - min[a]) / size)),
  ) as [number, number, number];
  const cells: number[][] = Array.from({ length: n[0] * n[1] * n[2] }, () => []);
  const cell = (v: number, a: number) =>
    Math.min(n[a] - 1, Math.max(0, Math.floor((v - min[a]) / size)));
  occ.forEach((_, i) => {
    const c0 = [0, 1, 2].map((a) => cell(boxes[i * 6 + a], a));
    const c1 = [0, 1, 2].map((a) => cell(boxes[i * 6 + 3 + a], a));
    for (let x = c0[0]; x <= c1[0]; x++)
      for (let y = c0[1]; y <= c1[1]; y++)
        for (let z = c0[2]; z <= c1[2]; z++) cells[(z * n[1] + y) * n[0] + x].push(i);
  });
  const start = new Int32Array(cells.length + 1);
  cells.forEach((c, i) => (start[i + 1] = start[i] + c.length));
  const items = new Int32Array(start[cells.length]);
  cells.forEach((c, i) => items.set(c, start[i]));
  return { min, size, n, start, items, boxes };
}

/** Nearest box hit: [box, t, face (0–5: -x +x -y +y -z +z)], or box -1. */
function trace(
  g: Grid,
  o: number[],
  d: number[],
  stamp: Int32Array,
  ray: number,
  out: number[],
): void {
  const { min, size, n, start, items, boxes } = g;
  // enter the grid
  let t0 = 0;
  let t1 = Infinity;
  for (let a = 0; a < 3; a++) {
    const lo = min[a];
    const hi = min[a] + n[a] * size;
    if (Math.abs(d[a]) < 1e-12) {
      if (o[a] < lo || o[a] > hi) {
        out[0] = -1;
        return;
      }
    } else {
      let ta = (lo - o[a]) / d[a];
      let tb = (hi - o[a]) / d[a];
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
    }
  }
  if (t0 > t1) {
    out[0] = -1;
    return;
  }
  const p = [o[0] + d[0] * t0, o[1] + d[1] * t0, o[2] + d[2] * t0];
  const c = [0, 1, 2].map((a) =>
    Math.min(n[a] - 1, Math.max(0, Math.floor((p[a] - min[a]) / size))),
  );
  const step = [0, 1, 2].map((a) => (d[a] > 0 ? 1 : -1));
  const tMax = [0, 1, 2].map((a) =>
    Math.abs(d[a]) < 1e-12 ? Infinity : (min[a] + (c[a] + (d[a] > 0 ? 1 : 0)) * size - o[a]) / d[a],
  );
  const tDelta = [0, 1, 2].map((a) => (Math.abs(d[a]) < 1e-12 ? Infinity : size / Math.abs(d[a])));
  let best = Infinity;
  let bestBox = -1;
  let bestFace = 0;
  for (;;) {
    const ci = (c[2] * n[1] + c[1]) * n[0] + c[0];
    for (let k = start[ci]; k < start[ci + 1]; k++) {
      const b = items[k];
      if (stamp[b] === ray) continue;
      stamp[b] = ray;
      // slab test, remembering which slab we entered through
      let near = -Infinity;
      let far = Infinity;
      let face = 0;
      let miss = false;
      for (let a = 0; a < 3 && !miss; a++) {
        const lo = boxes[b * 6 + a];
        const hi = boxes[b * 6 + 3 + a];
        if (Math.abs(d[a]) < 1e-12) {
          if (o[a] <= lo || o[a] >= hi) miss = true;
          continue;
        }
        let ta = (lo - o[a]) / d[a];
        let tb = (hi - o[a]) / d[a];
        let entering = 0; // the -a face
        if (ta > tb) {
          [ta, tb] = [tb, ta];
          entering = 1; // the +a face
        }
        if (ta > near) {
          near = ta;
          face = a * 2 + entering;
        }
        far = Math.min(far, tb);
        if (near > far) miss = true;
      }
      if (!miss && near <= 1e-5 && far > 1e-5) {
        // the ray starts inside a solid (a floor texel under a cabinet): no light
        out[0] = b;
        out[1] = 0;
        out[2] = -1;
        return;
      }
      if (!miss && near > 1e-5 && near < best) {
        best = near;
        bestBox = b;
        bestFace = face;
      }
    }
    // the nearest hit so far is final once we leave the cell beyond it
    const next = Math.min(tMax[0], tMax[1], tMax[2]);
    if (bestBox >= 0 && best <= next) break;
    const a = tMax[0] === next ? 0 : tMax[1] === next ? 1 : 2;
    c[a] += step[a];
    if (c[a] < 0 || c[a] >= n[a]) break;
    tMax[a] += tDelta[a];
  }
  out[0] = bestBox;
  out[1] = best;
  out[2] = bestFace;
}

/** Deterministic PRNG (mulberry32). */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** World position of the centre of texel (i, j) of a chart, nudged inside the face. */
function texelPoint(
  face: Atlas["charts"][number]["face"],
  i: number,
  j: number,
  texel: number,
): number[] {
  const [ua, va] = faceAxes(face.axis);
  const p = [0, 0, 0];
  p[face.axis] = face.plane + face.sign * 2e-4;
  p[ua] = Math.min(face.u0 + (i + 0.5) * texel, face.u1 - 1e-4);
  p[va] = Math.min(face.v0 + (j + 0.5) * texel, face.v1 - 1e-4);
  return p;
}

/**
 * Bake the atlas: returns linear RGB per texel (atlas.texels × 3), chart by
 * chart, row by row. Pure (deterministic for a seed).
 */
export function bake(atlas: Atlas, occ: Occluder[], options: BakeOptions = {}): Float32Array {
  const { rays = 64, bounces = 2, ground = 0.15, seed = 1, onProgress } = options;
  const texel = atlas.texel;
  const grid = buildGrid(occ);
  const stamp = new Int32Array(occ.length).fill(-1);
  const T = atlas.texels;
  // per ray: the texel it lands on (≥ 0), or the radiance it saw outside (stored in `sky`)
  const hitTexel = new Int32Array(T * rays).fill(-1);
  const sky = new Float32Array(T * rays);
  const random = rng(seed);
  const strata = Math.round(Math.sqrt(rays));
  const out = [0, 0, 0];
  let rayId = 0;
  for (const [ci, chart] of atlas.charts.entries()) {
    const f = chart.face;
    const [ua, va] = faceAxes(f.axis);
    for (let j = 0; j < chart.nv; j++) {
      for (let i = 0; i < chart.nu; i++) {
        const t = chart.offset + j * chart.nu + i;
        const o = texelPoint(f, i, j, texel);
        for (let r = 0; r < rays; r++) {
          // stratified cosine-weighted direction around the face normal
          const su = ((r % strata) + random()) / strata;
          const sv = ((Math.floor(r / strata) % strata) + random()) / strata;
          const radius = Math.sqrt(su);
          const phi = 2 * Math.PI * sv;
          const d = [0, 0, 0];
          d[f.axis] = f.sign * Math.sqrt(Math.max(0, 1 - su));
          d[ua] = radius * Math.cos(phi);
          d[va] = radius * Math.sin(phi);
          trace(grid, o, d, stamp, rayId++, out);
          const k = t * rays + r;
          if (out[0] < 0) {
            sky[k] = d[1] > 0 ? skyRadiance(d[1]) : ground;
            continue;
          }
          if (out[2] < 0) continue; // inside a solid: black
          const chartIndex = occ[out[0]].charts[out[2]];
          if (chartIndex < 0) continue; // an unlit hidden face: black
          const hitChart = atlas.charts[chartIndex];
          const hf = hitChart.face;
          const [hu, hv] = faceAxes(hf.axis as Axis);
          const hit = [o[0] + d[0] * out[1], o[1] + d[1] * out[1], o[2] + d[2] * out[1]];
          const ti = Math.min(hitChart.nu - 1, Math.max(0, Math.floor((hit[hu] - hf.u0) / texel)));
          const tj = Math.min(hitChart.nv - 1, Math.max(0, Math.floor((hit[hv] - hf.v0) / texel)));
          hitTexel[k] = hitChart.offset + tj * hitChart.nu + ti;
        }
      }
    }
    onProgress?.(((ci + 1) / atlas.charts.length) * 0.9);
    void ci;
  }
  // albedo of each texel's face
  const albedo = new Float32Array(T * 3);
  for (const chart of atlas.charts) {
    for (let t = 0; t < chart.nu * chart.nv; t++)
      albedo.set(chart.face.albedo, (chart.offset + t) * 3);
  }
  // passes: sky, then bounces gathering the previous pass
  let light = new Float32Array(T * 3);
  for (let pass = 0; pass <= bounces; pass++) {
    const next = new Float32Array(T * 3);
    for (let t = 0; t < T; t++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let k = t * rays; k < (t + 1) * rays; k++) {
        const h = hitTexel[k];
        if (h < 0) {
          r += sky[k];
          g += sky[k];
          b += sky[k];
        } else if (pass > 0) {
          r += albedo[h * 3] * light[h * 3];
          g += albedo[h * 3 + 1] * light[h * 3 + 1];
          b += albedo[h * 3 + 2] * light[h * 3 + 2];
        }
      }
      next[t * 3] = r / rays;
      next[t * 3 + 1] = g / rays;
      next[t * 3 + 2] = b / rays;
    }
    light = next;
  }
  onProgress?.(1);
  return light;
}

/** Mean light over the given faces (area-weighted), e.g. the interior floors. Pure. */
export function meanLight(atlas: Atlas, light: Float32Array, keys: Set<string>): number {
  let sum = 0;
  let n = 0;
  for (const c of atlas.charts) {
    if (!keys.has(c.face.key)) continue;
    for (let t = 0; t < c.nu * c.nv; t++) {
      const k = (c.offset + t) * 3;
      sum += (light[k] + light[k + 1] + light[k + 2]) / 3;
      n++;
    }
  }
  return n ? sum / n : 1;
}

/**
 * Light → RGBA8 atlas image: a small blur within each chart (the bake's
 * noise), padding texels copied from their neighbours (no seams), values
 * divided by `range` and sRGB-encoded. Pure.
 */
export function encodeAtlas(atlas: Atlas, light: Float32Array, range: number): Uint8Array {
  const { width, height } = atlas;
  const img = new Uint8Array(width * height * 4);
  const enc = (v: number) => {
    const x = Math.min(1, Math.max(0, v / range));
    return Math.round((x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055) * 255);
  };
  for (const c of atlas.charts) {
    const at = (i: number, j: number, ch: number) =>
      light[
        (c.offset +
          Math.min(c.nv - 1, Math.max(0, j)) * c.nu +
          Math.min(c.nu - 1, Math.max(0, i))) *
          3 +
          ch
      ];
    for (let j = -1; j <= c.nv; j++) {
      for (let i = -1; i <= c.nu; i++) {
        const p = ((c.y + j) * width + (c.x + i)) * 4;
        for (let ch = 0; ch < 3; ch++) {
          // 5×5 tent blur, clamped to the chart: indirect light is smooth, the bake's noise is not
          let s = 0;
          let w = 0;
          for (let dj = -2; dj <= 2; dj++)
            for (let di = -2; di <= 2; di++) {
              const k = (3 - Math.abs(di)) * (3 - Math.abs(dj));
              s += at(i + di, j + dj, ch) * k;
              w += k;
            }
          img[p + ch] = enc(s / w);
        }
        img[p + 3] = 255;
      }
    }
  }
  return img;
}
