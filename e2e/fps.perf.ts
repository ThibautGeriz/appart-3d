import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import type { PerfProbe } from "../src/ui/perfProbe";

/**
 * Frame rate in a real browser, at a few places of the apartment: walks
 * there (the room's models load), then counts the frames drawn for a few
 * seconds. Fails under the floor (AGENTS.md: 30 fps, or PERF_MIN_FPS) or
 * over the draw-call budget. On the software rasterizer (CI runners have no
 * GPU) the frame rate is reported, not checked: it measures the CPU, not a
 * phone. The results go to perf-results/<project>.json (scripts/perf-report.ts).
 */

const VIEWS = {
  Entrée: [5.0, 8.15, 0.2],
  Séjour: [4.4, 2.2, Math.PI / 2],
  Bureau: [10.3, 7.0, 0.35],
  Chambre: [12.8, 7.6, 0],
} as const;

const MIN_FPS = Number(process.env.PERF_MIN_FPS ?? 30);
/** draw calls per frame (all passes) */
const MAX_CALLS = 350;
const SECONDS = Number(process.env.PERF_SECONDS ?? 4);

export interface ViewResult {
  view: string;
  fps: number;
  /** 95th percentile frame time, ms */
  p95: number;
  calls: number;
  triangles: number;
}

export interface PerfResult {
  project: string;
  gpu: string;
  /** SwiftShader: the frame rate is not checked */
  software: boolean;
  viewport: string;
  views: ViewResult[];
  textures: number;
  geometries: number;
}

declare global {
  interface Window {
    perfProbe?: PerfProbe;
  }
}

test("frame rate across the apartment", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("?perf", { waitUntil: "networkidle" });
  await page.waitForFunction(() => (window.perfProbe?.frames ?? 0) > 10);

  const gpu = await page.evaluate(() => {
    const gl = document.querySelector("canvas")!.getContext("webgl2")!;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "unknown";
  });

  const views: ViewResult[] = [];
  for (const [view, [x, z, yaw]] of Object.entries(VIEWS)) {
    await page.evaluate(([x, z, yaw]) => window.perfProbe!.goTo(x, z, yaw), [x, z, yaw]);
    // the room's models load the first time it is seen
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500); // transcoding, shader compilation
    const result = await page.evaluate(async (seconds) => {
      const probe = window.perfProbe!;
      const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
      const deltas: number[] = [];
      let calls = 0;
      let triangles = 0;
      let last = await frame();
      const end = last + seconds * 1000;
      while (last < end) {
        const now = await frame();
        deltas.push(now - last);
        calls = Math.max(calls, probe.calls);
        triangles = Math.max(triangles, probe.triangles);
        last = now;
      }
      const sorted = [...deltas].sort((a, b) => a - b);
      const total = deltas.reduce((a, b) => a + b, 0);
      return {
        fps: (deltas.length / total) * 1000,
        p95: sorted[Math.floor(sorted.length * 0.95)],
        calls,
        triangles,
      };
    }, SECONDS);
    views.push({ view, ...result });
  }

  const memory = await page.evaluate(() => ({
    textures: window.perfProbe!.textures,
    geometries: window.perfProbe!.geometries,
  }));
  const viewport = page.viewportSize();
  const result: PerfResult = {
    project: info.project.name,
    gpu,
    software: /SwiftShader|llvmpipe/i.test(gpu),
    viewport: `${viewport?.width}×${viewport?.height} @${info.project.use.deviceScaleFactor ?? 1}x`,
    views,
    ...memory,
  };
  await mkdir("perf-results", { recursive: true });
  await writeFile(`perf-results/${info.project.name}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));

  expect(errors, "page errors").toEqual([]);
  for (const v of views) {
    if (!result.software) expect.soft(v.fps, `${v.view}: fps`).toBeGreaterThanOrEqual(MIN_FPS);
    expect.soft(v.calls, `${v.view}: draw calls`).toBeLessThanOrEqual(MAX_CALLS);
  }
});
