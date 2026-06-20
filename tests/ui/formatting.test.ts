import { describe, expect, it } from "vitest";
import {
  categoryLabel,
  formatLapIdentity,
  formatLapSummary,
  formatLapTime,
  formatSignedDelta,
  formatSlice,
  formatTrackTitle,
  reportStatusMessage,
  severityLabel,
} from "../../src/ui/formatting";
import type {
  AnalysisReport,
  DistanceSlice,
  LapSummary,
} from "../../src/domain/types";

describe("dev UI formatting", () => {
  it("formats lap context compactly", () => {
    const lap: LapSummary = {
      id: "lap",
      driver: { name: "Driver One" },
      lapTimeSec: 101.2345,
      lapNumber: 7,
      canViewTelemetry: true,
      haveSamples: true,
    };

    expect(formatLapTime(101.2345)).toBe("1:41.234");
    expect(formatLapIdentity(lap)).toBe("Driver One - 1:41.234");
    expect(formatLapSummary(lap)).toBe("Lap 7 - Driver One - 1:41.234");
    expect(formatSignedDelta(4.349)).toBe("(+4.349s)");
    expect(formatSignedDelta(-0.1254)).toBe("(-0.125s)");
  });

  it("formats selected slices and status messages", () => {
    const slice: DistanceSlice = {
      startDistancePct: 0.0354,
      endDistancePct: 0.12,
    };
    const report: AnalysisReport = {
      status: "unsupported",
      reason: "slice_too_large",
      analysisId: "analysis",
      findings: [],
      slice,
    };

    expect(formatSlice(slice)).toBe("3.54% to 12.00%");
    expect(reportStatusMessage(report)).toBe(
      "Zoom to a shorter slice, up to 15% of the lap.",
    );
    expect(categoryLabel("rotation")).toBe("Rotation");
    expect(severityLabel("medium")).toBe("Medium severity");
  });

  it("prefers Garage 61 track short names for display titles", () => {
    expect(
      formatTrackTitle({
        id: 67,
        name: "Autodromo Jose Carlos Pace",
        variant: "Grand Prix",
        shortName: "Interlagos (GP)",
      }),
    ).toBe("Interlagos (GP)");

    expect(
      formatTrackTitle({
        id: 67,
        name: "Autodromo Jose Carlos Pace",
        variant: "Grand Prix",
      }),
    ).toBe("Autodromo Jose Carlos Pace - Grand Prix");
  });

  it("explains unsupported active-lap counts", () => {
    const report: AnalysisReport = {
      status: "unsupported",
      reason: "active_lap_count",
      analysisId: "analysis",
      findings: [],
    };

    expect(reportStatusMessage(report)).toBe(
      "The coach can analyze exactly two active laps. Hide laps in Garage 61 until exactly two active laps remain.",
    );
  });
});
