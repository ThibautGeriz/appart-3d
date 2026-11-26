/**
 * Export the procedural models (src/models/) to binary glTF (.glb).
 * Usage: npm run export:glb  → writes models/*.glb
 *   --out <dir>    write elsewhere
 *   --no-meshopt   skip the meshopt compression (the glTF validator cannot
 *                  read compressed buffers, so CI also validates this variant)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Document, WebIO } from "@gltf-transform/core";
import {
  EXTMeshoptCompression,
  KHRMaterialsClearcoat,
  KHRMeshQuantization,
} from "@gltf-transform/extensions";
import { dedup, flatten, join, meshopt, prune, quantize, weld } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import { runnerImport } from "vite";

// GLTFExporter's binary path reads Blobs through FileReader, which Node lacks.
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob): void {
    void blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob: Blob): void {
    void blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buf).toString("base64")}`;
      this.onloadend?.();
    });
  }
}
(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader;

const root = resolve(import.meta.dirname, "..");
const { values: args } = parseArgs({
  options: { out: { type: "string", default: "models" }, "no-meshopt": { type: "boolean" } },
});
await MeshoptEncoder.ready;
const io = new WebIO()
  .registerExtensions([KHRMaterialsClearcoat, KHRMeshQuantization, EXTMeshoptCompression])
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

/**
 * Post-process: attach photo textures (GLTFExporter needs a canvas to encode
 * images, which Node lacks: use the original JPEG bytes), weld, quantize and
 * meshopt-compress the geometry (decoded by GLTFLoader), and merge each prop's meshes per material (fewer draw calls).
 * Rigged models keep their node hierarchy.
 */
async function optimize(
  glb: Uint8Array,
  entry: { textures?: Record<string, string>; rigged?: boolean },
) {
  const doc: Document = await io.readBinary(glb);
  await attachTextures(doc, entry.textures ?? {});
  const steps = [dedup(), weld()];
  if (!entry.rigged) steps.push(flatten(), join());
  // untextured materials do not need their UVs
  steps.push(
    prune({ keepAttributes: false }),
    args["no-meshopt"]
      ? quantize({ quantizeNormal: 10, quantizeTexcoord: 12 })
      : meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await doc.transform(...steps);
  return io.writeBinary(doc);
}

async function attachTextures(doc: Document, textures: Record<string, string>) {
  for (const [materialName, path] of Object.entries(textures)) {
    const materials = doc
      .getRoot()
      .listMaterials()
      .filter((m) => m.getName() === materialName);
    if (materials.length === 0) throw new Error(`no material named "${materialName}"`);
    const texture = doc
      .createTexture(materialName)
      .setImage(new Uint8Array(await readFile(resolve(root, path))))
      .setMimeType("image/jpeg");
    for (const m of materials) m.setBaseColorTexture(texture);
  }
}

const { module: entry } = await runnerImport<typeof import("./glbModels")>(
  resolve(import.meta.dirname, "glbModels.ts"),
);
const outDir = resolve(root, args.out!);
await mkdir(outDir, { recursive: true });
for (const model of entry.MODELS) {
  const { file, build } = model;
  const glb = await optimize(new Uint8Array(await entry.toGlb(build())), model);
  await writeFile(resolve(outDir, `${file}.glb`), glb);
  console.log(`${args.out}/${file}.glb  ${(glb.byteLength / 1024).toFixed(1)} KB`);
}
