/**
 * Render one model in the dev viewer with headless Chrome: a PNG per view and
 * the viewer's measurements (bounding box, expected size, materials) as JSON.
 * Needs a running dev server (npm run dev). No DevTools session, so several
 * agents can run it in parallel.
 *
 * Usage: node scripts/render-model.ts <file> [--url http://localhost:5173/appart-3d/]
 *          [--out /tmp/improve-model/<file>] [--prefix before] [--views front,side,top,iso]
 * Chrome: $CHROME, or the default macOS / Linux install.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: "string", default: "http://localhost:5173/appart-3d/" },
    out: { type: "string" },
    prefix: { type: "string", default: "render" },
    views: { type: "string", default: "front,side,top,iso" },
    bg: { type: "string", default: "ffffff" },
  },
});
const file = positionals[0];
if (!file) {
  console.error("usage: node scripts/render-model.ts <file> [--url …] [--out …] [--prefix …]");
  process.exit(2);
}

const chrome =
  process.env.CHROME ??
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find(existsSync);
if (!chrome) throw new Error("Chrome not found: set $CHROME");

const out = values.out ?? join("/tmp/improve-model", file);
mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "render-model-"));
const flags = [
  "--headless=new",
  "--use-angle=swiftshader", // software WebGL: works without a GPU
  "--enable-unsafe-swiftshader",
  "--hide-scrollbars",
  `--user-data-dir=${profile}`,
  "--window-size=1200,900",
  "--virtual-time-budget=3000",
];
const page = (view: string) =>
  `${values.url}viewer.html?model=${encodeURIComponent(file)}&view=${view}&bg=${values.bg}`;

try {
  for (const view of values.views.split(",")) {
    const png = join(out, `${values.prefix}-${view}.png`);
    spawnSync(chrome, [...flags, `--screenshot=${png}`, page(view)], { stdio: "ignore" });
    console.log(png);
  }
  const dom = spawnSync(chrome, [...flags, "--dump-dom", page("front")], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).stdout;
  const json = /<pre id="report" hidden="">([\s\S]*?)<\/pre>/.exec(dom)?.[1];
  if (!json) throw new Error(`no viewer report for ${file} (is the dev server at ${values.url}?)`);
  const decoded = json
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  const viewer = JSON.parse(decoded) as { model?: unknown; error?: string };
  if (viewer.error) throw new Error(viewer.error);
  const report = join(out, `${values.prefix}-report.json`);
  writeFileSync(report, JSON.stringify(viewer.model, null, 2));
  console.log(report);
} finally {
  rmSync(profile, { recursive: true, force: true });
}
