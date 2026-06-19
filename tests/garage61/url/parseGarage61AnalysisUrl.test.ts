import { describe, expect, it } from "vitest";
import { isGarage61LapAnalysisRoute, parseGarage61AnalysisUrl } from "../../../src";

describe("parseGarage61AnalysisUrl", () => {
  it("extracts analysis id and query zoom from legacy Garage 61 analysis routes", () => {
    expect(
      parseGarage61AnalysisUrl(
        "https://garage61.net/app/analysis/01KVBECPC8BM15DJ7X80X1RGCT?z=354-1200",
      ),
    ).toMatchObject({
      analysisId: "01KVBECPC8BM15DJ7X80X1RGCT",
      isEligibleAnalysisRoute: false,
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
      isEligibleAnalysisRoute: false,
      zoomRaw: "400-900",
      zoom: {
        status: "slice",
      },
    });
  });

  it("marks Garage 61 lap analysis routes eligible", () => {
    expect(
      parseGarage61AnalysisUrl(
        "https://garage61.net/app/analysis/laps/01KV8Y12QEYZF31XCNMAG69JBK;z=400-900;v=driving-style",
      ),
    ).toMatchObject({
      analysisId: "01KV8Y12QEYZF31XCNMAG69JBK",
      isEligibleAnalysisRoute: true,
      zoomRaw: "400-900",
      zoom: {
        status: "slice",
      },
    });
  });

  it("rejects ineligible Garage 61 pages for visible extension UI", () => {
    expect(
      isGarage61LapAnalysisRoute(
        "https://garage61.net/app/analysis/01KVBECPC8BM15DJ7X80X1RGCT",
      ),
    ).toBe(false);
    expect(
      isGarage61LapAnalysisRoute(
        "https://garage61.net/app/analyses/01KVBECPC8BM15DJ7X80X1RGCT",
      ),
    ).toBe(false);
    expect(
      isGarage61LapAnalysisRoute(
        "https://garage61.net/app/drivers/01KVBECPC8BM15DJ7X80X1RGCT",
      ),
    ).toBe(false);
    expect(isGarage61LapAnalysisRoute("https://garage61.net/app/analysis/laps/not-a-valid-id")).toBe(
      false,
    );
  });

  it("returns missing slice state when no zoom parameter is present", () => {
    expect(
      parseGarage61AnalysisUrl(
        "https://garage61.net/app/analysis/laps/01KVBECPC8BM15DJ7X80X1RGCT",
      ),
    ).toMatchObject({
      analysisId: "01KVBECPC8BM15DJ7X80X1RGCT",
      isEligibleAnalysisRoute: true,
      zoom: {
        status: "needs_slice",
        reason: "missing_slice",
      },
    });
  });
});
