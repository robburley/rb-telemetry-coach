import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const port = Number(process.env.UI_SMOKE_PORT ?? 5173);
const host = "127.0.0.1";
const baseUrl = `http://${host}:${port}/`;
const artifactDir = join(rootDir, "output", "playwright");
const viteEntry = join(rootDir, "node_modules", "vite", "bin", "vite.js");

const require = createRequire(import.meta.url);

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    throw new Error(
      [
        "Unable to load Playwright.",
        "Run this smoke check with `npm run smoke:ui`; that command supplies Playwright through npm exec.",
        error instanceof Error ? error.message : String(error),
      ].join("\n"),
    );
  }
}

function startVite() {
  const server = spawn(
    process.execPath,
    [viteEntry, "--host", host, "--port", String(port), "--strictPort"],
    {
      cwd: rootDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const logs = [];
  server.stdout.on("data", (data) => logs.push(data.toString()));
  server.stderr.on("data", (data) => logs.push(data.toString()));

  return { server, logs };
}

async function waitForServer(server, logs) {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Vite exited before serving ${baseUrl}.\n${logs.join("")}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    }
  }

  throw new Error(`Timed out waiting for ${baseUrl}.\n${logs.join("")}`);
}

async function expectText(locator, expected, label) {
  const text = (await locator.textContent())?.trim() ?? "";
  if (!text.includes(expected)) {
    throw new Error(`${label} expected to include "${expected}", got "${text}".`);
  }
}

async function expectNonEmptyText(locator, label) {
  const text = (await locator.textContent())?.trim() ?? "";
  if (text.length === 0) {
    throw new Error(`${label} expected non-empty text.`);
  }
}

async function runSmoke() {
  await mkdir(artifactDir, { recursive: true });
  const { chromium } = loadPlaywright();
  const { server, logs } = startVite();
  let browser;

  try {
    await waitForServer(server, logs);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const consoleIssues = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        consoleIssues.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      consoleIssues.push(`pageerror: ${error.message}`);
    });

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await expectText(page.locator(".eyebrow").first(), "RB Telemetry Coach", "Product label");
    await expectNonEmptyText(page.locator("h1"), "Desktop heading");
    await page.getByRole("button", { name: "Analyze" }).click();
    await page.locator(".finding-card").first().waitFor({ state: "visible", timeout: 10_000 });
    const desktopCards = await page.locator(".finding-card").count();
    await page.screenshot({ path: join(artifactDir, "ui-smoke-desktop.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 780 });
    await page.locator(".coach-shell").waitFor({ state: "visible" });
    await page.screenshot({ path: join(artifactDir, "ui-smoke-mobile.png"), fullPage: true });
    await page.getByRole("button", { name: "Minimize RB Telemetry Coach" }).click();
    const launcherLogo = page.locator(".coach-launcher img");
    await launcherLogo.waitFor({ state: "visible", timeout: 10_000 });
    await launcherLogo.evaluate(async (image) => {
      if (image instanceof HTMLImageElement) {
        await image.decode();
      }
    });
    await page.screenshot({ path: join(artifactDir, "ui-smoke-launcher.png"), fullPage: true });

    if (desktopCards < 1) {
      throw new Error("Expected at least one finding card after analysis.");
    }

    if (consoleIssues.length > 0) {
      throw new Error(`Browser console issues:\n${consoleIssues.join("\n")}`);
    }

    console.log(`UI smoke passed at ${baseUrl}`);
    console.log(`Findings rendered: ${desktopCards}`);
    console.log(`Screenshots: ${resolve(artifactDir)}`);
  } finally {
    if (browser) {
      await browser.close();
    }
    server.kill();
  }
}

runSmoke().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
