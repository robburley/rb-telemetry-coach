import { describe, expect, it } from "vitest";
import { parseGarage61AnalysisUrl } from "../../../src";

describe("parseGarage61AnalysisUrl", () => {
  it("extracts analysis id and query zoom from Garage 61 analysis routes", () => {
    expect(
      parseGarage61AnalysisUrl(
        "https://garage61.net/app/analysis/01KVBECPC8BM15DJ7X80X1RGCT?z=354-1200",
      ),
    ).toMatchObject({
      analysisId: "01KVBECPC8BM15DJ7X80X1RGCT",
      zoomRaw: "354-1200",
      zoom: {
        status: "slice",
        slice: {
          startDistancePct: 0.0354,
          endDistancePct: 0.12,
        },
      },
    });
  });

  it("supports plural analyses route names and semicolon-style zoom state", () => {
    expect(
      parseGarage61AnalysisUrl(
        "https://garage61.net/app/analyses/01KVBECPC8BM15DJ7X80X1RGCT;z=400-900",
      ),
    ).toMatchObject({
      analysisId: "01KVBECPC8BM15DJ7X80X1RGCT",
      zoomRaw: "400-900",
      zoom: {
        status: "slice",
      },
    });
  });

  it("supports Garage 61 laps analysis route names", () => {
    expect(
      parseGarage61AnalysisUrl(
        "https://garage61.net/app/analysis/laps/01KV8Y12QEYZF31XCNMAG69JBK;v=driving-style",
      ),
    ).toMatchObject({
      analysisId: "01KV8Y12QEYZF31XCNMAG69JBK",
      zoom: {
        status: "needs_slice",
        reason: "missing_slice",
      },
    });
  });

  it("returns missing slice state when no zoom parameter is present", () => {
    expect(
      parseGarage61AnalysisUrl(
        "https://garage61.net/app/analysis/01KVBECPC8BM15DJ7X80X1RGCT",
      ),
    ).toMatchObject({
      analysisId: "01KVBECPC8BM15DJ7X80X1RGCT",
      zoom: {
        status: "needs_slice",
        reason: "missing_slice",
      },
    });
  });
});
