import { describe, expect, it } from "vitest";
import {
  formatLapSummary,
  formatLapTime,
  formatSlice,
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
    expect(formatLapSummary(lap)).toBe("Lap 7 · Driver One · 1:41.234");
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
      "Select a shorter slice, up to 15% of the lap.",
    );
    expect(severityLabel("medium")).toBe("Medium severity");
  });
});
