import type { ApartmentDef, Finish } from "../data/apartment";
import { allFurniture, wallPieces, type Box } from "../apartment/plan";

/*
 * Baked lighting (lightmap) for the fixed architecture: walls, floors,
 * ceilings, built-in furniture. Pure, shared by the app (lightmap UVs) and
 * the baker (scripts/bake-lightmap.ts), so both see the exact same layout.
 *
 * Exposure: indoors gets only a few % of the open-sky light (daylight
 * factor). Like a camera adapting, the stored values are divided by the mean
 * over the interior floors, so the overall brightness stays what the flat
 * ambient gave before, and the map adds the real variation: brighter by the
 * windows, darker in corners and under furniture, bounce colours.
 *
 * Every receiving surface is an axis-aligned rectangle (a box face). Each
 * gets a chart in one atlas, one texel per LIGHTMAP_TEXEL metres. The baked
 * value is the sky light reaching that point (through the window openings,
 * with two bounces off coloured surfaces), relative to an open horizontal
 * surface under the same sky: 1 = open sky, 0 = no light. At runtime it is
 * scaled by the current daylight / lamp ambient (what the hemisphere light
 * gave everywhere before).
 */

export const LIGHTMAP_TEXEL = 0.06;
export const LIGHTMAP_WIDTH = 1024;
/** Stored values are divided by this (near the windows the light is several times the room's mean). */
export const LIGHTMAP_RANGE = 4;

/** 0 = x, 1 = y, 2 = z */
export type Axis = 0 | 1 | 2;

/** A receiving rectangle: normal along `axis` (`sign`), at `plane`, spanning u × v. */
export interface Face {
  key: string;
  axis: Axis;
  sign: 1 | -1;
  plane: number;
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  /** linear RGB reflectance, for the bounces */
  albedo: [number, number, number];
}

/** A face's place in the atlas: texel (x, y) of its first texel, nu × nv texels. */
export interface Chart {
  face: Face;
  x: number;
  y: number;
  nu: number;
  nv: number;
  /** index of its first texel in the flat texel list (baker) */
  offset: number;
}

export interface Atlas {
  width: number;
  height: number;
  /** metres per texel */
  texel: number;
  charts: Chart[];
  byKey: Map<string, Chart>;
  texels: number;
  /** changes whenever the layout does: a stale bake is detected and skipped */
  signature: string;
}

/** An opaque box blocking light, with the chart (or -1) of each face: -x +x -y +y -z +z. */
export interface Occluder {
  box: Box;
  charts: number[];
}

/** (u, v) axes of a face whose normal is along `axis`. */
export function faceAxes(axis: Axis): [Axis, Axis] {
  return axis === 0 ? [2, 1] : axis === 1 ? [0, 2] : [0, 1];
}

const lo = (b: Box, a: Axis) => (a === 0 ? b.minX : a === 1 ? b.minY : b.minZ);
const hi = (b: Box, a: Axis) => (a === 0 ? b.maxX : a === 1 ? b.maxY : b.maxZ);
const mm = (x: number) => Math.round(x * 1000);

export function faceKey(
  axis: Axis,
  sign: 1 | -1,
  plane: number,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
): string {
  return `${axis}${sign > 0 ? "+" : "-"}${mm(plane)}:${mm(u0)},${mm(u1)}:${mm(v0)},${mm(v1)}`;
}

/** The face of a box on the side `sign` of `axis`. Pure. */
export function boxFace(b: Box, axis: Axis, sign: 1 | -1, albedo: Face["albedo"]): Face {
  const [ua, va] = faceAxes(axis);
  const plane = sign > 0 ? hi(b, axis) : lo(b, axis);
  const [u0, u1, v0, v1] = [lo(b, ua), hi(b, ua), lo(b, va), hi(b, va)];
  return {
    key: faceKey(axis, sign, plane, u0, u1, v0, v1),
    axis,
    sign,
    plane,
    u0,
    u1,
    v0,
    v1,
    albedo,
  };
}

// ── Reflectance of the finishes (linear RGB, the texture's mean × the colour) ──

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function hexToLinear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [
    srgbToLinear(((n >> 16) & 255) / 255),
    srgbToLinear(((n >> 8) & 255) / 255),
    srgbToLinear((n & 255) / 255),
  ];
}

