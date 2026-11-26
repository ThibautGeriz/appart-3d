/**
 * Export the procedural models (props + avatar) to binary glTF (.glb).
 * Usage: npm run export:glb  → writes models/*.glb
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
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

const { module: entry } = await runnerImport<typeof import("./glbModels")>(
  resolve(import.meta.dirname, "glbModels.ts"),
);
const outDir = resolve(import.meta.dirname, "../models");
await mkdir(outDir, { recursive: true });
for (const { name, build } of entry.MODELS) {
  const glb = await entry.toGlb(build());
  await writeFile(resolve(outDir, `${name}.glb`), Buffer.from(glb));
  console.log(`models/${name}.glb  ${(glb.byteLength / 1024).toFixed(1)} KB`);
}
