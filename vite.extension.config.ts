import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { build as esbuild } from "esbuild";

const extensionOutDir = "dist/extension";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [
    react(),
    {
      name: "copy-extension-manifest",
      async closeBundle() {
        await esbuild({
          entryPoints: [resolve("src/extension/pageObserver.ts")],
          outfile: resolve(extensionOutDir, "pageObserver.js"),
          bundle: true,
          format: "iife",
          globalName: "Garage61TelemetryCoachPageObserver",
          platform: "browser",
          target: "es2022",
          define: {
            "process.env.NODE_ENV": JSON.stringify("production"),
          },
        });

        const target = resolve(extensionOutDir, "manifest.json");
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(resolve("src/extension/manifest.json"), target);
      },
    },
  ],
  build: {
    outDir: extensionOutDir,
    emptyOutDir: true,
    lib: {
      entry: resolve("src/extension/contentScript.tsx"),
      formats: ["iife"],
      name: "Garage61TelemetryCoachExtension",
      fileName: () => "contentScript.js",
    },
  },
});