/** Mean reflectance of each finish's texture (multiplied by the item's colour). */
const FINISH_ALBEDO: Partial<Record<Finish, [number, number, number]>> = {
  plaster: [0.69, 0.69, 0.69],
  parquet: [0.42, 0.27, 0.15],
  oak: [0.38, 0.25, 0.14],
  stone: [0.3, 0.3, 0.3],
  kitchenTile: [0.3, 0.3, 0.3],
  showerWall: [0.75, 0.75, 0.75],
  showerFloor: [0.3, 0.3, 0.3],
  lacquer: [0.8, 0.8, 0.8],
  tile30: [0.75, 0.75, 0.75],
  tile60: [0.7, 0.7, 0.7],
  cabinet: [0.8, 0.8, 0.8],
  cabinetTall: [0.8, 0.8, 0.8],
};

export function albedoOf(color: string, finish?: Finish): [number, number, number] {
  const c = hexToLinear(color);
  const f = (finish && FINISH_ALBEDO[finish]) || [1, 1, 1];
  return [c[0] * f[0], c[1] * f[1], c[2] * f[2]];
}

// ── The baked scene ───────────────────────────────────────────────────────

export interface BakeScene {
  faces: Face[];
  occluders: { box: Box; faces: (Face | null)[] }[];
}

const SLAB = 0.1;

/**
 * The fixed architecture as boxes, and which of their faces receive baked
 * light (hidden faces, like a wall's top under the ceiling, do not). Pure.
 */
export function bakeScene(def: ApartmentDef): BakeScene {
  const faces: Face[] = [];
  const occluders: BakeScene["occluders"] = [];
  const add = (
    box: Box,
    albedo: Face["albedo"],
    receives: (axis: Axis, sign: 1 | -1) => boolean,
  ) => {
    const own: (Face | null)[] = [];
    for (const axis of [0, 1, 2] as Axis[]) {
      for (const sign of [-1, 1] as const) {
        const extent = faceAxes(axis).every((a) => hi(box, a) - lo(box, a) > 1e-4);
        if (extent && receives(axis, sign)) {
          const f = boxFace(box, axis, sign, albedo);
          faces.push(f);
          own.push(f);
        } else own.push(null);
      }
    }
    occluders.push({ box, faces: own });
  };
  const wallAlbedo = albedoOf(def.wallColor, def.wallFinish);
  const H = def.wallHeight;
  for (const wall of def.walls) {
    const pieces = wallPieces(wall, H);
    for (const b of pieces.solid) {
      // sides, a sill's top, a lintel's underside; not the top under the ceiling nor the bottom on the floor
      add(
        b,
        wallAlbedo,
        (axis, sign) => axis !== 1 || (sign > 0 ? b.maxY < H - 1e-6 : b.minY > 1e-6),
      );
    }
    for (const leaf of pieces.leaves) add(leaf.box, albedoOf(leaf.color), (axis) => axis !== 1);
  }
  const ceilingAlbedo = albedoOf(def.ceilingColor, def.ceilingFinish);
  for (const area of def.areas) {
    const [minX, minZ, maxX, maxZ] = area.rect;
    const floor = { minX, maxX, minZ, maxZ, minY: -SLAB, maxY: 0 };
    add(floor, albedoOf(area.floorColor, area.floorFinish), (axis, sign) => axis === 1 && sign > 0);
    if (area.outdoor) continue;
    add(
      { minX, maxX, minZ, maxZ, minY: H, maxY: H + SLAB },
      ceilingAlbedo,
      (axis, sign) => axis === 1 && sign < 0,
    );
    if (area.ceiling !== undefined && area.ceiling < H) {
      // lowered ceiling: its underside and its sides
      add(
        { minX, maxX, minZ, maxZ, minY: area.ceiling, maxY: H },
        ceilingAlbedo,
        (axis, sign) => axis !== 1 || sign < 0,
      );
    }
  }
  for (const item of allFurniture(def)) {
    if (item.model || (item.opacity ?? 1) < 1) continue;
    const y = item.y ?? 0;
    const [minX, minZ, maxX, maxZ] = item.rect;
    const box = { minX, maxX, minZ, maxZ, minY: y, maxY: y + item.h };
    add(
      box,
      albedoOf(item.color, item.finish),
      (axis, sign) => !(axis === 1 && sign < 0 && y < 1e-6),
    );
  }
  return { faces, occluders };
}

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Pack every face into the atlas (shelves, tallest first), each chart padded
 * by one texel so bilinear filtering does not bleed between neighbours. Pure.
 */
