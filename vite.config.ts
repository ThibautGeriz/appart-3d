import { resolve } from "node:path";
import { defineConfig } from "vite";

// base must match the GitHub Pages project URL:
// https://<user>.github.io/appart-3d/
export default defineConfig({
  base: "/appart-3d/",
  build: {
    // the walkthrough and the furniture catalog (viewer.html stays dev-only)
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        catalog: resolve(import.meta.dirname, "catalog.html"),
      },
    },
  },
});
