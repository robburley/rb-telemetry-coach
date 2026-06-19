import { defaultAnalysisConfig, type AnalysisConfig } from "./config";
import { detectDrivingEvents } from "./events";
import { resampleTelemetryPair } from "./resampling";
import { smoothResampledTelemetry } from "./smoothing";
import type {
  ComparisonContext,
  DetectedDrivingEvents,
  ResampledTelemetry,
} from "../domain/types";

export interface TelemetryComparison {
  context: ComparisonContext;
  config: AnalysisConfig;
  reference: ResampledTelemetry;
  target: ResampledTelemetry;
  referenceEvents: DetectedDrivingEvents;
  targetEvents: DetectedDrivingEvents;
  metrics: ComparisonMetrics;
}

export interface ComparisonMetrics {
  lapLengthM?: number;
  speed?: SpeedComparisonMetrics;
  braking?: BrakingComparisonMetrics;
  throttle?: ThrottleComparisonMetrics;
  steering?: SteeringComparisonMetrics;
  gearRpm?: GearRpmComparisonMetrics;
  path?: PathComparisonMetrics;
}

export interface SpeedComparisonMetrics {
  entrySpeedDeltaKmh: number;
  minSpeedDeltaKmh: number;
  exitSpeedDeltaKmh: number;
  averageSpeedDeltaKmh: number;
  referenceMinSpeedKmh: number;
  targetMinSpeedKmh: number;
  minSpeedDistancePct: number;
  exitDistancePct: number;
}

export interface BrakingComparisonMetrics {
  brakeStartDeltaM?: number;
  brakeReleaseDeltaM?: number;
  peakBrakeDelta: number;
  brakeDurationDeltaM?: number;
}

export interface ThrottleComparisonMetrics {
  firstThrottleDeltaM?: number;
  fullThrottleDeltaM?: number;
  targetLiftCount: number;
  referenceLiftCount: number;
}

export interface SteeringComparisonMetrics {
  peakSteeringDeltaDeg: number;
  referencePeakSteeringDeg: number;
  targetPeakSteeringDeg: number;
  correctionCountDelta: number;
  targetCorrectionCount: number;
  referenceCorrectionCount: number;
  steeringUnwindDeltaM?: number;
}

export interface GearRpmComparisonMetrics {
  averageRpmDelta?: number;
  exitRpmDelta?: number;
  exitGearDelta?: number;
}

export interface PathComparisonMetrics {
  maxPathDeltaM?: number;
  maxPathDeltaDistancePct?: number;
}

export function compareTelemetry(
  context: ComparisonContext,
  config: AnalysisConfig = defaultAnalysisConfig,
): TelemetryComparison {
  const lapLengthM = context.analysis.track.lapLengthM;
  const [referenceRaw, targetRaw] = resampleTelemetryPair(
    context.reference,
    context.target,
    context.slice,
    { lapLengthM, config },
  );
  const reference = smoothResampledTelemetry(referenceRaw, config);
  const target = smoothResampledTelemetry(targetRaw, config);
  const referenceEvents = detectDrivingEvents(reference);
  const targetEvents = detectDrivingEvents(target);

  return {
    context,
    config,
    reference,
    target,
    referenceEvents,
    targetEvents,
    metrics: {
      lapLengthM,
      speed: compareSpeed(reference, target),
      braking: compareBraking(reference, target, referenceEvents, targetEvents, lapLengthM),
      throttle: compareThrottle(referenceEvents, targetEvents, lapLengthM),
      steering: compareSteering(reference, target, referenceEvents, targetEvents, lapLengthM),
      gearRpm: compareGearRpm(reference, target),
      path: comparePath(reference, target),
    },
  };
}

