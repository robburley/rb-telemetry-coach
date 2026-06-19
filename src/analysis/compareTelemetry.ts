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
  apex?: ApexComparisonMetrics;
  speedShape?: SpeedShapeComparisonMetrics;
  pedalCoordination?: PedalCoordinationComparisonMetrics;
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
  referenceMinSpeedDistancePct: number;
  targetMinSpeedDistancePct: number;
  minSpeedDistanceDeltaM?: number;
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
  referenceAverageRpm?: number;
  targetAverageRpm?: number;
  referenceExitRpm?: number;
  targetExitRpm?: number;
  referenceExitGear?: number;
  targetExitGear?: number;
  referenceAverageGear?: number;
  targetAverageGear?: number;
  averageGearDelta?: number;
}

export interface PathComparisonMetrics {
  maxPathDeltaM?: number;
  maxPathDeltaDistancePct?: number;
}

export type ApexEvidenceSource = "min-speed" | "peak-steering" | "heading-rate" | "mid-slice";

export interface ApexComparisonMetrics {
  referenceDistancePct: number;
  targetDistancePct: number;
  distanceDeltaM?: number;
  referenceSource: ApexEvidenceSource;
  targetSource: ApexEvidenceSource;
  referenceSpeedKmh?: number;
  targetSpeedKmh?: number;
  speedDeltaKmh?: number;
}

export interface SpeedShapeComparisonMetrics {
  referenceMinSpeedToExitGainKmh?: number;
  targetMinSpeedToExitGainKmh?: number;
  minSpeedToExitGainDeltaKmh?: number;
  referenceApexToExitGainKmh?: number;
  targetApexToExitGainKmh?: number;
  apexToExitGainDeltaKmh?: number;
}

export interface PedalCoordinationComparisonMetrics {
  referenceSteeringWhileBraking?: SteeringWhileBrakingMetrics;
  targetSteeringWhileBraking?: SteeringWhileBrakingMetrics;
  averageSteeringWhileBrakingDeltaDeg?: number;
  peakSteeringWhileBrakingDeltaDeg?: number;
  referenceThrottleRiseWhileBraking?: ThrottleRiseWhileBrakingMetrics;
  targetThrottleRiseWhileBraking?: ThrottleRiseWhileBrakingMetrics;
  throttleRiseWhileBrakingDelta?: number;
}

export interface SteeringWhileBrakingMetrics {
  averageAbsSteeringDeg: number;
  peakAbsSteeringDeg: number;
  brakeActiveDistanceM?: number;
}

