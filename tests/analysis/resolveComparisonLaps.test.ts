import { describe, expect, it } from "vitest";
import { resolveComparisonLaps, type AnalysisMetadata } from "../../src";

describe("resolveComparisonLaps", () => {
  it("selects the lower lap time as reference", () => {
    expect(
      resolveComparisonLaps(
        makeAnalysis([
          ["slower", 102],
          ["faster", 101],
        ]),
      ),
    ).toEqual({
      referenceLapId: "faster",
      targetLapId: "slower",
    });
  });

  it("rejects unsupported non-two-lap analyses", () => {
    expect(() =>
      resolveComparisonLaps(
        makeAnalysis([
          ["fastest", 100],
          ["middle", 101],
          ["slowest", 102],
        ]),
      ),
    ).toThrow("exactly two laps");
  });

  it("rejects ambiguous equal lap times", () => {
    expect(() =>
      resolveComparisonLaps(
        makeAnalysis([
          ["driver-a", 100],
          ["driver-b", 100],
        ]),
      ),
    ).toThrow("equal lap times");
  });
});

function makeAnalysis(laps: Array<[string, number]>): AnalysisMetadata {
  return {
    id: "analysis",
    type: "laps",
    car: {
      id: 145,
      name: "Toyota GR86",
    },
    track: {
      id: 67,
      name: "Interlagos",
    },
    laps: laps.map(([id, lapTimeSec]) => ({
      id,
      lapTimeSec,
      driver: { name: id },
      canViewTelemetry: true,
      haveSamples: true,
    })),
  };
}
