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
    ).toThrow("exactly two active laps");
  });

  it("ignores hidden laps when resolving the active comparison", () => {
    expect(
      resolveComparisonLaps(
        makeAnalysis([
          ["hidden-fastest", 99, false],
          ["reference", 100, true],
          ["target", 101, true],
        ]),
      ),
    ).toEqual({
      referenceLapId: "reference",
      targetLapId: "target",
    });
  });

  it("rejects three active laps", () => {
    expect(() =>
      resolveComparisonLaps(
        makeAnalysis([
          ["fastest", 100, true],
          ["middle", 101, true],
          ["slowest", 102, true],
        ]),
      ),
    ).toThrow("received 3");
  });

  it("rejects one active lap", () => {
    expect(() =>
      resolveComparisonLaps(
        makeAnalysis([
          ["active", 100, true],
          ["hidden", 101, false],
        ]),
      ),
    ).toThrow("received 1");
  });

  it("rejects zero active laps", () => {
    expect(() =>
      resolveComparisonLaps(
        makeAnalysis([
          ["hidden-a", 100, false],
          ["hidden-b", 101, false],
        ]),
      ),
    ).toThrow("received 0");
  });

  it("rejects non-finite active lap times", () => {
    expect(() =>
      resolveComparisonLaps(
        makeAnalysis([
          ["driver-a", Number.NaN],
          ["driver-b", 101],
        ]),
      ),
    ).toThrow("finite lap times");
  });

  it("rejects ambiguous equal lap times", () => {
    expect(() =>
      resolveComparisonLaps(
        makeAnalysis([
          ["driver-a", 100],
          ["driver-b", 100],
        ]),
      ),
    ).toThrow("equal active lap times");
  });
});

function makeAnalysis(laps: Array<[string, number, boolean?]>): AnalysisMetadata {
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
    laps: laps.map(([id, lapTimeSec, isActive]) => ({
      id,
      lapTimeSec,
      driver: { name: id },
      canViewTelemetry: true,
      haveSamples: true,
      isActive,
    })),
  };
}