export interface ThrottleRiseWhileBrakingMetrics {
  rise: number;
  startDistancePct: number;
  endDistancePct: number;
  distanceM?: number;
  averageBrake: number;
  peakBrake: number;
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
  targetBrakeEntryThrottleOverlapM?: number;
  referenceBrakeEntryThrottleOverlapM?: number;
  brakeEntryThrottleOverlapDeltaM?: number;
  targetThrottleDropWhileBraking?: number;
  referenceThrottleDropWhileBraking?: number;
  throttleDropWhileBrakingDelta?: number;
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
      speed: compareSpeed(reference, target, lapLengthM),
      braking: compareBraking(reference, target, referenceEvents, targetEvents, lapLengthM),
      throttle: compareThrottle(referenceEvents, targetEvents, lapLengthM),
      steering: compareSteering(reference, target, referenceEvents, targetEvents, lapLengthM),
      gearRpm: compareGearRpm(reference, target),
      path: comparePath(reference, target),
      apex: compareApex(reference, target, lapLengthM),
      speedShape: compareSpeedShape(reference, target),
      pedalCoordination: comparePedalCoordination(reference, target, lapLengthM),
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
  lapLengthM: number | undefined,
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
    referenceMinSpeedDistancePct: reference.distancePct[referenceMin.index]!,
    targetMinSpeedDistancePct: target.distancePct[targetMin.index]!,
    minSpeedDistanceDeltaM: eventDeltaM(
      reference.distancePct[referenceMin.index],
      target.distancePct[targetMin.index],
      lapLengthM,
    ),
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
    const referenceAverageRpm = average(reference.channels.rpm);
    const targetAverageRpm = average(target.channels.rpm);
    const referenceExitRpm = reference.channels.rpm[reference.channels.rpm.length - 1]!;
    const targetExitRpm = target.channels.rpm[target.channels.rpm.length - 1]!;
    metrics.referenceAverageRpm = referenceAverageRpm;
    metrics.targetAverageRpm = targetAverageRpm;
    metrics.averageRpmDelta = targetAverageRpm - referenceAverageRpm;
    metrics.referenceExitRpm = referenceExitRpm;
    metrics.targetExitRpm = targetExitRpm;
    metrics.exitRpmDelta = targetExitRpm - referenceExitRpm;
  }

  if (reference.channels.gear && target.channels.gear) {
    const referenceExitGear = reference.channels.gear[reference.channels.gear.length - 1]!;
    const targetExitGear = target.channels.gear[target.channels.gear.length - 1]!;
    const referenceAverageGear = average(reference.channels.gear);
    const targetAverageGear = average(target.channels.gear);
    metrics.referenceExitGear = referenceExitGear;
    metrics.targetExitGear = targetExitGear;
    metrics.exitGearDelta = targetExitGear - referenceExitGear;
    metrics.referenceAverageGear = referenceAverageGear;
    metrics.targetAverageGear = targetAverageGear;
    metrics.averageGearDelta = targetAverageGear - referenceAverageGear;
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

function compareApex(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
  lapLengthM: number | undefined,
): ApexComparisonMetrics | undefined {
  const referenceHeading = deriveTravelDirections(reference, localCoordinatesFromTelemetry(reference));
  const targetHeading = deriveTravelDirections(target, localCoordinatesFromTelemetry(target));
  const referenceCandidate = chooseApexCandidate(
    reference,
    referenceHeading ? unwrapAngles(referenceHeading) : undefined,
  );
  const targetCandidate = chooseApexCandidate(
    target,
    targetHeading ? unwrapAngles(targetHeading) : undefined,
  );
  if (!referenceCandidate || !targetCandidate) {
    return undefined;
  }

  const referenceDistancePct = reference.distancePct[referenceCandidate.index]!;
  const targetDistancePct = target.distancePct[targetCandidate.index]!;
  const referenceSpeedKmh = speedAtKmh(reference, referenceCandidate.index);
  const targetSpeedKmh = speedAtKmh(target, targetCandidate.index);

  return {
    referenceDistancePct,
    targetDistancePct,
    distanceDeltaM: eventDeltaM(referenceDistancePct, targetDistancePct, lapLengthM),
    referenceSource: referenceCandidate.source,
    targetSource: targetCandidate.source,
    referenceSpeedKmh,
    targetSpeedKmh,
    speedDeltaKmh: optionalDelta(targetSpeedKmh, referenceSpeedKmh),
  };
}

function compareSpeedShape(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
): SpeedShapeComparisonMetrics | undefined {
  const referenceSpeed = reference.channels.speedMs;
  const targetSpeed = target.channels.speedMs;
  if (!referenceSpeed || !targetSpeed || referenceSpeed.length < 2 || targetSpeed.length < 2) {
    return undefined;
  }

  const referenceMinSpeedIndex = minWithIndex(referenceSpeed).index;
  const targetMinSpeedIndex = minWithIndex(targetSpeed).index;
  const referenceApexIndex = chooseApexIndex(reference, undefined);
  const targetApexIndex = chooseApexIndex(target, undefined);
  const referenceExitDistancePct = reference.distancePct[reference.distancePct.length - 1];
  const targetExitDistancePct = target.distancePct[target.distancePct.length - 1];
  if (referenceExitDistancePct === undefined || targetExitDistancePct === undefined) {
    return undefined;
  }

  const referenceMinSpeedToExitGainKmh = distanceWindowSpeedGainKmh(
    reference,
    reference.distancePct[referenceMinSpeedIndex],
    referenceExitDistancePct,
  );
  const targetMinSpeedToExitGainKmh = distanceWindowSpeedGainKmh(
    target,
    target.distancePct[targetMinSpeedIndex],
    targetExitDistancePct,
  );
  const referenceApexToExitGainKmh =
    referenceApexIndex === undefined
      ? undefined
      : distanceWindowSpeedGainKmh(reference, reference.distancePct[referenceApexIndex], referenceExitDistancePct);
  const targetApexToExitGainKmh =
    targetApexIndex === undefined
      ? undefined
      : distanceWindowSpeedGainKmh(target, target.distancePct[targetApexIndex], targetExitDistancePct);

  return {
    referenceMinSpeedToExitGainKmh,
    targetMinSpeedToExitGainKmh,
    minSpeedToExitGainDeltaKmh: optionalDelta(
      targetMinSpeedToExitGainKmh,
      referenceMinSpeedToExitGainKmh,
    ),
    referenceApexToExitGainKmh,
    targetApexToExitGainKmh,
    apexToExitGainDeltaKmh: optionalDelta(targetApexToExitGainKmh, referenceApexToExitGainKmh),
  };
}

function comparePedalCoordination(
  reference: ResampledTelemetry,
  target: ResampledTelemetry,
  lapLengthM: number | undefined,
): PedalCoordinationComparisonMetrics | undefined {
  const referenceSteeringWhileBraking = summarizeSteeringWhileBraking(reference, lapLengthM);
  const targetSteeringWhileBraking = summarizeSteeringWhileBraking(target, lapLengthM);
  const referenceThrottleRiseWhileBraking = summarizeThrottleRiseWhileBraking(reference, lapLengthM);
  const targetThrottleRiseWhileBraking = summarizeThrottleRiseWhileBraking(target, lapLengthM);

  if (
    !referenceSteeringWhileBraking &&
    !targetSteeringWhileBraking &&
    !referenceThrottleRiseWhileBraking &&
    !targetThrottleRiseWhileBraking
  ) {
    return undefined;
  }

  return {
    referenceSteeringWhileBraking,
    targetSteeringWhileBraking,
    averageSteeringWhileBrakingDeltaDeg: optionalDelta(
      targetSteeringWhileBraking?.averageAbsSteeringDeg,
      referenceSteeringWhileBraking?.averageAbsSteeringDeg,
    ),
    peakSteeringWhileBrakingDeltaDeg: optionalDelta(
      targetSteeringWhileBraking?.peakAbsSteeringDeg,
      referenceSteeringWhileBraking?.peakAbsSteeringDeg,
    ),
    referenceThrottleRiseWhileBraking,
    targetThrottleRiseWhileBraking,
    throttleRiseWhileBrakingDelta: optionalDelta(
      targetThrottleRiseWhileBraking?.rise,
      referenceThrottleRiseWhileBraking?.rise,
    ),
  };
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
  const referenceBrakeEntryThrottleOverlap = summarizeBrakeEntryThrottleOverlap(
    reference,
    referenceEvents,
    lapLengthM,
  );
  const targetBrakeEntryThrottleOverlap = summarizeBrakeEntryThrottleOverlap(
    target,
    targetEvents,
    lapLengthM,
  );

  if (
    referenceCoastGapM === undefined &&
    targetCoastGapM === undefined &&
    referenceOverlapM === undefined &&
    targetOverlapM === undefined &&
    referenceBrakeEntryThrottleOverlap.overlapM === undefined &&
    targetBrakeEntryThrottleOverlap.overlapM === undefined &&
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
    targetBrakeEntryThrottleOverlapM: targetBrakeEntryThrottleOverlap.overlapM,
    referenceBrakeEntryThrottleOverlapM: referenceBrakeEntryThrottleOverlap.overlapM,
    brakeEntryThrottleOverlapDeltaM: optionalDelta(
      targetBrakeEntryThrottleOverlap.overlapM,
      referenceBrakeEntryThrottleOverlap.overlapM,
    ),
    targetThrottleDropWhileBraking: targetBrakeEntryThrottleOverlap.throttleDrop,
    referenceThrottleDropWhileBraking: referenceBrakeEntryThrottleOverlap.throttleDrop,
    throttleDropWhileBrakingDelta: optionalDelta(
      targetBrakeEntryThrottleOverlap.throttleDrop,
      referenceBrakeEntryThrottleOverlap.throttleDrop,
    ),
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

function summarizeBrakeEntryThrottleOverlap(
  telemetry: ResampledTelemetry,
  events: DetectedDrivingEvents,
  lapLengthM: number | undefined,
): { overlapM?: number; throttleDrop?: number } {
  const throttle = telemetry.channels.throttle;
  if (
    !throttle ||
    events.brakeStartDistancePct === undefined ||
    events.brakeReleaseDistancePct === undefined ||
    events.brakeReleaseDistancePct <= events.brakeStartDistancePct
  ) {
    return {};
  }

  const brakeStartIndex = closestDistanceIndex(telemetry.distancePct, events.brakeStartDistancePct);
  const brakeReleaseIndex = closestDistanceIndex(telemetry.distancePct, events.brakeReleaseDistancePct);
  if (
    brakeStartIndex === undefined ||
    brakeReleaseIndex === undefined ||
    brakeReleaseIndex <= brakeStartIndex
  ) {
    return {};
  }

  const throttleAtBrakeStart = clampPedal(throttle[brakeStartIndex] ?? 0);
  if (throttleAtBrakeStart <= THROTTLE_ACTIVE_LEVEL) {
    return {};
  }

  let lastOverlappingIndex = brakeReleaseIndex;
  let minimumThrottleWhileBraking = throttleAtBrakeStart;
  for (let index = brakeStartIndex; index <= brakeReleaseIndex; index += 1) {
    const value = clampPedal(throttle[index] ?? 0);
    minimumThrottleWhileBraking = Math.min(minimumThrottleWhileBraking, value);
    if (value <= THROTTLE_ACTIVE_LEVEL) {
      lastOverlappingIndex = index;
      break;
    }
  }

  return {
    overlapM: distanceBetweenPct(
      telemetry.distancePct[brakeStartIndex],
      telemetry.distancePct[lastOverlappingIndex],
      lapLengthM,
    ),
    throttleDrop: Math.max(0, throttleAtBrakeStart - minimumThrottleWhileBraking),
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

function average(values: Float32Array | Int32Array): number {
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
  return chooseApexCandidate(telemetry, unwrappedHeading)?.index;
}

function chooseApexCandidate(
  telemetry: ResampledTelemetry,
  unwrappedHeading: Float64Array | undefined,
): { index: number; source: ApexEvidenceSource } | undefined {
  const speedIndex = minSpeedIndex(telemetry);
  if (speedIndex !== undefined) {
    return { index: speedIndex, source: "min-speed" };
  }

  const steering = telemetry.channels.steeringRad;
  if (steering && steering.length > 0) {
    let index = 0;
    for (let cursor = 1; cursor < steering.length; cursor += 1) {
      if (Math.abs(steering[cursor]!) > Math.abs(steering[index]!)) {
        index = cursor;
      }
    }
    return { index, source: "peak-steering" };
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
    return { index, source: "heading-rate" };
  }

  return telemetry.distancePct.length > 0
    ? { index: Math.floor(telemetry.distancePct.length / 2), source: "mid-slice" }
    : undefined;
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

export function distanceWindowSpeedGainKmh(
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

  return msToKmh(speed[endIndex]! - speed[startIndex]!);
}

function speedAtKmh(telemetry: ResampledTelemetry, index: number | undefined): number | undefined {
  const speed = telemetry.channels.speedMs;
  return speed && index !== undefined ? msToKmh(speed[index]!) : undefined;
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
const BRAKE_ACTIVE_LEVEL = 0.05;
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

function summarizeSteeringWhileBraking(
  telemetry: ResampledTelemetry,
  lapLengthM: number | undefined,
): SteeringWhileBrakingMetrics | undefined {
  const brake = telemetry.channels.brake;
  const steering = telemetry.channels.steeringRad;
  if (!brake || !steering || brake.length === 0 || steering.length !== brake.length) {
    return undefined;
  }

  let weightedSteeringDeg = 0;
  let peakAbsSteeringDeg = 0;
  let totalBrakeActiveDistanceM = 0;
  let activeSampleCount = 0;
  let steeringSumDeg = 0;

  for (let index = 0; index < brake.length; index += 1) {
    if (clampPedal(brake[index]!) <= BRAKE_ACTIVE_LEVEL) {
      continue;
    }

    const absSteeringDeg = Math.abs(radToDeg(steering[index]!));
    peakAbsSteeringDeg = Math.max(peakAbsSteeringDeg, absSteeringDeg);
    steeringSumDeg += absSteeringDeg;
    activeSampleCount += 1;

    const previousPct = telemetry.distancePct[Math.max(0, index - 1)];
    const currentPct = telemetry.distancePct[index];
    const spanM = index === 0 ? 0 : distanceBetweenPct(previousPct, currentPct, lapLengthM) ?? 0;
    const safeSpanM = Math.max(0, spanM);
    weightedSteeringDeg += absSteeringDeg * safeSpanM;
    totalBrakeActiveDistanceM += safeSpanM;
  }

  if (activeSampleCount === 0) {
    return undefined;
  }

  return {
    averageAbsSteeringDeg:
      totalBrakeActiveDistanceM > 0 ? weightedSteeringDeg / totalBrakeActiveDistanceM : steeringSumDeg / activeSampleCount,
    peakAbsSteeringDeg,
    brakeActiveDistanceM: lapLengthM === undefined ? undefined : totalBrakeActiveDistanceM,
  };
}

function summarizeThrottleRiseWhileBraking(
  telemetry: ResampledTelemetry,
  lapLengthM: number | undefined,
): ThrottleRiseWhileBrakingMetrics | undefined {
  const brake = telemetry.channels.brake;
  const throttle = telemetry.channels.throttle;
  if (!brake || !throttle || brake.length < 2 || throttle.length !== brake.length) {
    return undefined;
  }

  let best: ThrottleRiseWhileBrakingMetrics | undefined;
  let segmentStartIndex: number | undefined;
  let segmentStartThrottle = 0;
  let segmentPeakThrottle = 0;
  let segmentPeakIndex = 0;

  const finishSegment = () => {
    if (segmentStartIndex === undefined || segmentPeakIndex <= segmentStartIndex) {
      segmentStartIndex = undefined;
      return;
    }

    const rise = segmentPeakThrottle - segmentStartThrottle;
    if (rise <= 0) {
      segmentStartIndex = undefined;
      return;
    }

    let brakeSum = 0;
    let peakBrake = 0;
    let count = 0;
    for (let index = segmentStartIndex; index <= segmentPeakIndex; index += 1) {
      const brakeValue = clampPedal(brake[index]!);
      brakeSum += brakeValue;
      peakBrake = Math.max(peakBrake, brakeValue);
      count += 1;
    }

    const candidate = {
      rise,
      startDistancePct: telemetry.distancePct[segmentStartIndex]!,
      endDistancePct: telemetry.distancePct[segmentPeakIndex]!,
      distanceM: distanceBetweenPct(
        telemetry.distancePct[segmentStartIndex],
        telemetry.distancePct[segmentPeakIndex],
        lapLengthM,
      ),
      averageBrake: count > 0 ? brakeSum / count : 0,
      peakBrake,
    };

    if (!best || candidate.rise > best.rise) {
      best = candidate;
    }
    segmentStartIndex = undefined;
  };

  for (let index = 1; index < throttle.length; index += 1) {
    const previousBrakeActive = clampPedal(brake[index - 1]!) > BRAKE_ACTIVE_LEVEL;
    const currentBrakeActive = clampPedal(brake[index]!) > BRAKE_ACTIVE_LEVEL;
    if (!previousBrakeActive || !currentBrakeActive) {
      finishSegment();
      continue;
    }

    const previousThrottle = clampPedal(throttle[index - 1]!);
    const currentThrottle = clampPedal(throttle[index]!);
    if (currentThrottle > previousThrottle) {
      if (segmentStartIndex === undefined) {
        segmentStartIndex = index - 1;
        segmentStartThrottle = previousThrottle;
        segmentPeakThrottle = currentThrottle;
        segmentPeakIndex = index;
      } else if (currentThrottle > segmentPeakThrottle) {
        segmentPeakThrottle = currentThrottle;
        segmentPeakIndex = index;
      }
    } else {
      finishSegment();
    }
  }
  finishSegment();

  return best;
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
