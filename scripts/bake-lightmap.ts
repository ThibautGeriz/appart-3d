/**
 * Bake the architecture's lightmap (sky light through the windows, two
 * bounces): writes src/assets/lightmap/lightmap.png (+ .json with the layout
 * signature the app checks). Run after changing walls, areas or built-in
 * furniture: npm run bake:lightmap   (--rays N to trade quality for time)
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { deflateSync, crc32 } from "node:zlib";
import { runnerImport } from "vite";

const { values: args } = parseArgs({ options: { rays: { type: "string", default: "512" } } });
const root = resolve(import.meta.dirname, "..");
type L = typeof import("../src/lighting/lightmap");
type B = typeof import("../src/lighting/bake");
type D = typeof import("../src/data/apartment");
const { module: lm } = await runnerImport<L>(resolve(root, "src/lighting/lightmap.ts"));
const { module: bk } = await runnerImport<B>(resolve(root, "src/lighting/bake.ts"));
const { module: data } = await runnerImport<D>(resolve(root, "src/data/apartment.ts"));

const scene = lm.bakeScene(data.APARTMENT_DEF);
const atlas = lm.lightmapAtlas(data.APARTMENT_DEF);
console.log(
  `${atlas.charts.length} faces, ${atlas.texels} texels, atlas ${atlas.width}×${atlas.height}`,
);
const started = performance.now();
let shown = 0;
const light = bk.bake(atlas, lm.occluders(scene, atlas), {
  rays: Number(args.rays),
  onProgress: (p) => {
    if (p - shown >= 0.1 || p === 1) {
      shown = p;
      process.stdout.write(
        `  ${Math.round(p * 100)}% (${((performance.now() - started) / 1000).toFixed(0)} s)\n`,
      );
    }
  },
});
// exposure: the mean over the interior (walls, floors, ceilings: what one sees) becomes 1
const def = data.APARTMENT_DEF;
const inside = (x: number, z: number) =>
  def.areas.some(
    ({ rect: [x0, z0, x1, z1], outdoor }) => !outdoor && x > x0 && x < x1 && z > z0 && z < z1,
  );
const interior = new Set(
  atlas.charts
    .filter(({ face: f }) => {
      if (f.key === lm.NEUTRAL.key) return false;
      // a point just in front of the face, at mid-height
      const p = [0, 1.2, 0];
      const [ua, va] = lm.faceAxes(f.axis);
      p[ua] = (f.u0 + f.u1) / 2;
      p[va] = (f.v0 + f.v1) / 2;
      p[f.axis] = f.plane + f.sign * 0.05;
      return inside(p[0], p[2]);
    })
    .map((c) => c.face.key),
);
const exposure = 1 / bk.meanLight(atlas, light, interior);
for (let i = 0; i < light.length; i++) light[i] *= exposure;
// the neutral chart: exactly the mean
const neutral = atlas.byKey.get(lm.NEUTRAL.key)!;
light.fill(1, neutral.offset * 3, (neutral.offset + neutral.nu * neutral.nv) * 3);
console.log(
  `interior: mean ${(1 / exposure).toFixed(4)} of an open floor → ×${exposure.toFixed(1)}`,
);
const rgba = bk.encodeAtlas(atlas, light, lm.LIGHTMAP_RANGE);

/** Minimal PNG (RGB, 8 bit). */
function png(width: number, height: number, rgba: Uint8Array): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0;
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++)
        raw[y * (1 + width * 3) + 1 + x * 3 + c] = rgba[(y * width + x) * 4 + c];
    }
  }
  const chunk = (tag: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(tag, 4, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(tag, "ascii"), data])) >>> 0, 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = resolve(root, "src/assets/lightmap");
await writeFile(resolve(dir, "lightmap.png"), png(atlas.width, atlas.height, rgba));
await writeFile(
  resolve(dir, "lightmap.json"),
  JSON.stringify(
    {
      signature: atlas.signature,
      width: atlas.width,
      height: atlas.height,
      rays: Number(args.rays),
      exposure: Number(exposure.toFixed(3)),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `src/assets/lightmap/lightmap.png written in ${((performance.now() - started) / 1000).toFixed(1)} s`,
);
