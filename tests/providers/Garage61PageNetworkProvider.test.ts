import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Garage61AnalysisFixture,
  Garage61PageNetworkProvider,
  type Garage61TrackFixture,
  parseGarage61TdfDataUrlFixture,
} from "../../src";

const analysisId = "01KVBECPC8BM15DJ7X80X1RGCT";
const referenceLapId = "01KVBPW12Z5WJY1W33G47N95KW";
const targetLapId = "01KVBPNG1EVNB3D9310P6X2J1K";
const fixtureDir = join(process.cwd(), "example-data");

describe("Garage61PageNetworkProvider", () => {
  it("attaches pending TDF captures after authoritative analysis metadata arrives", async () => {
    const provider = new Garage61PageNetworkProvider();
    const analysis = await readAnalysisFixture();
    const track = await readTrackFixture();
    const referenceBytes = await readTdfFixture(referenceLapId);

    provider.ingestCapturedResponse({
      kind: "lap-tdf",
      url: `https://garage61.net/api/internal/laps/${referenceLapId}/tdf`,
      lapId: referenceLapId,
      routeAnalysisId: analysisId,
      capturedAtMs: Date.now(),
      body: referenceBytes,
    });

    expect(provider.getPendingTdfCount()).toBe(1);

    provider.ingestCapturedResponse({
      kind: "analysis",
      url: `https://garage61.net/api/internal/analyses/${analysisId}`,
      routeAnalysisId: analysisId,
      capturedAtMs: Date.now(),
      body: analysis,
    });
    provider.ingestCapturedResponse({
      kind: "track",
      url: "https://garage61.net/api/internal/tracks/67",
      routeAnalysisId: analysisId,
      capturedAtMs: Date.now(),
      body: track,
    });

    expect(provider.getPendingTdfCount()).toBe(0);
    expect(provider.hasCapturedLapTelemetry(referenceLapId)).toBe(true);
    await expect(provider.getAnalysis(analysisId)).resolves.toMatchObject({
      id: analysisId,
      track: { lapLengthM: 4306.5938 },
    });

    const telemetry = await provider.getLapTelemetry(referenceLapId);
    expect(telemetry.lapId).toBe(referenceLapId);
    expect(telemetry.source?.provider).toBe("garage61-page-network");
    expect(telemetry.sampleCount).toBe(6500);
  });

  it("accepts Firefox-style base64 text TDF captures", async () => {
    const provider = new Garage61PageNetworkProvider();
    const analysis = await readAnalysisFixture();
    const track = await readTrackFixture();
    const referenceText = await readFile(
      join(fixtureDir, `firefox-api-internal-laps-${referenceLapId}-tdf.txt`),
      "utf8",
    );

    ingestAnalysisAndTrack(provider, analysis, track);
    ingestTdf(
      provider,
      referenceLapId,
      new TextEncoder().encode(referenceText).buffer,
    );

    await expect(provider.getLapTelemetry(referenceLapId)).resolves.toMatchObject({
      lapId: referenceLapId,
      sampleCount: 6500,
      source: { provider: "garage61-page-network" },
    });
  });

  it("uses track metadata captured before authoritative analysis metadata", async () => {
    const provider = new Garage61PageNetworkProvider();
    const analysis = await readAnalysisFixture();
    const track = await readTrackFixture();

    provider.ingestCapturedResponse({
      kind: "track",
      url: "https://garage61.net/api/internal/tracks/67",
      routeAnalysisId: analysisId,
      capturedAtMs: Date.now(),
      body: track,
    });
    provider.ingestCapturedResponse({
      kind: "analysis",
      url: `https://garage61.net/api/internal/analyses/${analysisId}`,
      routeAnalysisId: analysisId,
      capturedAtMs: Date.now(),
      body: analysis,
    });

    await expect(provider.getAnalysis(analysisId)).resolves.toMatchObject({
      id: analysisId,
      track: { lapLengthM: 4306.5938 },
    });
  });


  it("keeps TDF captures pending when the route hint does not match the authoritative analysis", async () => {
    const provider = new Garage61PageNetworkProvider();
    const analysis = await readAnalysisFixture();
    const referenceBytes = await readTdfFixture(referenceLapId);

    provider.ingestCapturedResponse({
      kind: "lap-tdf",
      url: `https://garage61.net/api/internal/laps/${referenceLapId}/tdf`,
      lapId: referenceLapId,
      routeAnalysisId: "01AAAAAAAAAAAAAAAAAAAAAAAA",
      capturedAtMs: Date.now(),
      body: referenceBytes,
    });
    provider.ingestCapturedResponse({
      kind: "analysis",
      url: `https://garage61.net/api/internal/analyses/${analysisId}`,
      routeAnalysisId: analysisId,
      capturedAtMs: Date.now(),
      body: analysis,
    });

    expect(provider.getPendingTdfCount()).toBe(1);
    await expect(provider.getLapTelemetry(referenceLapId)).rejects.toThrow(
      `Garage 61 page session has no captured telemetry for lap ${referenceLapId}`,
    );
  });

  it("invalidates telemetry when compared lap ids change", async () => {
    const provider = new Garage61PageNetworkProvider();
    const analysis = await readAnalysisFixture();
    const track = await readTrackFixture();
    const referenceBytes = await readTdfFixture(referenceLapId);
    ingestAnalysisAndTrack(provider, analysis, track);
    ingestTdf(provider, referenceLapId, referenceBytes);

    await expect(provider.getLapTelemetry(referenceLapId)).resolves.toMatchObject({
      lapId: referenceLapId,
    });

    provider.ingestCapturedResponse({
      kind: "analysis",
      url: `https://garage61.net/api/internal/analyses/${analysisId}`,
      routeAnalysisId: analysisId,
      capturedAtMs: Date.now(),
      body: {
        ...analysis,
        laps: [analysis.laps[1]!],
      } satisfies Garage61AnalysisFixture,
    });

    await expect(provider.getLapTelemetry(referenceLapId)).rejects.toThrow(
      `Garage 61 page session has no captured telemetry for lap ${referenceLapId}`,
    );
  });

  it("reuses normalized telemetry across zoom-only route changes", async () => {
    const provider = new Garage61PageNetworkProvider();
    const analysis = await readAnalysisFixture();
    const track = await readTrackFixture();
    const referenceBytes = await readTdfFixture(referenceLapId);
    ingestAnalysisAndTrack(provider, analysis, track);
    ingestTdf(provider, referenceLapId, referenceBytes);

    const first = await provider.getLapTelemetry(referenceLapId);
    provider.ingestCapturedResponse({
      kind: "analysis",
      url: `https://garage61.net/api/internal/analyses/${analysisId}`,
      routeAnalysisId: analysisId,
      capturedAtMs: Date.now(),
      body: analysis,
    });

    await expect(provider.getLapTelemetry(referenceLapId)).resolves.toBe(first);
  });

  it("expires old pending TDF captures", async () => {
    let now = 10_000;
    const provider = new Garage61PageNetworkProvider({
      now: () => now,
      pendingTdfTtlMs: 1_000,
    });
    const referenceBytes = await readTdfFixture(referenceLapId);

    provider.ingestCapturedResponse({
      kind: "lap-tdf",
      url: `https://garage61.net/api/internal/laps/${referenceLapId}/tdf`,
      lapId: referenceLapId,
      routeAnalysisId: analysisId,
      capturedAtMs: now,
      body: referenceBytes,
    });

    now = 12_000;
    expect(provider.getPendingTdfCount()).toBe(0);
  });
});