function compareSpeed(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
): SpeedComparisonMetrics | undefined {
  const referenceSpeed = reference.channels.speedMs;
  const targetSpeed = target.channels.speedMs;
  if (!referenceSpeed || !targetSpeed || referenceSpeed.length === 0) {
    return undefined;
  }

  const referenceMin = minWithIndex(referenceSpeed);
  const targetMin = minWithIndex(targetSpeed);
  const minIndex = targetMin.index;
  const exitIndex = targetSpeed.length - 1;

  return {
    entrySpeedDeltaKmh: msToKmh(targetSpeed[0]! - referenceSpeed[0]!),
    minSpeedDeltaKmh: msToKmh(targetMin.value - referenceSpeed[minIndex]!),
    exitSpeedDeltaKmh: msToKmh(targetSpeed[exitIndex]! - referenceSpeed[exitIndex]!),
    averageSpeedDeltaKmh: msToKmh(average(targetSpeed) - average(referenceSpeed)),
    referenceMinSpeedKmh: msToKmh(referenceMin.value),
    targetMinSpeedKmh: msToKmh(targetMin.value),
    minSpeedDistancePct: target.distancePct[minIndex]!,
    exitDistancePct: target.distancePct[exitIndex]!,
  };
}

function compareBraking(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
  referenceEvents: DetectedDrivingEvents,
  targetEvents: DetectedDrivingEvents,
  lapLengthM: number | undefined,
): BrakingComparisonMetrics | undefined {
  if (!reference.channels.brake || !target.channels.brake) {
    return undefined;
  }

  const referenceDuration =
    referenceEvents.brakeStartDistancePct !== undefined &&
    referenceEvents.brakeReleaseDistancePct !== undefined
      ? distanceDelta(referenceEvents.brakeStartDistancePct, referenceEvents.brakeReleaseDistancePct, lapLengthM)
      : undefined;
  const targetDuration =
    targetEvents.brakeStartDistancePct !== undefined &&
    targetEvents.brakeReleaseDistancePct !== undefined
      ? distanceDelta(targetEvents.brakeStartDistancePct, targetEvents.brakeReleaseDistancePct, lapLengthM)
      : undefined;

  return {
    brakeStartDeltaM: eventDeltaM(
      referenceEvents.brakeStartDistancePct,
      targetEvents.brakeStartDistancePct,
      lapLengthM,
    ),
    brakeReleaseDeltaM: eventDeltaM(
      referenceEvents.brakeReleaseDistancePct,
      targetEvents.brakeReleaseDistancePct,
      lapLengthM,
    ),
    peakBrakeDelta: maxValue(target.channels.brake) - maxValue(reference.channels.brake),
    brakeDurationDeltaM:
      referenceDuration !== undefined && targetDuration !== undefined
        ? targetDuration - referenceDuration
        : undefined,
  };
}

function compareThrottle(
  referenceEvents: DetectedDrivingEvents,
  targetEvents: DetectedDrivingEvents,
  lapLengthM: number | undefined,
): ThrottleComparisonMetrics | undefined {
  const hasThrottle =
    referenceEvents.firstThrottleDistancePct !== undefined ||
    targetEvents.firstThrottleDistancePct !== undefined ||
    referenceEvents.fullThrottleDistancePct !== undefined ||
    targetEvents.fullThrottleDistancePct !== undefined ||
    (targetEvents.throttleLiftDistancePct?.length ?? 0) > 0;

  if (!hasThrottle) {
    return undefined;
  }

  return {
    firstThrottleDeltaM: eventDeltaM(
      referenceEvents.firstThrottleDistancePct,
      targetEvents.firstThrottleDistancePct,
      lapLengthM,
    ),
    fullThrottleDeltaM: eventDeltaM(
      referenceEvents.fullThrottleDistancePct,
      targetEvents.fullThrottleDistancePct,
      lapLengthM,
    ),
    targetLiftCount: targetEvents.throttleLiftDistancePct?.length ?? 0,
    referenceLiftCount: referenceEvents.throttleLiftDistancePct?.length ?? 0,
  };
}

