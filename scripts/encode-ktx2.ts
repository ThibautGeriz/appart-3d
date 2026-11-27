/**
 * Encode the photo scans (src/assets/textures) to KTX2 / Basis Universal GPU
 * textures: they stay compressed in video memory (~4–8× less than the
 * decoded JPEG), transcoded on load to what the GPU reads (BC, ETC2, ASTC).
 * Usage: npm run encode:ktx2 [name…]  → writes the .ktx2 files next to the
 * scans (committed: the app and the GLB export only read them); with names,
 * only the outputs containing one (npm run encode:ktx2 wool).
 *
 * Colour maps: ETC1S, sRGB, with their processing baked in (gray, brightness,
 * grout). Normal maps: UASTC (ETC1S blocks smear the slopes), zstd.
 * Roughness: ETC1S, linear.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import jpeg from "jpeg-js";
import { encodeToKTX2 } from "ktx2-encoder";
import { drawGrout, normalizeBrightness, normalizeGray } from "../src/apartment/pixels.ts";

type Kind = "color" | "normal" | "data";

interface Job {
  /** output, repo-relative */
  out: string;
  src: string;
  kind: Kind;
  /** scene textures: the image rows go bottom-up (three's flipY, which KTX2 cannot do on upload) */
  flipY?: boolean;
  process?: (rgba: Uint8Array, size: number) => void;
}

const T = "src/assets/textures";
const scene = (name: string, src: string, kind: Kind, process?: Job["process"]): Job => ({
  out: `${T}/ktx2/${name}.ktx2`,
  src: `${T}/${src}`,
  kind,
  flipY: true,
  process,
});
const pbr = (scan: string, dir = "pbr"): Job[] => [
  scene(`${scan}_nor`, `${dir}/${scan}_nor.jpg`, "normal"),
  scene(`${scan}_rough`, `${dir}/${scan}_rough.jpg`, "data"),
];
const gray = (rgba: Uint8Array) => normalizeGray(rgba);

/** Walls and floors (src/apartment/textures.ts): one per finish. */
const SCENE: Job[] = [
  scene("parquet", "wood_floor.jpg", "color", (p) => normalizeBrightness(p, 0.62)),
  scene("oak", "oak_veneer_01.jpg", "color", (p) => normalizeBrightness(p, 0.5)),
  scene("shower_wall", "long_white_tiles.jpg", "color", gray),
  scene("shower_floor", "tiled_floor_001.jpg", "color", gray),
  scene("stone", "smooth_concrete_floor.jpg", "color", gray),
  scene("kitchen_tile", "smooth_concrete_floor.jpg", "color", (p, size) => {
    normalizeGray(p);
    drawGrout(p, size);
  }),
  ...pbr("wood_floor"),
  ...pbr("smooth_concrete_floor"),
  ...pbr("long_white_tiles"),
  ...pbr("tiled_floor_001"),
  ...pbr("oak_veneer_01", "furniture"),
];

/** Furniture scans (embedded in the GLBs, glTF orientation). */
const F = `${T}/furniture`;
const furniture = (name: string, kind: Kind, src = `${F}/${name}.jpg`): Job => ({
  out: `${F}/ktx2/${name}.ktx2`,
  src,
  kind,
});
const FURNITURE: Job[] = [
  furniture("oak_veneer_01", "color", `${T}/oak_veneer_01.jpg`),
  ...[
    "ash_veneer",
    "brown_planks_08",
    "brown_planks_09",
    "european_walnut_veneer_04",
    "fabric_leather_01",
    "oak_veneer_01",
    "rosewood_veneer_02",
  ].flatMap((scan) => [
    ...(scan === "oak_veneer_01" ? [] : [furniture(`${scan}_diff`, "color")]),
    furniture(`${scan}_nor`, "normal"),
    furniture(`${scan}_rough`, "data"),
  ]),
  furniture("fragranite_diff", "color"),
  furniture("roma_mesh_diff", "color"),
  furniture("roma_mesh_nor", "normal"),
  furniture("wool_diff", "color"),
  furniture("wool_nor", "normal"),
];

const root = resolve(import.meta.dirname, "..");
const only = process.argv.slice(2);
const jobs = [...SCENE, ...FURNITURE].filter(
  (j) => !only.length || only.some((n) => j.out.includes(n)),
);
for (const job of jobs) {
  const image = jpeg.decode(await readFile(resolve(root, job.src)), {
    useTArray: true,
    formatAsRGBA: true,
  });
  job.process?.(image.data, image.width);
  const color = job.kind === "color";
  const normal = job.kind === "normal";
  const ktx2 = await encodeToKTX2(new Uint8Array(0), {
    // the pixels are already decoded (and processed)
    imageDecoder: async () => ({ data: image.data, width: image.width, height: image.height }),
    isUASTC: normal,
    needSupercompression: normal,
    enableRDO: normal,
    isNormalMap: normal,
    isPerceptual: color,
    isSetKTX2SRGBTransferFunc: color,
    isYFlip: job.flipY ?? false,
    generateMipmap: true,
    qualityLevel: 160,
    compressionLevel: 2,
  });
  const out = resolve(root, job.out);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, ktx2);
  console.log(`${job.out}  ${(ktx2.byteLength / 1024).toFixed(1)} KB`);
}
