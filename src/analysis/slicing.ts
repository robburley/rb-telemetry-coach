import type {
  AnalysisReportStatus,
  DistanceSlice,
  LapTelemetry,
  LapTelemetryChannels,
  SliceTelemetry,
  TelemetryChannelAvailability,
} from "../domain/types";

export const MIN_COACHING_SLICE_LENGTH_PCT = 0.005;
export const MAX_COACHING_SLICE_LENGTH_PCT = 0.15;
const SLICE_LENGTH_EPSILON = 1e-9;

export type SliceValidationReason =
  | "missing_slice"
  | "out_of_range"
  | "wrapped_slice"
  | "full_lap"
  | "slice_too_short"
  | "slice_too_large";

export type DistanceSliceValidationResult =
  | {
      status: "valid";
      slice: DistanceSlice;
    }
  | {
      status: Exclude<AnalysisReportStatus, "complete" | "unavailable">;
      reason: SliceValidationReason;
      slice?: DistanceSlice;
    };

export function validateDistanceSlice(
  slice: DistanceSlice | undefined | null,
): DistanceSliceValidationResult {
  if (!slice) {
    return {
      status: "needs_slice",
      reason: "missing_slice",
    };
  }

  const { startDistancePct, endDistancePct } = slice;

  if (
    !Number.isFinite(startDistancePct) ||
    !Number.isFinite(endDistancePct) ||
    startDistancePct < 0 ||
    endDistancePct < 0 ||
    startDistancePct > 1 ||
    endDistancePct > 1
  ) {
    return {
      status: "unsupported",
      reason: "out_of_range",
      slice,
    };
  }

  if (startDistancePct >= endDistancePct) {
    return {
      status: "unsupported",
      reason: "wrapped_slice",
      slice,
    };
  }

  const length = endDistancePct - startDistancePct;

  if (startDistancePct === 0 && endDistancePct === 1) {
    return {
      status: "unsupported",
      reason: "full_lap",
      slice,
    };
  }

  if (length < MIN_COACHING_SLICE_LENGTH_PCT - SLICE_LENGTH_EPSILON) {
    return {
      status: "needs_slice",
      reason: "slice_too_short",
      slice,
    };
  }

  if (length > MAX_COACHING_SLICE_LENGTH_PCT + SLICE_LENGTH_EPSILON) {
    return {
      status: "unsupported",
      reason: "slice_too_large",
      slice,
    };
  }

  return {
    status: "valid",
    slice,
  };
}

export function sliceLapTelemetry(
  telemetry: LapTelemetry,
  slice: DistanceSlice,
): SliceTelemetry {
  const validation = validateDistanceSlice(slice);
  if (validation.status !== "valid") {
    throw new Error(`Cannot slice telemetry: ${validation.reason}`);
  }

  const { distancePct } = telemetry.channels;
  const startIndex = findFirstIndexAtOrAfter(distancePct, slice.startDistancePct);
  const endIndexExclusive = findFirstIndexAfter(distancePct, slice.endDistancePct);

  if (startIndex >= endIndexExclusive) {
    throw new Error("Cannot slice telemetry: no samples in requested range");
  }

  const channels: LapTelemetryChannels = {
    distancePct: distancePct.slice(startIndex, endIndexExclusive),
  };

  copyOptionalFloat32Channel(
    channels,
    "speedMs",
    telemetry.channels.speedMs,
    startIndex,
    endIndexExclusive,
  );
  copyOptionalFloat32Channel(
    channels,
    "brake",
    telemetry.channels.brake,
    startIndex,
    endIndexExclusive,
  );
  copyOptionalFloat32Channel(
    channels,
    "throttle",
    telemetry.channels.throttle,
    startIndex,
    endIndexExclusive,
  );
  copyOptionalFloat32Channel(
    channels,
    "steeringRad",
    telemetry.channels.steeringRad,
    startIndex,
    endIndexExclusive,
  );
  copyOptionalInt32Channel(
    channels,
    "gear",
    telemetry.channels.gear,
    startIndex,
    endIndexExclusive,
  );
  copyOptionalFloat32Channel(
    channels,
    "rpm",
    telemetry.channels.rpm,
    startIndex,
    endIndexExclusive,
  );
  copyOptionalFloat64Channel(
    channels,
    "latitude",
    telemetry.channels.latitude,
    startIndex,
    endIndexExclusive,
  );
  copyOptionalFloat64Channel(
    channels,
    "longitude",
    telemetry.channels.longitude,
    startIndex,
    endIndexExclusive,
  );
  copyOptionalFloat32Channel(
    channels,
    "headingRad",
    telemetry.channels.headingRad,
    startIndex,
    endIndexExclusive,
  );

  return {
    lapId: telemetry.lapId,
    slice,
    telemetry: {
      ...telemetry,
      sampleCount: channels.distancePct.length,
      channels,
      channelAvailability: makeAvailability(channels),
    },
  };
}

function findFirstIndexAtOrAfter(values: Float64Array, target: number): number {
  for (let index = 0; index < values.length; index += 1) {
    if (values[index]! >= target) {
      return index;
    }
  }

  return values.length;
}

function findFirstIndexAfter(values: Float64Array, target: number): number {
  for (let index = 0; index < values.length; index += 1) {
    if (values[index]! > target) {
      return index;
    }
  }

  return values.length;
}

function copyOptionalFloat32Channel(
  target: LapTelemetryChannels,
  key: keyof Pick<
    LapTelemetryChannels,
    "speedMs" | "brake" | "throttle" | "steeringRad" | "rpm" | "headingRad"
  >,
  source: Float32Array | undefined,
  startIndex: number,
  endIndexExclusive: number,
): void {
  if (source) {
    target[key] = source.slice(startIndex, endIndexExclusive);
  }
}

function copyOptionalFloat64Channel(
  target: LapTelemetryChannels,
  key: keyof Pick<LapTelemetryChannels, "latitude" | "longitude">,
  source: Float64Array | undefined,
  startIndex: number,
  endIndexExclusive: number,
): void {
  if (source) {
    target[key] = source.slice(startIndex, endIndexExclusive);
  }
}

function copyOptionalInt32Channel(
  target: LapTelemetryChannels,
  key: keyof Pick<LapTelemetryChannels, "gear">,
  source: Int32Array | undefined,
  startIndex: number,
  endIndexExclusive: number,
): void {
  if (source) {
    target[key] = source.slice(startIndex, endIndexExclusive);
  }
}

function makeAvailability(
  channels: LapTelemetryChannels,
): TelemetryChannelAvailability {
  return {
    distancePct: true,
    speedMs: channels.speedMs !== undefined,
    brake: channels.brake !== undefined,
    throttle: channels.throttle !== undefined,
    steeringRad: channels.steeringRad !== undefined,
    gear: channels.gear !== undefined,
    rpm: channels.rpm !== undefined,
    latitude: channels.latitude !== undefined,
    longitude: channels.longitude !== undefined,
    headingRad: channels.headingRad !== undefined,
  };
}