export function packAtlas(faces: Face[], texel = LIGHTMAP_TEXEL, width = LIGHTMAP_WIDTH): Atlas {
  const unique = new Map<string, Face>();
  for (const f of faces) if (!unique.has(f.key)) unique.set(f.key, f);
  const sized = [...unique.values()].map((face) => ({
    face,
    nu: Math.max(1, Math.ceil((face.u1 - face.u0) / texel - 1e-6)),
    nv: Math.max(1, Math.ceil((face.v1 - face.v0) / texel - 1e-6)),
  }));
  sized.sort((a, b) => b.nv - a.nv || b.nu - a.nu || (a.face.key < b.face.key ? -1 : 1));
  const charts: Chart[] = [];
  let x = 0;
  let y = 0;
  let shelf = 0;
  let offset = 0;
  for (const { face, nu, nv } of sized) {
    if (nu + 2 > width) throw new Error(`face too long for the lightmap: ${face.key}`);
    if (x + nu + 2 > width) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    charts.push({ face, x: x + 1, y: y + 1, nu, nv, offset });
    offset += nu * nv;
    x += nu + 2;
    shelf = Math.max(shelf, nv + 2);
  }
  const height = Math.ceil((y + shelf) / 8) * 8;
  return {
    width,
    height,
    texel,
    charts,
    byKey: new Map(charts.map((c) => [c.face.key, c])),
    texels: offset,
    signature: fnv1a(
      `${texel}|${width}|` + charts.map((c) => `${c.face.key}@${c.x},${c.y}`).join(";"),
    ),
  };
}

/** A 2 × 2-texel chart the baker fills with 1 (the room's mean): for geometry without its own chart. */
export const NEUTRAL: Face = {
  key: "neutral",
  axis: 1,
  sign: 1,
  plane: -1000,
  u0: 0,
  u1: 2 * LIGHTMAP_TEXEL,
  v0: 0,
  v1: 2 * LIGHTMAP_TEXEL,
  albedo: [0, 0, 0],
};

/** Atlas of an apartment (its faces plus the neutral chart). Pure. */
export function lightmapAtlas(def: ApartmentDef): Atlas {
  return packAtlas([...bakeScene(def).faces, NEUTRAL]);
}

/**
 * Lightmap UV (0–1, v down: the PNG's first row is v = 0) of a point on a
 * face, from its (u, v) coordinates on the face. Pure.
 */
export function chartUV(atlas: Atlas, chart: Chart, u: number, v: number): [number, number] {
  const f = chart.face;
  const texel = atlas.texel;
  const tu = Math.min(Math.max((u - f.u0) / texel, 0), (f.u1 - f.u0) / texel);
  const tv = Math.min(Math.max((v - f.v0) / texel, 0), (f.v1 - f.v0) / texel);
  return [(chart.x + tu) / atlas.width, (chart.y + tv) / atlas.height];
}

/**
 * Lightmap UVs for a geometry made of axis-aligned faces (a box, or a floor /
 * ceiling plane), given the box it was built from: each vertex goes to the
 * chart of the box face its normal points out of. Vertices of non-receiving
 * faces go to the neutral chart. `positions` / `normals` are flat xyz arrays. Pure.
 */
export function boxLightmapUVs(
  atlas: Atlas,
  box: Box,
  positions: ArrayLike<number>,
  normals: ArrayLike<number>,
): Float32Array {
  const count = positions.length / 3;
  const uv = new Float32Array(count * 2);
  const neutral = atlas.byKey.get(NEUTRAL.key);
  const fallback = neutral ? chartUV(atlas, neutral, atlas.texel, atlas.texel) : [0, 0];
  for (let i = 0; i < count; i++) {
    uv[i * 2] = fallback[0];
    uv[i * 2 + 1] = fallback[1];
    const n = [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]];
    const abs = n.map(Math.abs);
    const axis = abs.indexOf(Math.max(...abs)) as Axis;
    const sign = n[axis] > 0 ? 1 : -1;
    const chart = atlas.byKey.get(boxFace(box, axis, sign, [0, 0, 0]).key);
    if (!chart) continue;
    const [ua, va] = faceAxes(axis);
    const [u, v] = chartUV(atlas, chart, positions[i * 3 + ua], positions[i * 3 + va]);
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  return uv;
}

/** Occluders with the index of each face's chart (-1: not a receiver). */
export function occluders(scene: BakeScene, atlas: Atlas): Occluder[] {
  const index = new Map(atlas.charts.map((c, i) => [c.face.key, i]));
  return scene.occluders.map(({ box, faces }) => ({
    box,
    charts: faces.map((f) => (f ? (index.get(f.key) ?? -1) : -1)),
  }));
}
