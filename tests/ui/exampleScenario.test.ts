import { describe, expect, it } from "vitest";
import {
  analyzeExampleZoomInput,
  defaultZoomInput,
  loadExampleScenario,
} from "../../src/ui/exampleScenario";

describe("dev UI example scenario", () => {
  it("loads the example laps and generates findings for the default slice", () => {
    const scenario = loadExampleScenario();
    const result = analyzeExampleZoomInput(defaultZoomInput);

    expect(scenario.analysis.track.lapLengthM).toBe(4306.5938);
    expect(result.report.status).toBe("complete");
    expect(result.report.findings.length).toBeGreaterThan(0);
    expect(result.report.findings.slice(0, 5)).toHaveLength(
      Math.min(5, result.report.findings.length),
    );
    expect(result.report.findings.map((finding) => finding.id)).toEqual([
      "braking-too-early",
      "holding-brake-too-long",
      "soft-initial-brake",
      "under-braking-pressure",
    ]);
    expect(result.report.findings[2]?.possibleEffectFindingIds).toContain("holding-brake-too-long");
  });

  it("returns a graceful invalid-slice report for an unbounded zoom input", () => {
    const result = analyzeExampleZoomInput("-");

    expect(result.report.status).toBe("needs_slice");
    expect(result.report.reason).toBe("missing_slice");
    expect(result.report.findings).toEqual([]);
  });
});
