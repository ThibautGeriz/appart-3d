/**
 * The browser performance test's results (perf-results/*.json, from
 * npm run test:perf) as a Markdown table: perf-report.md, posted on the pull
 * request by CI (one comment, updated on every push).
 * Usage: npm run perf:report
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import type { PerfResult } from "../e2e/fps.perf.ts";

/** Finds the comment to update. */
export const MARKER = "<!-- perf-report -->";

const dir = "perf-results";
const results: PerfResult[] = [];
for (const file of (await readdir(dir)).filter((f) => f.endsWith(".json")).sort()) {
  results.push(JSON.parse(await readFile(`${dir}/${file}`, "utf8")) as PerfResult);
}

const level = (fps: number) => (fps >= 55 ? "🟢" : fps >= 30 ? "🟡" : "🔴");
const lines = [MARKER, "## ⏱️ Performance (real browser)", ""];
for (const r of results) {
  lines.push(
    `### ${r.project === "phone" ? "📱 Phone" : "🖥️ Desktop"} — ${r.viewport}`,
    "",
    `GPU: \`${r.gpu}\`${r.software ? " — **software rendering**: the frame rate measures the runner's CPU, not a phone, and is not checked" : ""}`,
    "",
    "| View | FPS | p95 frame | Draw calls | Triangles |",
    "| ---- | --: | --------: | ---------: | --------: |",
    ...r.views.map(
      (v) =>
        `| ${v.view} | ${r.software ? "" : `${level(v.fps)} `}${v.fps.toFixed(1)} | ${v.p95.toFixed(1)} ms | ${v.calls} | ${(v.triangles / 1000).toFixed(0)} k |`,
    ),
    "",
    `${r.textures} textures, ${r.geometries} geometries in GPU memory.`,
    "",
  );
}
if (results.length === 0) lines.push("No results: the performance test did not run.");
// the PR head (GITHUB_SHA is the merge commit on pull requests)
const sha = (process.env.HEAD_SHA || process.env.GITHUB_SHA)?.slice(0, 7);
if (sha) lines.push(`<sub>Commit ${sha}. Local GPU run: \`npm run test:perf\`.</sub>`);
await writeFile("perf-report.md", lines.join("\n") + "\n");
console.log(lines.join("\n"));
