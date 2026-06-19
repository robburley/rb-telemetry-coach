import { describe, expect, it } from "vitest";
import {
  defaultAnalysisConfig,
  metresPerSecondToKilometresPerHour,
  type AnalysisMetadata,
  type AnalysisReport,
  type LapTelemetry,
} from "../src";

describe("domain type exports", () => {
  it("allows app-owned metadata, telemetry, and report shapes to compile", () => {
    const analysis: AnalysisMetadata = {
      id: "analysis-1",
      type: "laps",
      car: {
        id: 1,
        name: "Toyota GR86",
      },
      track: {
        id: 67,
        name: "Interlagos",
        variant: "GP",
        lapLengthM: 4306.5938,
      },
      laps: [
        {
          id: "lap-reference",
          driver: { name: "Reference Driver" },
          lapTimeSec: 100.5,
          canViewTelemetry: true,
          haveSamples: true,
        },
      ],
    };

    const telemetry: LapTelemetry = {
      lapId: "lap-reference",
      sampleCount: 2,
      channels: {
        distancePct: new Float64Array([0.1, 0.2]),
        speedMs: new Float32Array([40, 41]),
      },
      channelAvailability: {
        distancePct: true,
        speedMs: true,
        brake: false,
        throttle: false,
        steeringRad: false,
        gear: false,
        rpm: false,
        latitude: false,
        longitude: false,
        headingRad: false,
      },
      source: {
        provider: "garage61-example",
        decodedChannelSummary: [
          {
            id: 1,
            name: "speed_mps",
            dtype: "float32",
            sampleCount: 2,
          },
        ],
      },
    };

    const report: AnalysisReport = {
      status: "complete",
      analysisId: analysis.id,
      referenceLapId: telemetry.lapId,
      targetLapId: "lap-target",
      findings: [],
    };

    expect(report.status).toBe("complete");
    expect(defaultAnalysisConfig.resampleStepM).toBe(1);
    expect(metresPerSecondToKilometresPerHour(10)).toBe(36);
  });
});