function compareSteering(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
  referenceEvents: DetectedDrivingEvents,
  targetEvents: DetectedDrivingEvents,
  lapLengthM: number | undefined,
): SteeringComparisonMetrics | undefined {
  const referenceSteering = reference.channels.steeringRad;
  const targetSteering = target.channels.steeringRad;
  if (!referenceSteering || !targetSteering) {
    return undefined;
  }

  const referencePeak = radToDeg(maxAbs(referenceSteering));
  const targetPeak = radToDeg(maxAbs(targetSteering));
  const referenceCorrections = referenceEvents.steeringCorrectionDistancesPct?.length ?? 0;
  const targetCorrections = targetEvents.steeringCorrectionDistancesPct?.length ?? 0;

  return {
    peakSteeringDeltaDeg: targetPeak - referencePeak,
    referencePeakSteeringDeg: referencePeak,
    targetPeakSteeringDeg: targetPeak,
    correctionCountDelta: targetCorrections - referenceCorrections,
    targetCorrectionCount: targetCorrections,
    referenceCorrectionCount: referenceCorrections,
    steeringUnwindDeltaM: eventDeltaM(
      referenceEvents.steeringUnwindDistancePct,
      targetEvents.steeringUnwindDistancePct,
      lapLengthM,
    ),
  };
}

function compareGearRpm(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
): GearRpmComparisonMetrics | undefined {
  const metrics: GearRpmComparisonMetrics = {};

  if (reference.channels.rpm && target.channels.rpm) {
    metrics.averageRpmDelta = average(target.channels.rpm) - average(reference.channels.rpm);
    metrics.exitRpmDelta =
      target.channels.rpm[target.channels.rpm.length - 1]! -
      reference.channels.rpm[reference.channels.rpm.length - 1]!;
  }

  if (reference.channels.gear && target.channels.gear) {
    metrics.exitGearDelta =
      target.channels.gear[target.channels.gear.length - 1]! -
      reference.channels.gear[reference.channels.gear.length - 1]!;
  }

  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

function comparePath(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
): PathComparisonMetrics | undefined {
  const referenceLat = reference.channels.latitude;
  const referenceLon = reference.channels.longitude;
  const targetLat = target.channels.latitude;
  const targetLon = target.channels.longitude;
  if (!referenceLat || !referenceLon || !targetLat || !targetLon) {
    return undefined;
  }

  let maxPathDeltaM = 0;
  let maxPathDeltaDistancePct = reference.distancePct[0] ?? 0;
  for (let index = 0; index < referenceLat.length; index += 1) {
    const deltaM = approximateGeoDistanceM(
      referenceLat[index]!,
      referenceLon[index]!,
      targetLat[index]!,
      targetLon[index]!,
    );
    if (deltaM > maxPathDeltaM) {
      maxPathDeltaM = deltaM;
      maxPathDeltaDistancePct = reference.distancePct[index]!;
    }
  }

  return { maxPathDeltaM, maxPathDeltaDistancePct };
}

export function eventDeltaM(
  referenceDistancePct: number | undefined,
  targetDistancePct: number | undefined,
  lapLengthM: number | undefined,
): number | undefined {
  if (
    referenceDistancePct === undefined ||
    targetDistancePct === undefined ||
    lapLengthM === undefined
  ) {
    return undefined;
  }
  return (targetDistancePct - referenceDistancePct) * lapLengthM;
}

function distanceDelta(startPct: number, endPct: number, lapLengthM: number | undefined): number | undefined {
  return lapLengthM === undefined ? undefined : (endPct - startPct) * lapLengthM;
}

function msToKmh(value: number): number {
  return value * 3.6;
}

function radToDeg(value: number): number {
  return value * (180 / Math.PI);
}

function average(values: Float32Array): number {
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  return sum / values.length;
}

function minWithIndex(values: Float32Array): { value: number; index: number } {
  let index = 0;
  for (let cursor = 1; cursor < values.length; cursor += 1) {
    if (values[cursor]! < values[index]!) {
      index = cursor;
    }
  }
  return { value: values[index]!, index };
}

function maxValue(values: Float32Array): number {
  let max = values[0] ?? 0;
  for (const value of values) {
    max = Math.max(max, value);
  }
  return max;
}

function maxAbs(values: Float32Array): number {
  let max = 0;
  for (const value of values) {
    max = Math.max(max, Math.abs(value));
  }
  return max;
}

function approximateGeoDistanceM(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
): number {
  const metresPerDegreeLat = 111_320;
  const metresPerDegreeLon = metresPerDegreeLat * Math.cos(((latA + latB) / 2) * (Math.PI / 180));
  const dx = (lonB - lonA) * metresPerDegreeLon;
  const dy = (latB - latA) * metresPerDegreeLat;
  return Math.hypot(dx, dy);
}
