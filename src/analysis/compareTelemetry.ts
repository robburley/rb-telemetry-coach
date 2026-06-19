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
  throttleLiftQuality?: ThrottleLiftQualityComparisonMetrics;
  brakePressureShape?: BrakePressureShapeComparisonMetrics;
  brakeToThrottleTransition?: BrakeToThrottleTransitionComparisonMetrics;
  headingRotation?: HeadingRotationComparisonMetrics;
  lineUsage?: HeadingAwareLineUsageMetrics;
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

export interface ThrottleLiftQualityComparisonMetrics {
  targetArea: number;
  referenceArea: number;
  areaDelta: number;
  targetAverage: number;
  referenceAverage: number;
  targetLiftCount: number;
  referenceLiftCount: number;
  liftCountDelta: number;
  targetFirstLiftStartDistancePct?: number;
  targetFirstLiftEndDistancePct?: number;
  referenceFirstLiftStartDistancePct?: number;
  referenceFirstLiftEndDistancePct?: number;
  targetMaxLiftDepth: number;
  referenceMaxLiftDepth: number;
  maxLiftDepthDelta: number;
  targetLongestLiftDurationM?: number;
  referenceLongestLiftDurationM?: number;
  longestLiftDurationDeltaM?: number;
  targetTotalLiftDistanceM?: number;
  referenceTotalLiftDistanceM?: number;
  totalLiftDistanceDeltaM?: number;
  targetThrottleAreaLostM?: number;
  referenceThrottleAreaLostM?: number;
  throttleAreaLostDeltaM?: number;
}

export interface BrakePressureShapeComparisonMetrics {
  targetPeakBrake: number;
  referencePeakBrake: number;
  peakBrakeDistanceDeltaM?: number;
  targetBrakeArea: number;
  referenceBrakeArea: number;
  brakeAreaDelta: number;
  targetStartToPeakDistanceM?: number;
  referenceStartToPeakDistanceM?: number;
  startToPeakDistanceDeltaM?: number;
  targetInitialRampRatePerM?: number;
  referenceInitialRampRatePerM?: number;
  initialRampRateDeltaPerM?: number;
  targetReleaseDistanceM?: number;
  referenceReleaseDistanceM?: number;
  releaseDistanceDeltaM?: number;
  targetReleaseRampRatePerM?: number;
  referenceReleaseRampRatePerM?: number;
  releaseRampRateDeltaPerM?: number;
  targetBrakeAroundMinSpeed: number;
  referenceBrakeAroundMinSpeed: number;
  brakeAroundMinSpeedDelta: number;
}

export interface BrakeToThrottleTransitionComparisonMetrics {
  targetCoastGapM?: number;
  referenceCoastGapM?: number;
  coastGapDeltaM?: number;
  targetBrakeThrottleOverlapM?: number;
  referenceBrakeThrottleOverlapM?: number;
  targetMinSpeedToThrottlePickupM?: number;
  referenceMinSpeedToThrottlePickupM?: number;
  minSpeedToThrottlePickupDeltaM?: number;
  targetSpeedLostDuringCoastKmh?: number;
  referenceSpeedLostDuringCoastKmh?: number;
  speedLostDuringCoastDeltaKmh?: number;
}

export interface HeadingRotationComparisonMetrics {
  targetHeadingChangeDeg: number;
  referenceHeadingChangeDeg: number;
  headingChangeDeltaDeg: number;
  targetHeadingAtApexDeg?: number;
  referenceHeadingAtApexDeg?: number;
  apexHeadingDeltaDeg?: number;
  targetHeadingAtMinSpeedDeg?: number;
  referenceHeadingAtMinSpeedDeg?: number;
  minSpeedHeadingDeltaDeg?: number;
  targetReferenceEquivalentHeadingDistanceDeltaM?: number;
}

export type CornerDirection = "left" | "right" | "ambiguous";

export interface HeadingAwareLineUsageMetrics {
  cornerDirection: CornerDirection;
  averageLateralOffsetM: number;
  maxAbsLateralOffsetM: number;
  maxAbsLateralOffsetDistancePct: number;
  entry: LateralOffsetWindowSummary;
  apex: LateralOffsetWindowSummary;
  exit: LateralOffsetWindowSummary;
}

