import { defaultAnalysisConfig, type AnalysisConfig } from "./config";
import { sliceLapTelemetry } from "./slicing";
import type { DistanceSlice, LapTelemetry, ResampledTelemetry } from "../domain/types";

export interface ResampleTelemetryOptions {
  lapLengthM?: number;
  config?: AnalysisConfig;
}

export function resampleTelemetryPair(
  reference: LapTelemetry,
  target: LapTelemetry,
  slice: DistanceSlice,
  options: ResampleTelemetryOptions = {},
): [ResampledTelemetry, ResampledTelemetry] {
  const axis = buildCommonDistanceAxis(slice, options);

  return [
    resampleLapTelemetry(reference, axis, options),
    resampleLapTelemetry(target, axis, options),
  ];
}

export function resampleLapTelemetry(
  telemetry: LapTelemetry,
  distancePct: Float64Array,
  options: ResampleTelemetryOptions = {},
): ResampledTelemetry {
  const config = options.config ?? defaultAnalysisConfig;
  const slice = {
    startDistancePct: distancePct[0] ?? 0,
    endDistancePct: distancePct[distancePct.length - 1] ?? 0,
  };
  const sliced = sliceLapTelemetry(telemetry, slice, config.slicing).telemetry;
  const sourceDistance = sliced.channels.distancePct;
  const distanceM = options.lapLengthM
    ? Float64Array.from(distancePct, (distance) => distance * options.lapLengthM!)
    : undefined;

  return {
    lapId: telemetry.lapId,
    distancePct,
    distanceM,
    channels: {
      distancePct,
      speedMs: interpolateFloat32(sourceDistance, sliced.channels.speedMs, distancePct),
      brake: interpolateFloat32(sourceDistance, sliced.channels.brake, distancePct),
      throttle: interpolateFloat32(sourceDistance, sliced.channels.throttle, distancePct),
      steeringRad: interpolateFloat32(
        sourceDistance,
        sliced.channels.steeringRad,
        distancePct,
      ),
      gear: interpolateInt32(sourceDistance, sliced.channels.gear, distancePct),
      rpm: interpolateFloat32(sourceDistance, sliced.channels.rpm, distancePct),
      latitude: interpolateFloat64(sourceDistance, sliced.channels.latitude, distancePct),
      longitude: interpolateFloat64(sourceDistance, sliced.channels.longitude, distancePct),
      headingRad: interpolateFloat32(sourceDistance, sliced.channels.headingRad, distancePct),
    },
  };
}

export function buildCommonDistanceAxis(
  slice: DistanceSlice,
  options: ResampleTelemetryOptions = {},
): Float64Array {
  const config = options.config ?? defaultAnalysisConfig;
  const lengthPct = slice.endDistancePct - slice.startDistancePct;
  const stepPct = options.lapLengthM
    ? config.resampling.resampleStepM / options.lapLengthM
    : lengthPct / Math.max(1, config.resampling.maxResampledPoints - 1);
  const pointCount = Math.floor(lengthPct / stepPct + 1e-9) + 1;

  if (pointCount < 2) {
    throw new Error("Cannot resample telemetry: slice is too small");
  }

  if (pointCount > config.resampling.maxResampledPoints) {
    throw new Error(
      `Cannot resample telemetry: ${pointCount} points exceeds maxResampledPoints ${config.resampling.maxResampledPoints}`,
    );
  }

  const axis = new Float64Array(pointCount);
  for (let index = 0; index < pointCount; index += 1) {
    axis[index] = slice.startDistancePct + stepPct * index;
  }
  axis[axis.length - 1] = Math.min(axis[axis.length - 1]!, slice.endDistancePct);
  return axis;
}

function interpolateFloat32(
  sourceDistance: Float64Array,
  sourceValues: Float32Array | undefined,
  targetDistance: Float64Array,
): Float32Array | undefined {
  if (!sourceValues) {
    return undefined;
  }

  const output = new Float32Array(targetDistance.length);
  fillInterpolated(sourceDistance, sourceValues, targetDistance, output);
  return output;
}

function interpolateFloat64(
  sourceDistance: Float64Array,
  sourceValues: Float64Array | undefined,
  targetDistance: Float64Array,
): Float64Array | undefined {
  if (!sourceValues) {
    return undefined;
  }

  const output = new Float64Array(targetDistance.length);
  fillInterpolated(sourceDistance, sourceValues, targetDistance, output);
  return output;
}

function interpolateInt32(
  sourceDistance: Float64Array,
  sourceValues: Int32Array | undefined,
  targetDistance: Float64Array,
): Int32Array | undefined {
  if (!sourceValues) {
    return undefined;
  }

  const output = new Int32Array(targetDistance.length);
  let sourceIndex = 0;
  for (let targetIndex = 0; targetIndex < targetDistance.length; targetIndex += 1) {
    const target = targetDistance[targetIndex]!;
    while (
      sourceIndex < sourceDistance.length - 2 &&
      sourceDistance[sourceIndex + 1]! <= target
    ) {
      sourceIndex += 1;
    }
    const nextIndex = Math.min(sourceIndex + 1, sourceDistance.length - 1);
    const previousDelta = Math.abs(target - sourceDistance[sourceIndex]!);
    const nextDelta = Math.abs(sourceDistance[nextIndex]! - target);
    output[targetIndex] = sourceValues[nextDelta < previousDelta ? nextIndex : sourceIndex]!;
  }

  return output;
}

function fillInterpolated(
  sourceDistance: Float64Array,
  sourceValues: Float32Array | Float64Array,
  targetDistance: Float64Array,
  output: Float32Array | Float64Array,
): void {
  let sourceIndex = 0;

  for (let targetIndex = 0; targetIndex < targetDistance.length; targetIndex += 1) {
    const target = targetDistance[targetIndex]!;
    while (
      sourceIndex < sourceDistance.length - 2 &&
      sourceDistance[sourceIndex + 1]! < target
    ) {
      sourceIndex += 1;
    }

    const leftDistance = sourceDistance[sourceIndex]!;
    const rightDistance = sourceDistance[Math.min(sourceIndex + 1, sourceDistance.length - 1)]!;
    const leftValue = sourceValues[sourceIndex]!;
    const rightValue = sourceValues[Math.min(sourceIndex + 1, sourceValues.length - 1)]!;
    const span = rightDistance - leftDistance;
    const ratio = span > 0 ? (target - leftDistance) / span : 0;
    output[targetIndex] = leftValue + (rightValue - leftValue) * ratio;
  }
}
