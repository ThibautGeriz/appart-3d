/**
 * Render one model in the dev viewer with headless Chrome: a PNG per view and
 * the viewer's measurements (bounding box, expected size, materials) as JSON.
 * Needs a running dev server (npm run dev). Drives its own Chrome over the
 * DevTools protocol (no shared DevTools session), so several agents can run
 * it in parallel. Each view waits until the viewer says it is ready (the
 * KTX2 textures decode in a worker: a fixed delay is not enough).
 *
 * Usage: node scripts/render-model.ts <file> [--url http://localhost:5173/appart-3d/]
 *          [--out /tmp/improve-model/<file>] [--prefix before] [--views front,side,top,iso]
 * Chrome: $CHROME, or the default macOS / Linux install.
 */
import { spawn } from "node:child_process";
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
    timeout: { type: "string", default: "60" }, // seconds per view
  },
});
const file = positionals[0];
if (!file) {
  console.error("usage: node scripts/render-model.ts <file> [--url …] [--out …] [--prefix …]");
  process.exit(2);
}

const chromePath =
  process.env.CHROME ??
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find(existsSync);
if (!chromePath) throw new Error("Chrome not found: set $CHROME");

const out = values.out ?? join("/tmp/improve-model", file);
mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "render-model-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--use-angle=swiftshader", // software WebGL: works without a GPU
    "--enable-unsafe-swiftshader",
    "--hide-scrollbars",
    `--user-data-dir=${profile}`,
    "--window-size=1200,900",
    "--remote-debugging-port=0",
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

/** The browser's DevTools WebSocket URL, printed on stderr at startup. */
const browserUrl = await new Promise<string>((resolve, reject) => {
  let log = "";
  chrome.stderr.on("data", (chunk: Buffer) => {
    log += chunk.toString();
    const m = /DevTools listening on (ws:\/\/\S+)/.exec(log);
    if (m) resolve(m[1]);
  });
  chrome.on("exit", () => reject(new Error(`Chrome exited:\n${log}`)));
});

/** Minimal DevTools protocol client: one page target, request → response. */
async function connect(wsUrl: string) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map<number, (msg: { result?: unknown; error?: unknown }) => void>();
  ws.onmessage = (e) => {
    const msg = JSON.parse(String(e.data));
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  };
  const send = <T>(method: string, params: object = {}, sessionId?: string) =>
    new Promise<T>((resolve, reject) => {
      const n = ++id;
      pending.set(n, (msg) =>
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result as T),
      );
      ws.send(JSON.stringify({ id: n, method, params, sessionId }));
    });
  return { ws, send };
}

const page = (view: string) =>
  `${values.url}viewer.html?model=${encodeURIComponent(file)}&view=${view}&bg=${values.bg}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const { ws, send } = await connect(browserUrl);
try {
  const { targetId } = await send<{ targetId: string }>("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await send<{ sessionId: string }>("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const cmd = <T>(method: string, params: object = {}) => send<T>(method, params, sessionId);
  const evaluate = async <T>(expression: string) =>
    (
      await cmd<{ result: { value?: T } }>("Runtime.evaluate", {
        expression,
        returnByValue: true,
      })
    ).result.value;
  await cmd("Emulation.setDeviceMetricsOverride", {
    width: 1200,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  let viewer: { model?: unknown; error?: string } | undefined;
  for (const view of values.views.split(",")) {
    await cmd("Page.navigate", { url: page(view) });
    const deadline = Date.now() + Number(values.timeout) * 1000;
    while (!(await evaluate<boolean>("window.__viewer?.ready === true"))) {
      if (Date.now() > deadline)
        throw new Error(`viewer not ready after ${values.timeout}s: ${page(view)}`);
      await sleep(250);
    }
    await sleep(300); // a few frames after the model is in the scene
    viewer ??= await evaluate("window.__viewer");
    if (viewer?.error) throw new Error(viewer.error);
    const { data } = await cmd<{ data: string }>("Page.captureScreenshot", { format: "png" });
    const png = join(out, `${values.prefix}-${view}.png`);
    writeFileSync(png, Buffer.from(data, "base64"));
    console.log(png);
  }
  const report = join(out, `${values.prefix}-report.json`);
  writeFileSync(report, JSON.stringify(viewer?.model, null, 2));
  console.log(report);
} finally {
  ws.close();
  chrome.kill();
  await sleep(200);
  rmSync(profile, { recursive: true, force: true });
}