export interface LateralOffsetWindowSummary {
  startDistancePct: number;
  endDistancePct: number;
  averageLateralOffsetM: number;
  maxAbsLateralOffsetM: number;
  maxAbsLateralOffsetDistancePct: number;
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
      throttleLiftQuality: compareThrottleLiftQuality(reference, target, lapLengthM),
      brakePressureShape: compareBrakePressureShape(reference, target, referenceEvents, targetEvents, lapLengthM),
      brakeToThrottleTransition: compareBrakeToThrottleTransition(
        reference,
        target,
        referenceEvents,
        targetEvents,
        lapLengthM,
      ),
      headingRotation: compareHeadingRotation(reference, target, lapLengthM),
      lineUsage: compareLineUsage(reference, target, config),
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

function compareThrottleLiftQuality(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
  lapLengthM: number | undefined,
): ThrottleLiftQualityComparisonMetrics | undefined {
  const referenceThrottle = reference.channels.throttle;
  const targetThrottle = target.channels.throttle;
  if (!referenceThrottle || !targetThrottle) {
    return undefined;
  }

  const referenceArea = normalizedPedalArea(referenceThrottle, reference.distancePct, lapLengthM);
  const targetArea = normalizedPedalArea(targetThrottle, target.distancePct, lapLengthM);
  const referenceLiftSummary = summarizeThrottleLifts(referenceThrottle, reference.distancePct, lapLengthM);
  const targetLiftSummary = summarizeThrottleLifts(targetThrottle, target.distancePct, lapLengthM);

  return {
    targetArea,
    referenceArea,
    areaDelta: targetArea - referenceArea,
    targetAverage: average(targetThrottle),
    referenceAverage: average(referenceThrottle),
    targetLiftCount: targetLiftSummary.count,
    referenceLiftCount: referenceLiftSummary.count,
    liftCountDelta: targetLiftSummary.count - referenceLiftSummary.count,
    targetFirstLiftStartDistancePct: targetLiftSummary.firstStartDistancePct,
    targetFirstLiftEndDistancePct: targetLiftSummary.firstEndDistancePct,
    referenceFirstLiftStartDistancePct: referenceLiftSummary.firstStartDistancePct,
    referenceFirstLiftEndDistancePct: referenceLiftSummary.firstEndDistancePct,
    targetMaxLiftDepth: targetLiftSummary.maxDepth,
    referenceMaxLiftDepth: referenceLiftSummary.maxDepth,
    maxLiftDepthDelta: targetLiftSummary.maxDepth - referenceLiftSummary.maxDepth,
    targetLongestLiftDurationM: targetLiftSummary.longestDurationM,
    referenceLongestLiftDurationM: referenceLiftSummary.longestDurationM,
    longestLiftDurationDeltaM: optionalDelta(
      targetLiftSummary.longestDurationM,
      referenceLiftSummary.longestDurationM,
    ),
    targetTotalLiftDistanceM: targetLiftSummary.totalDistanceM,
    referenceTotalLiftDistanceM: referenceLiftSummary.totalDistanceM,
    totalLiftDistanceDeltaM: optionalDelta(
      targetLiftSummary.totalDistanceM,
      referenceLiftSummary.totalDistanceM,
    ),
    targetThrottleAreaLostM: targetLiftSummary.throttleAreaLostM,
    referenceThrottleAreaLostM: referenceLiftSummary.throttleAreaLostM,
    throttleAreaLostDeltaM: optionalDelta(
      targetLiftSummary.throttleAreaLostM,
      referenceLiftSummary.throttleAreaLostM,
    ),
  };
}

function compareBrakePressureShape(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
  referenceEvents: DetectedDrivingEvents,
  targetEvents: DetectedDrivingEvents,
  lapLengthM: number | undefined,
): BrakePressureShapeComparisonMetrics | undefined {
  const referenceBrake = reference.channels.brake;
  const targetBrake = target.channels.brake;
  if (!referenceBrake || !targetBrake) {
    return undefined;
  }

  const referencePeak = maxWithIndex(referenceBrake);
  const targetPeak = maxWithIndex(targetBrake);
  const referenceBrakeArea = normalizedPedalArea(referenceBrake, reference.distancePct, lapLengthM);
  const targetBrakeArea = normalizedPedalArea(targetBrake, target.distancePct, lapLengthM);
  const referenceStartToPeakDistanceM = distanceBetweenPct(
    referenceEvents.brakeStartDistancePct,
    reference.distancePct[referencePeak.index],
    lapLengthM,
  );
  const targetStartToPeakDistanceM = distanceBetweenPct(
    targetEvents.brakeStartDistancePct,
    target.distancePct[targetPeak.index],
    lapLengthM,
  );
  const referenceReleaseDistanceM = distanceBetweenPct(
    reference.distancePct[referencePeak.index],
    referenceEvents.brakeReleaseDistancePct,
    lapLengthM,
  );
  const targetReleaseDistanceM = distanceBetweenPct(
    target.distancePct[targetPeak.index],
    targetEvents.brakeReleaseDistancePct,
    lapLengthM,
  );
  const referenceInitialRampRatePerM = brakeRampRate(referencePeak.value, referenceStartToPeakDistanceM);
  const targetInitialRampRatePerM = brakeRampRate(targetPeak.value, targetStartToPeakDistanceM);
  const referenceReleaseRampRatePerM = brakeRampRate(referencePeak.value, referenceReleaseDistanceM);
  const targetReleaseRampRatePerM = brakeRampRate(targetPeak.value, targetReleaseDistanceM);
  const referenceBrakeAroundMinSpeed = averageBrakeAroundMinSpeed(reference, referenceBrake);
  const targetBrakeAroundMinSpeed = averageBrakeAroundMinSpeed(target, targetBrake);

  return {
    targetPeakBrake: targetPeak.value,
    referencePeakBrake: referencePeak.value,
    peakBrakeDistanceDeltaM: eventDeltaM(
      reference.distancePct[referencePeak.index],
      target.distancePct[targetPeak.index],
      lapLengthM,
    ),
    targetBrakeArea,
    referenceBrakeArea,
    brakeAreaDelta: targetBrakeArea - referenceBrakeArea,
    targetStartToPeakDistanceM,
    referenceStartToPeakDistanceM,
    startToPeakDistanceDeltaM: optionalDelta(targetStartToPeakDistanceM, referenceStartToPeakDistanceM),
    targetInitialRampRatePerM,
    referenceInitialRampRatePerM,
    initialRampRateDeltaPerM: optionalDelta(targetInitialRampRatePerM, referenceInitialRampRatePerM),
    targetReleaseDistanceM,
    referenceReleaseDistanceM,
    releaseDistanceDeltaM: optionalDelta(targetReleaseDistanceM, referenceReleaseDistanceM),
    targetReleaseRampRatePerM,
    referenceReleaseRampRatePerM,
    releaseRampRateDeltaPerM: optionalDelta(targetReleaseRampRatePerM, referenceReleaseRampRatePerM),
    targetBrakeAroundMinSpeed,
    referenceBrakeAroundMinSpeed,
    brakeAroundMinSpeedDelta: targetBrakeAroundMinSpeed - referenceBrakeAroundMinSpeed,
  };
}

function compareBrakeToThrottleTransition(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
  referenceEvents: DetectedDrivingEvents,
  targetEvents: DetectedDrivingEvents,
  lapLengthM: number | undefined,
): BrakeToThrottleTransitionComparisonMetrics | undefined {
  const referenceCoastGapM = distanceBetweenPct(
    referenceEvents.brakeReleaseDistancePct,
    referenceEvents.firstThrottleDistancePct,
    lapLengthM,
  );
  const targetCoastGapM = distanceBetweenPct(
    targetEvents.brakeReleaseDistancePct,
    targetEvents.firstThrottleDistancePct,
    lapLengthM,
  );
  const referenceOverlapM = distanceBetweenPct(
    referenceEvents.firstThrottleDistancePct,
    referenceEvents.brakeReleaseDistancePct,
    lapLengthM,
  );
  const targetOverlapM = distanceBetweenPct(
    targetEvents.firstThrottleDistancePct,
    targetEvents.brakeReleaseDistancePct,
    lapLengthM,
  );
  const referenceMinSpeedToThrottlePickupM = distanceBetweenPct(
    minSpeedDistancePct(reference),
    referenceEvents.firstThrottleDistancePct,
    lapLengthM,
  );
  const targetMinSpeedToThrottlePickupM = distanceBetweenPct(
    minSpeedDistancePct(target),
    targetEvents.firstThrottleDistancePct,
    lapLengthM,
  );
  const referenceSpeedLostDuringCoastKmh = speedLostDuringCoastKmh(
    reference,
    referenceEvents.brakeReleaseDistancePct,
    referenceEvents.firstThrottleDistancePct,
  );
  const targetSpeedLostDuringCoastKmh = speedLostDuringCoastKmh(
    target,
    targetEvents.brakeReleaseDistancePct,
    targetEvents.firstThrottleDistancePct,
  );

  if (
    referenceCoastGapM === undefined &&
    targetCoastGapM === undefined &&
    referenceOverlapM === undefined &&
    targetOverlapM === undefined &&
    referenceMinSpeedToThrottlePickupM === undefined &&
    targetMinSpeedToThrottlePickupM === undefined &&
    referenceSpeedLostDuringCoastKmh === undefined &&
    targetSpeedLostDuringCoastKmh === undefined
  ) {
    return undefined;
  }

  return {
    targetCoastGapM: targetCoastGapM !== undefined ? Math.max(0, targetCoastGapM) : undefined,
    referenceCoastGapM: referenceCoastGapM !== undefined ? Math.max(0, referenceCoastGapM) : undefined,
    coastGapDeltaM:
      referenceCoastGapM !== undefined && targetCoastGapM !== undefined
        ? Math.max(0, targetCoastGapM) - Math.max(0, referenceCoastGapM)
        : undefined,
    targetBrakeThrottleOverlapM:
      targetOverlapM !== undefined ? Math.max(0, targetOverlapM) : undefined,
    referenceBrakeThrottleOverlapM:
      referenceOverlapM !== undefined ? Math.max(0, referenceOverlapM) : undefined,
    targetMinSpeedToThrottlePickupM,
    referenceMinSpeedToThrottlePickupM,
    minSpeedToThrottlePickupDeltaM: optionalDelta(
      targetMinSpeedToThrottlePickupM,
      referenceMinSpeedToThrottlePickupM,
    ),
    targetSpeedLostDuringCoastKmh,
    referenceSpeedLostDuringCoastKmh,
    speedLostDuringCoastDeltaKmh: optionalDelta(
      targetSpeedLostDuringCoastKmh,
      referenceSpeedLostDuringCoastKmh,
    ),
  };
}

function compareHeadingRotation(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
  lapLengthM: number | undefined,
): HeadingRotationComparisonMetrics | undefined {
  const referenceCoordinates = localCoordinatesFromTelemetry(reference);
  const targetCoordinates = localCoordinatesFromTelemetry(target, referenceCoordinates?.origin);
  const referenceHeading = deriveTravelDirections(reference, referenceCoordinates);
  const targetHeading = deriveTravelDirections(target, targetCoordinates);
  if (!referenceHeading || !targetHeading || referenceHeading.length < 2 || targetHeading.length < 2) {
    return undefined;
  }

  const referenceUnwrapped = unwrapAngles(referenceHeading);
  const targetUnwrapped = unwrapAngles(targetHeading);
  const referenceHeadingChangeDeg = radToDeg(
    referenceUnwrapped[referenceUnwrapped.length - 1]! - referenceUnwrapped[0]!,
  );
  const targetHeadingChangeDeg = radToDeg(
    targetUnwrapped[targetUnwrapped.length - 1]! - targetUnwrapped[0]!,
  );
  const referenceApexIndex = chooseApexIndex(reference, referenceUnwrapped);
  const targetApexIndex = chooseApexIndex(target, targetUnwrapped);
  const referenceMinSpeedIndex = minSpeedIndex(reference);
  const targetMinSpeedIndex = minSpeedIndex(target);
  const referenceEquivalentHeadingIndex =
    referenceApexIndex !== undefined
      ? closestValueIndex(targetUnwrapped, referenceUnwrapped[referenceApexIndex]!)
      : undefined;

  return {
    targetHeadingChangeDeg,
    referenceHeadingChangeDeg,
    headingChangeDeltaDeg: targetHeadingChangeDeg - referenceHeadingChangeDeg,
    targetHeadingAtApexDeg: valueAtDeg(targetUnwrapped, targetApexIndex),
    referenceHeadingAtApexDeg: valueAtDeg(referenceUnwrapped, referenceApexIndex),
    apexHeadingDeltaDeg: optionalDelta(
      valueAtDeg(targetUnwrapped, targetApexIndex),
      valueAtDeg(referenceUnwrapped, referenceApexIndex),
    ),
    targetHeadingAtMinSpeedDeg: valueAtDeg(targetUnwrapped, targetMinSpeedIndex),
    referenceHeadingAtMinSpeedDeg: valueAtDeg(referenceUnwrapped, referenceMinSpeedIndex),
    minSpeedHeadingDeltaDeg: optionalDelta(
      valueAtDeg(targetUnwrapped, targetMinSpeedIndex),
      valueAtDeg(referenceUnwrapped, referenceMinSpeedIndex),
    ),
    targetReferenceEquivalentHeadingDistanceDeltaM:
      referenceApexIndex !== undefined && referenceEquivalentHeadingIndex !== undefined
        ? eventDeltaM(
            reference.distancePct[referenceApexIndex],
            target.distancePct[referenceEquivalentHeadingIndex],
            lapLengthM,
          )
        : undefined,
  };
}

function compareLineUsage(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
  config: AnalysisConfig,
): HeadingAwareLineUsageMetrics | undefined {
  const referenceLat = reference.channels.latitude;
  const referenceLon = reference.channels.longitude;
  const targetLat = target.channels.latitude;
  const targetLon = target.channels.longitude;
  if (!referenceLat || !referenceLon || !targetLat || !targetLon) {
    return undefined;
  }

  const referenceCoordinates = localCoordinatesFromTelemetry(reference);
  const targetCoordinates = localCoordinatesFromTelemetry(target, referenceCoordinates?.origin);
  const referenceHeading = deriveTravelDirections(reference, referenceCoordinates);
  if (!referenceCoordinates || !targetCoordinates || !referenceHeading) {
    return undefined;
  }

  const offsets = new Float64Array(referenceLat.length);
  let maxAbsLateralOffsetM = 0;
  let maxAbsLateralOffsetDistancePct = reference.distancePct[0] ?? 0;

  for (let index = 0; index < referenceLat.length; index += 1) {
    const dx = targetCoordinates.x[index]! - referenceCoordinates.x[index]!;
    const dy = targetCoordinates.y[index]! - referenceCoordinates.y[index]!;
    const heading = referenceHeading[index]!;
    const lateralOffsetM = -Math.sin(heading) * dx + Math.cos(heading) * dy;
    offsets[index] = lateralOffsetM;
    if (Math.abs(lateralOffsetM) > maxAbsLateralOffsetM) {
      maxAbsLateralOffsetM = Math.abs(lateralOffsetM);
      maxAbsLateralOffsetDistancePct = reference.distancePct[index]!;
    }
  }

  const referenceUnwrappedHeading = unwrapAngles(referenceHeading);
  const headingChange = radToDeg(
    referenceUnwrappedHeading[referenceUnwrappedHeading.length - 1]! - referenceUnwrappedHeading[0]!,
  );
  const cornerDirection = inferCornerDirection(
    headingChange,
    config.thresholds.ambiguousCornerHeadingDeltaDeg,
  );
  const apexIndex = chooseApexIndex(reference, referenceUnwrappedHeading) ?? Math.floor(offsets.length / 2);
  const entryWindow = fractionalIndexWindow(offsets.length, 0, 0.33);
  const exitWindow = fractionalIndexWindow(offsets.length, 0.67, 1);
  const apexRadius = Math.max(1, Math.floor(offsets.length * 0.15));
  const apexWindow = {
    startIndex: Math.max(0, apexIndex - apexRadius),
    endIndex: Math.min(offsets.length - 1, apexIndex + apexRadius),
  };

  return {
    cornerDirection,
    averageLateralOffsetM: averageFloat64(offsets),
    maxAbsLateralOffsetM,
    maxAbsLateralOffsetDistancePct,
    entry: summarizeLateralOffsetWindow(offsets, reference.distancePct, entryWindow.startIndex, entryWindow.endIndex),
    apex: summarizeLateralOffsetWindow(offsets, reference.distancePct, apexWindow.startIndex, apexWindow.endIndex),
    exit: summarizeLateralOffsetWindow(offsets, reference.distancePct, exitWindow.startIndex, exitWindow.endIndex),
  };
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

export function distanceWindowIndexes(
  distancePct: Float64Array,
  startPct: number,
  endPct: number,
): { startIndex: number; endIndex: number } | undefined {
  if (distancePct.length === 0 || endPct < startPct) {
    return undefined;
  }

  let startIndex = 0;
  while (startIndex < distancePct.length && distancePct[startIndex]! < startPct) {
    startIndex += 1;
  }

  let endIndex = distancePct.length - 1;
  while (endIndex >= 0 && distancePct[endIndex]! > endPct) {
    endIndex -= 1;
  }

  return startIndex <= endIndex ? { startIndex, endIndex } : undefined;
}

export function normalizedPedalArea(
  values: Float32Array,
  distancePct: Float64Array,
  lapLengthM: number | undefined,
): number {
  if (values.length === 0 || distancePct.length === 0 || values.length !== distancePct.length) {
    return 0;
  }

  let area = 0;
  let totalDistance = 0;
  for (let index = 1; index < values.length; index += 1) {
    const span = distanceBetweenPct(distancePct[index - 1], distancePct[index], lapLengthM) ?? 0;
    const clampedSpan = Math.max(0, span);
    area += ((clampPedal(values[index - 1]!) + clampPedal(values[index]!)) / 2) * clampedSpan;
    totalDistance += clampedSpan;
  }

  return totalDistance > 0 ? area / totalDistance : average(values);
}

export function distanceBetweenPct(
  startPct: number | undefined,
  endPct: number | undefined,
  lapLengthM: number | undefined,
): number | undefined {
  if (startPct === undefined || endPct === undefined || lapLengthM === undefined) {
    return undefined;
  }
  return (endPct - startPct) * lapLengthM;
}

export function maxWithIndex(values: Float32Array): { value: number; index: number } {
  let index = 0;
  for (let cursor = 1; cursor < values.length; cursor += 1) {
    if (values[cursor]! > values[index]!) {
      index = cursor;
    }
  }
  return { value: values[index] ?? 0, index };
}

export function averageInRange(
  values: Float32Array | Float64Array,
  startIndex: number,
  endIndex: number,
): number | undefined {
  if (values.length === 0 || startIndex < 0 || endIndex < startIndex || startIndex >= values.length) {
    return undefined;
  }

  let sum = 0;
  let count = 0;
  const safeEnd = Math.min(endIndex, values.length - 1);
  for (let index = startIndex; index <= safeEnd; index += 1) {
    sum += values[index]!;
    count += 1;
  }
  return count > 0 ? sum / count : undefined;
}

export function unwrapAngles(values: Float32Array): Float64Array {
  if (values.length === 0) {
    return new Float64Array();
  }

  const output = new Float64Array(values.length);
  output[0] = values[0]!;
  let offset = 0;
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1]!;
    const current = values[index]!;
    const delta = current - previous;
    if (delta > Math.PI) {
      offset -= Math.PI * 2;
    } else if (delta < -Math.PI) {
      offset += Math.PI * 2;
    }
    output[index] = current + offset;
  }
  return output;
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

function averageFloat64(values: Float64Array): number {
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  return values.length > 0 ? sum / values.length : 0;
}

export function minWithIndex(values: Float32Array): { value: number; index: number } {
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

interface LocalCoordinates {
  x: Float64Array;
  y: Float64Array;
  origin: GeoOrigin;
}

interface GeoOrigin {
  lat: number;
  lon: number;
  metresPerDegreeLon: number;
}

function localCoordinatesFromTelemetry(
  telemetry: ResampledTelemetry,
  origin?: GeoOrigin,
): LocalCoordinates | undefined {
  const latitude = telemetry.channels.latitude;
  const longitude = telemetry.channels.longitude;
  if (!latitude || !longitude || latitude.length === 0 || longitude.length !== latitude.length) {
    return undefined;
  }

  const coordinateOrigin =
    origin ??
    {
      lat: latitude[0]!,
      lon: longitude[0]!,
      metresPerDegreeLon: 111_320 * Math.cos(latitude[0]! * (Math.PI / 180)),
    };
  const x = new Float64Array(latitude.length);
  const y = new Float64Array(latitude.length);

  for (let index = 0; index < latitude.length; index += 1) {
    x[index] = (longitude[index]! - coordinateOrigin.lon) * coordinateOrigin.metresPerDegreeLon;
    y[index] = (latitude[index]! - coordinateOrigin.lat) * 111_320;
  }

  return { x, y, origin: coordinateOrigin };
}

function deriveTravelDirections(
  telemetry: ResampledTelemetry,
  coordinates: LocalCoordinates | undefined,
): Float32Array | undefined {
  const heading = telemetry.channels.headingRad;
  if (heading && heading.length >= 2) {
    const directions = new Float32Array(heading.length);
    for (let index = 0; index < heading.length; index += 1) {
      directions[index] = Number.isFinite(heading[index]) ? heading[index]! : tangentHeadingAt(coordinates, index) ?? 0;
    }
    return directions;
  }

  if (!coordinates || coordinates.x.length < 2) {
    return undefined;
  }

  const directions = new Float32Array(coordinates.x.length);
  for (let index = 0; index < directions.length; index += 1) {
    directions[index] = tangentHeadingAt(coordinates, index) ?? 0;
  }
  return directions;
}

function tangentHeadingAt(coordinates: LocalCoordinates | undefined, index: number): number | undefined {
  if (!coordinates || coordinates.x.length < 2) {
    return undefined;
  }

  const previousIndex = Math.max(0, index - 1);
  const nextIndex = Math.min(coordinates.x.length - 1, index + 1);
  if (previousIndex === nextIndex) {
    return undefined;
  }

  const dx = coordinates.x[nextIndex]! - coordinates.x[previousIndex]!;
  const dy = coordinates.y[nextIndex]! - coordinates.y[previousIndex]!;
  if (dx === 0 && dy === 0) {
    return undefined;
  }
  return Math.atan2(dy, dx);
}

function chooseApexIndex(
  telemetry: ResampledTelemetry,
  unwrappedHeading: Float64Array | undefined,
): number | undefined {
  const speedIndex = minSpeedIndex(telemetry);
  if (speedIndex !== undefined) {
    return speedIndex;
  }

  const steering = telemetry.channels.steeringRad;
  if (steering && steering.length > 0) {
    let index = 0;
    for (let cursor = 1; cursor < steering.length; cursor += 1) {
      if (Math.abs(steering[cursor]!) > Math.abs(steering[index]!)) {
        index = cursor;
      }
    }
    return index;
  }

  if (unwrappedHeading && unwrappedHeading.length > 1) {
    let index = 1;
    let maxDelta = 0;
    for (let cursor = 1; cursor < unwrappedHeading.length; cursor += 1) {
      const delta = Math.abs(unwrappedHeading[cursor]! - unwrappedHeading[cursor - 1]!);
      if (delta > maxDelta) {
        maxDelta = delta;
        index = cursor;
      }
    }
    return index;
  }

  return telemetry.distancePct.length > 0 ? Math.floor(telemetry.distancePct.length / 2) : undefined;
}

function minSpeedIndex(telemetry: ResampledTelemetry): number | undefined {
  const speed = telemetry.channels.speedMs;
  return speed && speed.length > 0 ? minWithIndex(speed).index : undefined;
}

function minSpeedDistancePct(telemetry: ResampledTelemetry): number | undefined {
  const index = minSpeedIndex(telemetry);
  return index === undefined ? undefined : telemetry.distancePct[index];
}

function speedLostDuringCoastKmh(
  telemetry: ResampledTelemetry,
  startDistancePct: number | undefined,
  endDistancePct: number | undefined,
): number | undefined {
  const speed = telemetry.channels.speedMs;
  if (!speed || startDistancePct === undefined || endDistancePct === undefined || endDistancePct <= startDistancePct) {
    return undefined;
  }

  const startIndex = closestDistanceIndex(telemetry.distancePct, startDistancePct);
  const endIndex = closestDistanceIndex(telemetry.distancePct, endDistancePct);
  if (startIndex === undefined || endIndex === undefined || endIndex <= startIndex) {
    return undefined;
  }

  return msToKmh(speed[startIndex]! - speed[endIndex]!);
}

function closestDistanceIndex(distancePct: Float64Array, targetDistancePct: number): number | undefined {
  if (distancePct.length === 0) {
    return undefined;
  }

  let index = 0;
  for (let cursor = 1; cursor < distancePct.length; cursor += 1) {
    if (Math.abs(distancePct[cursor]! - targetDistancePct) < Math.abs(distancePct[index]! - targetDistancePct)) {
      index = cursor;
    }
  }
  return index;
}

function closestValueIndex(values: Float64Array, target: number): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  let index = 0;
  for (let cursor = 1; cursor < values.length; cursor += 1) {
    if (Math.abs(values[cursor]! - target) < Math.abs(values[index]! - target)) {
      index = cursor;
    }
  }
  return index;
}

function valueAtDeg(values: Float64Array, index: number | undefined): number | undefined {
  return index === undefined ? undefined : radToDeg(values[index]!);
}

function fractionalIndexWindow(
  length: number,
  startFraction: number,
  endFraction: number,
): { startIndex: number; endIndex: number } {
  const lastIndex = Math.max(0, length - 1);
  const startIndex = Math.min(lastIndex, Math.max(0, Math.floor(lastIndex * startFraction)));
  const endIndex = Math.min(lastIndex, Math.max(startIndex, Math.ceil(lastIndex * endFraction)));
  return { startIndex, endIndex };
}

function summarizeLateralOffsetWindow(
  offsets: Float64Array,
  distancePct: Float64Array,
  startIndex: number,
  endIndex: number,
): LateralOffsetWindowSummary {
  let sum = 0;
  let count = 0;
  let maxAbsLateralOffsetM = 0;
  let maxAbsLateralOffsetDistancePct = distancePct[startIndex] ?? 0;

  for (let index = startIndex; index <= endIndex; index += 1) {
    const offset = offsets[index] ?? 0;
    sum += offset;
    count += 1;
    if (Math.abs(offset) > maxAbsLateralOffsetM) {
      maxAbsLateralOffsetM = Math.abs(offset);
      maxAbsLateralOffsetDistancePct = distancePct[index] ?? maxAbsLateralOffsetDistancePct;
    }
  }

  return {
    startDistancePct: distancePct[startIndex] ?? 0,
    endDistancePct: distancePct[endIndex] ?? distancePct[startIndex] ?? 0,
    averageLateralOffsetM: count > 0 ? sum / count : 0,
    maxAbsLateralOffsetM,
    maxAbsLateralOffsetDistancePct,
  };
}

interface ThrottleLiftSummary {
  count: number;
  firstStartDistancePct?: number;
  firstEndDistancePct?: number;
  maxDepth: number;
  longestDurationM?: number;
  totalDistanceM?: number;
  throttleAreaLostM?: number;
}

interface ThrottleLiftSegment {
  startIndex: number;
  endIndex: number;
  startLevel: number;
  minLevel: number;
}

const THROTTLE_ACTIVE_LEVEL = 0.05;
const THROTTLE_LIFT_DROP = 0.12;
const THROTTLE_LIFT_RECOVERY_MARGIN = 0.05;

function summarizeThrottleLifts(
  values: Float32Array,
  distancePct: Float64Array,
  lapLengthM: number | undefined,
): ThrottleLiftSummary {
  const segments = findThrottleLiftSegments(values);
  let maxDepth = 0;
  let longestDurationM: number | undefined;
  let totalDistanceM = lapLengthM === undefined ? undefined : 0;
  let throttleAreaLostM = lapLengthM === undefined ? undefined : 0;

  for (const segment of segments) {
    const depth = segment.startLevel - segment.minLevel;
    maxDepth = Math.max(maxDepth, depth);
    const durationM = distanceBetweenPct(
      distancePct[segment.startIndex],
      distancePct[segment.endIndex],
      lapLengthM,
    );
    if (durationM !== undefined) {
      longestDurationM = Math.max(longestDurationM ?? 0, Math.max(0, durationM));
      totalDistanceM = (totalDistanceM ?? 0) + Math.max(0, durationM);
    }
    const lost = throttleAreaLostForSegment(values, distancePct, segment, lapLengthM);
    if (lost !== undefined) {
      throttleAreaLostM = (throttleAreaLostM ?? 0) + lost;
    }
  }

  const firstSegment = segments[0];

  return {
    count: segments.length,
    firstStartDistancePct: firstSegment ? distancePct[firstSegment.startIndex] : undefined,
    firstEndDistancePct: firstSegment ? distancePct[firstSegment.endIndex] : undefined,
    maxDepth,
    longestDurationM,
    totalDistanceM,
    throttleAreaLostM,
  };
}

function findThrottleLiftSegments(values: Float32Array): ThrottleLiftSegment[] {
  const segments: ThrottleLiftSegment[] = [];
  let index = 1;

  while (index < values.length) {
    const previous = clampPedal(values[index - 1]!);
    const current = clampPedal(values[index]!);
    const drop = previous - current;
    if (previous <= THROTTLE_ACTIVE_LEVEL || drop < THROTTLE_LIFT_DROP) {
      index += 1;
      continue;
    }

    const startIndex = index - 1;
    const startLevel = previous;
    let endIndex = index;
    let minLevel = current;
    index += 1;

    while (index < values.length) {
      const value = clampPedal(values[index]!);
      if (value < minLevel) {
        minLevel = value;
      }
      endIndex = index;
      if (value >= startLevel - THROTTLE_LIFT_RECOVERY_MARGIN) {
        index += 1;
        break;
      }
      index += 1;
    }

    segments.push({ startIndex, endIndex, startLevel, minLevel });
  }

  return segments;
}

function throttleAreaLostForSegment(
  values: Float32Array,
  distancePct: Float64Array,
  segment: ThrottleLiftSegment,
  lapLengthM: number | undefined,
): number | undefined {
  if (lapLengthM === undefined) {
    return undefined;
  }

  let areaLost = 0;
  for (let index = segment.startIndex + 1; index <= segment.endIndex; index += 1) {
    const span = distanceBetweenPct(distancePct[index - 1], distancePct[index], lapLengthM) ?? 0;
    const previousLoss = Math.max(0, segment.startLevel - clampPedal(values[index - 1]!));
    const currentLoss = Math.max(0, segment.startLevel - clampPedal(values[index]!));
    areaLost += ((previousLoss + currentLoss) / 2) * Math.max(0, span);
  }
  return areaLost;
}

function averageBrakeAroundMinSpeed(
  telemetry: ResampledTelemetry,
  brake: Float32Array,
): number {
  const speed = telemetry.channels.speedMs;
  if (!speed || speed.length === 0) {
    return average(brake);
  }

  const { index } = minWithIndex(speed);
  return averageInRange(brake, Math.max(0, index - 1), Math.min(brake.length - 1, index + 1)) ?? 0;
}

function brakeRampRate(peakBrake: number, distanceM: number | undefined): number | undefined {
  if (distanceM === undefined || distanceM <= 0) {
    return undefined;
  }
  return peakBrake / distanceM;
}

function optionalDelta(target: number | undefined, reference: number | undefined): number | undefined {
  return target !== undefined && reference !== undefined ? target - reference : undefined;
}

function clampPedal(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function inferCornerDirection(headingChangeDeg: number, ambiguousThresholdDeg: number): CornerDirection {
  if (Math.abs(headingChangeDeg) < ambiguousThresholdDeg) {
    return "ambiguous";
  }
  return headingChangeDeg > 0 ? "left" : "right";
}
