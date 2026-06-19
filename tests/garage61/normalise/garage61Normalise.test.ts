import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decodeGarage61TelemetryBinary,
  normaliseGarage61Analysis,
  normaliseGarage61Telemetry,
  normaliseGarage61Track,
  parseGarage61TdfDataUrlFixture,
  type DecodedGarage61Telemetry,
} from "../../../src";

const fixtureDir = join(process.cwd(), "example-data");
const analysisId = "01KVBECPC8BM15DJ7X80X1RGCT";
const referenceLapId = "01KVBPW12Z5WJY1W33G47N95KW";
const targetLapId = "01KVBPNG1EVNB3D9310P6X2J1K";

describe("normaliseGarage61Analysis", () => {
  it("normalizes the current Garage 61 analysis fixture", async () => {
    const [analysisFixture, trackFixture] = await Promise.all([
      readJsonFixture(`api-internal-analyses-${analysisId}.json`),
      readJsonFixture("api-internal-tracks-67.json"),
    ]);

    const analysis = normaliseGarage61Analysis(analysisFixture, {
      track: trackFixture,
    });

    expect(analysis).toMatchObject({
      id: analysisId,
      type: "laps",
      car: {
        id: 145,
        platform: "iracing",
        name: "Toyota GR86",
        shortName: "Toyota GR86",
      },
      track: {
        id: 67,
        platform: "iracing",
        name: "Autódromo José Carlos Pace",
        variant: "Grand Prix",
        shortName: "Interlagos (GP)",
        lapLengthM: 4306.5938,
      },
    });
    expect(analysis.laps).toHaveLength(2);
    expect(analysis.laps.map((lap) => lap.id)).toEqual([
      referenceLapId,
      targetLapId,
    ]);
    expect(analysis.laps[0]).toMatchObject({
      driver: { name: "Shaun McGoldrick", rating: 2659 },
      lapTimeSec: 108.31520080566406,
      lapNumber: 27,
      canViewTelemetry: true,
      haveSamples: true,
      clean: true,
    });
    expect(analysis.laps.every((lap) => lap.isActive === undefined)).toBe(true);
  });

  it("marks Garage 61 laps inactive from explicit lap and group hidden fields", () => {
    const baseLap = {
      lap_time: 101,
      can_view_telemetry: true,
      have_samples: true,
      car_info: {
        id: 145,
        name: "Toyota GR86",
      },
      track_info: {
        id: 67,
        name: "Interlagos",
      },
    };

    const analysis = normaliseGarage61Analysis({
      id: "analysis",
      type: "laps",
      laps: [
        {
          laps: [{ ...baseLap, id: "active" }],
        },
        {
          laps: [{ ...baseLap, id: "lap-hidden", hidden: true }],
        },
        {
          visible: false,
          laps: [{ ...baseLap, id: "group-hidden" }],
        },
      ],
    });

    expect(analysis.laps.map((lap) => [lap.id, lap.isActive])).toEqual([
      ["active", undefined],
      ["lap-hidden", false],
      ["group-hidden", false],
    ]);
  });

  it("marks laps inactive from Garage 61 comparison option arrays", () => {
    const baseLap = {
      lap_time: 101,
      can_view_telemetry: true,
      have_samples: true,
      car_info: {
        id: 145,
        name: "Toyota GR86",
      },
      track_info: {
        id: 67,
        name: "Interlagos",
      },
    };

    const analysis = normaliseGarage61Analysis({
      id: "analysis",
      type: "laps",
      laps: [
        {
          options: { selected: true },
          laps: [{ ...baseLap, id: "active-reference", lap_time: 100 }],
        },
        {
          options: { enabled: true },
          laps: [{ ...baseLap, id: "active-target", lap_time: 101 }],
        },
        ...Array.from({ length: 6 }, (_, index) => ({
          options: [{ hidden: true }],
          laps: [{ ...baseLap, id: `inactive-${index}`, lap_time: 102 + index }],
        })),
      ],
    });

    expect(analysis.laps.map((lap) => [lap.id, lap.isActive])).toEqual([
      ["active-reference", true],
      ["active-target", true],
      ["inactive-0", false],
      ["inactive-1", false],
      ["inactive-2", false],
      ["inactive-3", false],
      ["inactive-4", false],
      ["inactive-5", false],
    ]);
  });
});

describe("normaliseGarage61Track", () => {
  it("maps Garage 61 lap_length and sectors into TrackInfo", async () => {
    const track = normaliseGarage61Track(
      await readJsonFixture("api-internal-tracks-67.json"),
    );

    expect(track.lapLengthM).toBe(4306.5938);
    expect(track.sectorMarkersPct).toEqual([
      0.278071, 0.431505, 0.609232, 0.725358,
    ]);
    expect(track.turns).toBe(15);
    expect(track.bounds).toEqual([
      -46.700481849318926, -46.69407258851263, -23.706354493172682,
      -23.697005052132955,
    ]);
  });
});

