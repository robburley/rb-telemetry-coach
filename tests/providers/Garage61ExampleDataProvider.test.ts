import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  endpointFixtureName,
  Garage61ExampleDataProvider,
  resolveComparisonLaps,
} from "../../src";

const analysisId = "01KVBECPC8BM15DJ7X80X1RGCT";
const referenceLapId = "01KVBPW12Z5WJY1W33G47N95KW";
const targetLapId = "01KVBPNG1EVNB3D9310P6X2J1K";

describe("Garage61ExampleDataProvider", () => {
  it("uses endpoint-derived fixture filenames", () => {
    expect(
      endpointFixtureName(["api", "internal", "laps", referenceLapId, "tdf"], "txt"),
    ).toBe(`api-internal-laps-${referenceLapId}-tdf.txt`);
  });

  it("loads the complete current fixture scenario", async () => {
    const provider = new Garage61ExampleDataProvider();

    const analysis = await provider.getAnalysis(analysisId);
    const [referenceTelemetry, targetTelemetry] = await Promise.all([
      provider.getLapTelemetry(referenceLapId),
      provider.getLapTelemetry(targetLapId),
    ]);

    expect(analysis.id).toBe(analysisId);
    expect(analysis.laps.map((lap) => lap.id)).toEqual([
      referenceLapId,
      targetLapId,
    ]);
    expect(analysis.track.lapLengthM).toBe(4306.5938);
    expect(referenceTelemetry.sampleCount).toBe(6500);
    expect(targetTelemetry.sampleCount).toBe(6562);
    expect(referenceTelemetry.source?.provider).toBe("garage61-example");
    expect(referenceTelemetry.channelAvailability.distancePct).toBe(true);
    expect(targetTelemetry.channelAvailability.throttle).toBe(true);
  });

  it("caches normalized lap telemetry per provider instance", async () => {
    const provider = new Garage61ExampleDataProvider();

    const firstRead = await provider.getLapTelemetry(referenceLapId);
    const secondRead = await provider.getLapTelemetry(referenceLapId);

    expect(secondRead).toBe(firstRead);
  });

  it("reports missing fixture files clearly", async () => {
    const fixtureDir = await makeTempFixtureDir("missing-provider-fixture");
    const provider = new Garage61ExampleDataProvider({ fixtureDir });

    await expect(provider.getLapTelemetry("missing-lap")).rejects.toThrow(
      "api-internal-laps-missing-lap-tdf.txt: fixture not found",
    );
  });

  it("does not use decoded JSON telemetry as provider input", async () => {
    const fixtureDir = await makeTempFixtureDir("json-is-validation-only");
    const provider = new Garage61ExampleDataProvider({ fixtureDir });

    await writeFile(
      join(fixtureDir, `api-internal-laps-${referenceLapId}-tdf.json`),
      JSON.stringify({ channels: [] }),
      "utf8",
    );

    await expect(provider.getLapTelemetry(referenceLapId)).rejects.toThrow(
      `api-internal-laps-${referenceLapId}-tdf.txt: fixture not found`,
    );
  });
});

describe("Garage61ExampleDataProvider role resolution", () => {
  it("resolves fastest lap as reference and slower lap as target", async () => {
    const provider = new Garage61ExampleDataProvider();
    const analysis = await provider.getAnalysis(analysisId);

    expect(resolveComparisonLaps(analysis)).toEqual({
      referenceLapId,
      targetLapId,
    });
  });
});

async function makeTempFixtureDir(name: string): Promise<string> {
  const dir = join(
    tmpdir(),
    "garage61-analyser-tests",
    `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  await mkdir(dir, { recursive: true });
  return dir;
}