async function readAnalysisFixture(): Promise<Garage61AnalysisFixture> {
  return JSON.parse(
    await readFile(
      join(fixtureDir, `api-internal-analyses-${analysisId}.json`),
      "utf8",
    ),
  ) as Garage61AnalysisFixture;
}

async function readTrackFixture(): Promise<Garage61TrackFixture> {
  return JSON.parse(
    await readFile(join(fixtureDir, "api-internal-tracks-67.json"), "utf8"),
  ) as Garage61TrackFixture;
}

async function readTdfFixture(lapId: string): Promise<ArrayBuffer> {
  const text = await readFile(
    join(fixtureDir, `api-internal-laps-${lapId}-tdf.txt`),
    "utf8",
  );
  return new Uint8Array(parseGarage61TdfDataUrlFixture(text, lapId)).buffer;
}

function ingestAnalysisAndTrack(
  provider: Garage61PageNetworkProvider,
  analysis: Garage61AnalysisFixture,
  track: Garage61TrackFixture,
): void {
  provider.ingestCapturedResponse({
    kind: "analysis",
    url: `https://garage61.net/api/internal/analyses/${analysisId}`,
    routeAnalysisId: analysisId,
    capturedAtMs: Date.now(),
    body: analysis,
  });
  provider.ingestCapturedResponse({
    kind: "track",
    url: "https://garage61.net/api/internal/tracks/67",
    routeAnalysisId: analysisId,
    capturedAtMs: Date.now(),
    body: track,
  });
}

function ingestTdf(
  provider: Garage61PageNetworkProvider,
  lapId: string,
  body: ArrayBuffer,
): void {
  provider.ingestCapturedResponse({
    kind: "lap-tdf",
    url: `https://garage61.net/api/internal/laps/${lapId}/tdf`,
    lapId,
    routeAnalysisId: analysisId,
    capturedAtMs: Date.now(),
    body,
  });
}
