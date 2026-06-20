import type { Garage61ZoomParseResult } from "./types";

const GARAGE61_ZOOM_TICK_SCALE = 10000;

export type { Garage61ZoomParseReason, Garage61ZoomParseResult } from "./types";

export function parseGarage61ZoomParam(
  z: string | undefined | null,
): Garage61ZoomParseResult {
  if (z === undefined || z === null) {
    return {
      status: "needs_slice",
      reason: "missing_slice",
    };
  }

  const raw = z;
  const trimmed = z.trim();
  const match = /^(\d*)-(\d*)$/.exec(trimmed);

  if (!match) {
    return {
      status: "unsupported",
      reason: "invalid_zoom",
      raw,
    };
  }

  const startTick = parseBound(match[1]);
  const endTick = parseBound(match[2]);

  if (startTick === "invalid" || endTick === "invalid") {
    return {
      status: "unsupported",
      reason: "out_of_range",
      raw,
    };
  }

  if (startTick === null || endTick === null) {
    return {
      status: "needs_slice",
      reason: "missing_slice",
      raw,
    };
  }

  return {
    status: "slice",
    slice: {
      startDistancePct: startTick / GARAGE61_ZOOM_TICK_SCALE,
      endDistancePct: endTick / GARAGE61_ZOOM_TICK_SCALE,
      source: {
        kind: "garage61-url-z",
        raw,
        startTick,
        endTick,
      },
    },
  };
}

function parseBound(rawBound: string): number | null | "invalid" {
  if (rawBound === "") {
    return null;
  }

  const tick = Number(rawBound);

  if (!Number.isSafeInteger(tick) || tick < 0 || tick > GARAGE61_ZOOM_TICK_SCALE) {
    return "invalid";
  }

  if (tick === 0 || tick === GARAGE61_ZOOM_TICK_SCALE) {
    return null;
  }

  return tick;
}
