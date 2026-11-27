import { defineConfig, devices } from "@playwright/test";

/**
 * Browser performance test (npm run test:perf): the production build in a
 * real Chromium, as a desktop and as a phone (touch: no ambient occlusion,
 * Lambert surfaces, no antialiasing). See e2e/fps.perf.ts.
 */
const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.perf.ts",
  timeout: process.env.CI ? 900_000 : 180_000, // software rendering: seconds per frame
  workers: 1, // one GPU: measure one page at a time
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}/appart-3d/`,
    // the full Chromium (new headless mode) draws on the GPU; the headless
    // shell always falls back to the software rasterizer
    channel: "chromium",
    launchOptions: {
      // CI runners have no GPU: WebGL on the software rasterizer (SwiftShader)
      args: process.env.CI
        ? ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"]
        : ["--enable-gpu", "--ignore-gpu-blocklist"],
    },
  },
  projects: [
    // a laptop's Retina screen: 2880 × 1800 pixels to shade (as CSS pixels:
    // emulating deviceScaleFactor 2 adds its own cost, ~3× slower here)
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 2880, height: 1800 },
        deviceScaleFactor: 1,
      },
    },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/appart-3d/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
