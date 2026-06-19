import { describe, expect, it } from "vitest";
import { validateDistanceSlice, type DistanceSlice } from "../../src";

describe("validateDistanceSlice", () => {
  it("accepts non-wrapped slices within v1 length boundaries", () => {
    expect(validateDistanceSlice(makeSlice(0.1, 0.105))).toMatchObject({
      status: "valid",
    });
    expect(validateDistanceSlice(makeSlice(0.1, 0.25))).toMatchObject({
      status: "valid",
    });
  });

  it("returns needs_slice when no slice is selected", () => {
    expect(validateDistanceSlice(undefined)).toEqual({
      status: "needs_slice",
      reason: "missing_slice",
    });
  });

  it("rejects wrapped and reversed slices", () => {
    expect(validateDistanceSlice(makeSlice(0.8, 0.2))).toMatchObject({
      status: "unsupported",
      reason: "wrapped_slice",
    });
  });

  it("rejects full-lap slices", () => {
    expect(validateDistanceSlice(makeSlice(0, 1))).toMatchObject({
      status: "unsupported",
      reason: "full_lap",
    });
  });

  it("returns needs_slice for slices below the minimum length", () => {
    expect(validateDistanceSlice(makeSlice(0.1, 0.1049))).toMatchObject({
      status: "needs_slice",
      reason: "slice_too_short",
    });
  });

  it("rejects slices above the maximum length", () => {
    expect(validateDistanceSlice(makeSlice(0.1, 0.2501))).toMatchObject({
      status: "unsupported",
      reason: "slice_too_large",
    });
  });

  it("rejects out-of-range bounds", () => {
    expect(validateDistanceSlice(makeSlice(-0.1, 0.1))).toMatchObject({
      status: "unsupported",
      reason: "out_of_range",
    });
    expect(validateDistanceSlice(makeSlice(0.1, 1.1))).toMatchObject({
      status: "unsupported",
      reason: "out_of_range",
    });
  });
});

function makeSlice(startDistancePct: number, endDistancePct: number): DistanceSlice {
  return {
    startDistancePct,
    endDistancePct,
  };
}
