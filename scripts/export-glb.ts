/**
 * Export the procedural models (src/models/) to binary glTF (.glb).
 * Usage: npm run export:glb  → writes models/*.glb
 *   --out <dir>    write elsewhere
 *   --no-meshopt   skip the meshopt compression (the glTF validator cannot
 *                  read compressed buffers, so CI also validates this variant)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Document, WebIO, type Texture } from "@gltf-transform/core";
import {
  EXTMeshoptCompression,
  KHRMaterialsClearcoat,
  KHRMaterialsUnlit,
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
  .registerExtensions([
    KHRMaterialsClearcoat,
    KHRMaterialsUnlit,
    KHRMeshQuantization,
    EXTMeshoptCompression,
  ])
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

/**
 * Attach JPEG maps to the materials of that name (skipped when the model has
 * none): base color, normal (OpenGL convention, as glTF) and roughness. The
 * roughness scan is grey, so it also lands in the metalness channel: keep the
 * metallic factor at 0 for those materials.
 */
async function attachTextures(doc: Document, textures: Record<string, TextureFiles>) {
  const images = new Map<string, Texture>();
  const image = async (path: string) => {
    let texture = images.get(path);
    if (!texture) {
      texture = doc
        .createTexture(basename(path, ".jpg"))
        .setImage(new Uint8Array(await readFile(resolve(root, path))))
        .setMimeType("image/jpeg");
      images.set(path, texture);
    }
    return texture;
  };
  for (const [materialName, files] of Object.entries(textures)) {
    const materials = doc
      .getRoot()
      .listMaterials()
      .filter((m) => m.getName() === materialName);
    for (const m of materials) {
      m.setBaseColorTexture(await image(files.base));
      if (files.normal) m.setNormalTexture(await image(files.normal));
      if (files.roughness) {
        m.setMetallicRoughnessTexture(await image(files.roughness)).setMetallicFactor(0);
      }
    }
  }
}

type TextureFiles = import("./glbModels").TextureFiles;

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
