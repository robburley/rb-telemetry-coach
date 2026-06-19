import { describe, expect, it } from "vitest";
import type { LapTelemetry } from "../../src";
import { generateLiveReportForZoom } from "../../src/extension/liveReport";
import { loadExampleScenario } from "../../src/ui/exampleScenario";

describe("generateLiveReportForZoom", () => {
  it("generates complete reports for valid zoom changes using provider telemetry", async () => {
    const scenario = loadExampleScenario();
    const provider = new CountingTelemetryProvider(
      scenario.roles.referenceLapId,
      scenario.reference,
      scenario.roles.targetLapId,
      scenario.target,
    );

    const first = await generateLiveReportForZoom({
      analysis: scenario.analysis,
      roles: scenario.roles,
      provider,
      zoomRaw: "354-1200",
    });
    const second = await generateLiveReportForZoom({
      analysis: scenario.analysis,
      roles: scenario.roles,
      provider,
      zoomRaw: "500-900",
    });
    const invalid = await generateLiveReportForZoom({
      analysis: scenario.analysis,
      roles: scenario.roles,
      provider,
      zoomRaw: "1-9999",
    });

    expect(first.status).toBe("complete");
    expect(second.status).toBe("complete");
    expect(invalid).toMatchObject({
      status: "unsupported",
      reason: "slice_too_large",
      findings: [],
    });
    expect(first.slice?.source?.raw).toBe("354-1200");
    expect(second.slice?.source?.raw).toBe("500-900");
    expect(provider.telemetryReadCount).toBe(4);
    expect(provider.returnedTelemetry).toEqual([
      scenario.reference,
      scenario.target,
      scenario.reference,
      scenario.target,
    ]);
  });

  it("returns invalid zoom reports without reading telemetry", async () => {
    const scenario = loadExampleScenario();
    const provider = new CountingTelemetryProvider(
      scenario.roles.referenceLapId,
      scenario.reference,
      scenario.roles.targetLapId,
      scenario.target,
    );

    const missing = await generateLiveReportForZoom({
      analysis: scenario.analysis,
      roles: scenario.roles,
      provider,
      zoomRaw: "-",
    });
    const tooLarge = await generateLiveReportForZoom({
      analysis: scenario.analysis,
      roles: scenario.roles,
      provider,
      zoomRaw: "1-9999",
    });
    const recovered = await generateLiveReportForZoom({
      analysis: scenario.analysis,
      roles: scenario.roles,
      provider,
      zoomRaw: "500-900",
    });

    expect(missing).toMatchObject({
      status: "needs_slice",
      reason: "missing_slice",
      findings: [],
    });
    expect(tooLarge).toMatchObject({
      status: "unsupported",
      reason: "slice_too_large",
      findings: [],
    });
    expect(recovered.status).toBe("complete");
    expect(provider.telemetryReadCount).toBe(2);
  });
});

class CountingTelemetryProvider {
  telemetryReadCount = 0;
  returnedTelemetry: LapTelemetry[] = [];

  constructor(
    private readonly referenceLapId: string,
    private readonly reference: LapTelemetry,
    private readonly targetLapId: string,
    private readonly target: LapTelemetry,
  ) {}

  async getLapTelemetry(lapId: string): Promise<LapTelemetry> {
    this.telemetryReadCount += 1;

    if (lapId === this.referenceLapId) {
      this.returnedTelemetry.push(this.reference);
      return this.reference;
    }

    if (lapId === this.targetLapId) {
      this.returnedTelemetry.push(this.target);
      return this.target;
    }

    throw new Error(`Unexpected lap ${lapId}`);
  }
}
