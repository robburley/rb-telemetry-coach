import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { build as esbuild } from "esbuild";

type ExtensionTarget = "chrome" | "firefox";
type JsonObject = Record<string, unknown>;

const extensionRootOutDir = "dist/extension";
const allTargets: ExtensionTarget[] = ["chrome", "firefox"];

function getTargets(mode: string): ExtensionTarget[] {
  if (mode === "chrome" || mode === "firefox") {
    return [mode];
  }

  return allTargets;
}

function targetOutDir(target: ExtensionTarget): string {
  return `${extensionRootOutDir}/${target}`;
}

function readJson(path: string): JsonObject {
  return JSON.parse(readFileSync(resolve(path), "utf8")) as JsonObject;
}

function mergeJson(base: JsonObject, override: JsonObject): JsonObject {
  const merged: JsonObject = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = merged[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      merged[key] = mergeJson(baseValue as JsonObject, value as JsonObject);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

function writeManifest(target: ExtensionTarget): void {
  const manifest = mergeJson(
    readJson("src/extension/manifest.base.json"),
    readJson(`src/extension/manifest.${target}.json`),
  );
  const targetPath = resolve(targetOutDir(target), "manifest.json");
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

export default defineConfig(({ mode }) => {
  const targets = getTargets(mode);
  const primaryTarget = targets[0];
  const primaryOutDir = targetOutDir(primaryTarget);

  return {
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    plugins: [
      react(),
      {
        name: "build-browser-extension-targets",
        buildStart() {
          rmSync(resolve(extensionRootOutDir), { recursive: true, force: true });
        },
        async closeBundle() {
          await esbuild({
            entryPoints: [resolve("src/extension/pageObserver.ts")],
            outfile: resolve(primaryOutDir, "pageObserver.js"),
            bundle: true,
            format: "iife",
            globalName: "Garage61TelemetryCoachPageObserver",
            platform: "browser",
            target: "es2022",
            define: {
              "process.env.NODE_ENV": JSON.stringify("production"),
            },
          });

          writeManifest(primaryTarget);

          for (const target of targets.slice(1)) {
            const outDir = resolve(targetOutDir(target));
            rmSync(outDir, { recursive: true, force: true });
            mkdirSync(outDir, { recursive: true });
            copyFileSync(
              resolve(primaryOutDir, "contentScript.js"),
              resolve(outDir, "contentScript.js"),
            );
            copyFileSync(
              resolve(primaryOutDir, "pageObserver.js"),
              resolve(outDir, "pageObserver.js"),
            );
            writeManifest(target);
          }
        },
      },
    ],
    build: {
      outDir: primaryOutDir,
      emptyOutDir: true,
      lib: {
        entry: resolve("src/extension/contentScript.tsx"),
        formats: ["iife"],
        name: "Garage61TelemetryCoachExtension",
        fileName: () => "contentScript.js",
      },
    },
  };
});