describe("normaliseGarage61Telemetry", () => {
  it("normalizes both decoded TDF fixtures to columnar telemetry", async () => {
    const [reference, target] = await Promise.all([
      decodeFixture(referenceLapId),
      decodeFixture(targetLapId),
    ]);

    const referenceTelemetry = normaliseGarage61Telemetry(reference, {
      lapId: referenceLapId,
    });
    const targetTelemetry = normaliseGarage61Telemetry(target, {
      lapId: targetLapId,
    });

    expect(referenceTelemetry.sampleCount).toBe(6500);
    expect(targetTelemetry.sampleCount).toBe(6562);
    expect(referenceTelemetry.channels.distancePct).toBeInstanceOf(
      Float64Array,
    );
    expect(referenceTelemetry.channels.speedMs).toBeInstanceOf(Float32Array);
    expect(referenceTelemetry.channels.gear).toBeInstanceOf(Int32Array);
    expect(targetTelemetry.channelAvailability).toMatchObject({
      distancePct: true,
      speedMs: true,
      brake: true,
      throttle: true,
      steeringRad: true,
      gear: true,
      rpm: true,
      latitude: true,
      longitude: true,
      headingRad: true,
    });
  });

  it("rotates wrapped telemetry into monotonic lap-distance order", async () => {
    const decoded = await decodeFixture(referenceLapId);
    const sourceDistance = decoded.channels.find(
      (channel) => channel.name === "lap_distance_pct",
    )!.values;
    const sourceSpeed = decoded.channels.find(
      (channel) => channel.name === "speed_mps",
    )!.values;

    const telemetry = normaliseGarage61Telemetry(decoded, {
      lapId: referenceLapId,
    });

    expect(telemetry.channels.distancePct[0]).toBeCloseTo(
      sourceDistance[sourceDistance.length - 1]!,
      10,
    );
    expect(telemetry.channels.distancePct.at(-1)).toBeCloseTo(
      sourceDistance[sourceDistance.length - 2]!,
      10,
    );
    expect(telemetry.channels.speedMs?.[0]).toBeCloseTo(
      sourceSpeed[sourceSpeed.length - 1]!,
      5,
    );
    expect(isMonotonic(telemetry.channels.distancePct)).toBe(true);
  });

  it("preserves measured endpoints instead of rewriting to exact lap bounds", () => {
    const decoded = makeDecodedTelemetry([
      0.9, 0.98, 0.001, 0.1,
    ]);
    const telemetry = normaliseGarage61Telemetry(decoded, {
      lapId: "wrapped-lap",
    });

    expect(telemetry.channels.distancePct[0]).toBeCloseTo(0.001, 7);
    expect(telemetry.channels.distancePct[1]).toBeCloseTo(0.1, 7);
    expect(telemetry.channels.distancePct[2]).toBeCloseTo(0.9, 7);
    expect(telemetry.channels.distancePct[3]).toBeCloseTo(0.98, 7);
    expect(telemetry.channels.distancePct[0]).not.toBe(0);
    expect(telemetry.channels.distancePct.at(-1)).not.toBe(1);
  });

  it("drops unknown channels from normalized telemetry while keeping source summary", async () => {
    const telemetry = normaliseGarage61Telemetry(await decodeFixture(referenceLapId), {
      lapId: referenceLapId,
    });
    const channelRecord = telemetry.channels as unknown as Record<string, unknown>;

    expect(channelRecord.channel_9_unknown).toBeUndefined();
    expect(channelRecord.channel_20_unknown_i32).toBeUndefined();
    expect(
      telemetry.source?.decodedChannelSummary?.some(
        (channel) => channel.name === "channel_9_unknown",
      ),
    ).toBe(true);
  });

  it("treats missing optional channels as unavailable", () => {
    const telemetry = normaliseGarage61Telemetry(
      makeDecodedTelemetry([0.1, 0.2, 0.3]),
      { lapId: "distance-only" },
    );

    expect(telemetry.channelAvailability).toMatchObject({
      distancePct: true,
      speedMs: false,
      brake: false,
      throttle: false,
      steeringRad: false,
      gear: false,
      rpm: false,
      latitude: false,
      longitude: false,
      headingRad: false,
    });
  });
});

async function readJsonFixture(name: string): Promise<any> {
  return JSON.parse(await readFile(join(fixtureDir, name), "utf8"));
}

async function decodeFixture(lapId: string): Promise<DecodedGarage61Telemetry> {
  const fixtureName = `api-internal-laps-${lapId}-tdf.txt`;
  const text = await readFile(join(fixtureDir, fixtureName), "utf8");
  return decodeGarage61TelemetryBinary(
    parseGarage61TdfDataUrlFixture(text, fixtureName),
  );
}

function isMonotonic(values: Float64Array): boolean {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index]! < values[index - 1]!) {
      return false;
    }
  }

  return true;
}

function makeDecodedTelemetry(distancePct: number[]): DecodedGarage61Telemetry {
  return {
    meta: {
      magic: "ðŸŽ",
      sampleCount: distancePct.length,
      fileSizeBytes: 0,
    },
    channels: [
      {
        id: 2,
        name: "lap_distance_pct",
        dtype: "float32",
        values: new Float32Array(distancePct),
        sampleCount: distancePct.length,
      },
      {
        id: 99,
        name: "channel_99_unknown",
        dtype: "float32",
        values: new Float32Array(distancePct.length),
        sampleCount: distancePct.length,
      },
    ],
    unknownChannels: [
      {
        id: 99,
        name: "channel_99_unknown",
        dtype: "float32",
        values: new Float32Array(distancePct.length),
        sampleCount: distancePct.length,
      },
    ],
  };
}
