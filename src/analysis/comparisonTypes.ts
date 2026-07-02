import type { AnalysisConfig } from "./configTypes";
import type { ComparisonContext } from "../domain/comparisonContextTypes";
import type {
  DetectedDrivingEvents,
  ResampledTelemetry,
} from "../domain/telemetryTypes";

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
  minSpeedDeltaAtTargetMinKmh: number;
  minSpeedDeltaAtReferenceMinKmh: number;
  exitSpeedDeltaKmh: number;
  averageSpeedDeltaKmh: number;
  referenceMinSpeedKmh: number;
  targetMinSpeedKmh: number;
  referenceSpeedAtTargetMinKmh: number;
  targetSpeedAtReferenceMinKmh: number;
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
