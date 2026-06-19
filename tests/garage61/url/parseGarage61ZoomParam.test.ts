import { describe, expect, it } from "vitest";
import { parseGarage61ZoomParam } from "../../../src";

describe("parseGarage61ZoomParam", () => {
  it("parses concrete Garage 61 z ticks into lap-distance percentages", () => {
    expect(parseGarage61ZoomParam("354-1884")).toEqual({
      status: "slice",
      slice: {
        startDistancePct: 0.0354,
        endDistancePct: 0.1884,
        source: {
          kind: "garage61-url-z",
          raw: "354-1884",
          startTick: 354,
          endTick: 1884,
        },
      },
    });
  });

  it("treats empty bounds, 0, and 10000 as unbounded", () => {
    expect(parseGarage61ZoomParam("-1884")).toEqual({
      status: "needs_slice",
      reason: "missing_slice",
      raw: "-1884",
    });
    expect(parseGarage61ZoomParam("354-")).toEqual({
      status: "needs_slice",
      reason: "missing_slice",
      raw: "354-",
    });
    expect(parseGarage61ZoomParam("-")).toEqual({
      status: "needs_slice",
      reason: "missing_slice",
      raw: "-",
    });
    expect(parseGarage61ZoomParam("0-1884")).toEqual({
      status: "needs_slice",
      reason: "missing_slice",
      raw: "0-1884",
    });
    expect(parseGarage61ZoomParam("354-10000")).toEqual({
      status: "needs_slice",
      reason: "missing_slice",
      raw: "354-10000",
    });
  });

  it("returns needs_slice when z is missing", () => {
    expect(parseGarage61ZoomParam(undefined)).toEqual({
      status: "needs_slice",
      reason: "missing_slice",
    });
  });

  it("rejects invalid characters", () => {
    expect(parseGarage61ZoomParam("354;1884")).toEqual({
      status: "unsupported",
      reason: "invalid_zoom",
      raw: "354;1884",
    });
    expect(parseGarage61ZoomParam("354-abc")).toEqual({
      status: "unsupported",
      reason: "invalid_zoom",
      raw: "354-abc",
    });
  });

  it("rejects out-of-range ticks", () => {
    expect(parseGarage61ZoomParam("354-10001")).toEqual({
      status: "unsupported",
      reason: "out_of_range",
      raw: "354-10001",
    });
  });

  it("preserves wrapped concrete ranges for slice validation", () => {
    expect(parseGarage61ZoomParam("9000-100")).toMatchObject({
      status: "slice",
      slice: {
        startDistancePct: 0.9,
        endDistancePct: 0.01,
      },
    });
  });
});
