import type { Metres } from "../domain/units";

export interface AnalysisConfig {
  resampling: ResamplingConfig;
  smoothing: SignalSmoothingWindows;
  events: EventDetectionConfig;
  slicing: SlicingConfig;
  rules: RuleConfig;
}

export interface ResamplingConfig {
  resampleStepM: Metres;
  maxResampledPoints: number;
}

export interface SignalSmoothingWindows {
  speed: Metres;
  brake: Metres;
  throttle: Metres;
  steering: Metres;
}

export interface EventDetectionConfig {
  brakeActiveThreshold: number;
  throttleActiveThreshold: number;
  fullThrottleThreshold: number;
  throttleLiftDrop: number;
  steeringNoiseRad: number;
  steeringUnwindRatio: number;
}

export interface SlicingConfig {
  minCoachingSliceLengthPct: number;
  maxCoachingSliceLengthPct: number;
}

export interface RuleConfig {
  triggers: RuleTriggerThresholds;
  severity: RuleSeverityThresholds;
  factors: RuleFactors;
}

export interface RuleTriggerThresholds {
  brakeTimingDeltaM: Metres;
  throttleTimingDeltaM: Metres;
  minSpeedDeltaKmh: number;
  exitSpeedDeltaKmh: number;
  steeringPeakDeltaDeg: number;
  correctionCountDelta: number;
  pedalAreaDelta: number;
  pedalDurationDeltaM: Metres;
  pedalDepthDelta: number;
  brakePressureAreaDelta: number;
  brakeRampDeltaM: Metres;
  coastingGapDeltaM: Metres;
  lateralOffsetDeltaM: Metres;
  pathDeviationDeltaM: Metres;
  headingDeltaDeg: number;
  ambiguousCornerHeadingDeltaDeg: number;
  gearDelta: number;
  rpmDelta: number;
  apexTimingDeltaM: Metres;
  minSpeedLocationDeltaM: Metres;
  exitAccelerationDeltaKmh: number;
  steeringWhileBrakingDeltaDeg: number;
  throttleRiseWhileBrakingDelta: number;
}

export interface RuleSeverityThresholds {
  braking: BrakingSeverityThresholds;
  throttle: ThrottleSeverityThresholds;
  line: LineSeverityThresholds;
  steering: SteeringSeverityThresholds;
  gearing: GearingSeverityThresholds;
  stability: StabilitySeverityThresholds;
}

export interface BrakingSeverityThresholds {
  brakeTimingDeltaM: Metres;
  brakeDurationDeltaM: Metres;
  highSpeedLossKmh: number;
  brakeRampDeltaM: Metres;
  extraCorrectionCountDelta: number;
  brakeAroundMinSpeedDelta: number;
  brakeAreaLossDelta: number;
}

export interface ThrottleSeverityThresholds {
  throttleTimingDeltaM: Metres;
  extraLiftCount: number;
  highExitSpeedLossKmh: number;
  coastingGapDeltaM: Metres;
  brakeThrottleOverlapM: Metres;
  extraCorrectionCountDelta: number;
  liftDepth: number;
  liftDepthDelta: number;
  liftDurationDeltaM: Metres;
  exitAccelerationLossKmh: number;
}

export interface LineSeverityThresholds {
  highSpeedLossKmh: number;
  unusedEntryInsideOffsetM: Metres;
  apexOffsetM: Metres;
  apexTimingDeltaM: Metres;
  exitInsideOffsetM: Metres;
  wideApexOffsetM: Metres;
  pathDeviationDeltaM: Metres;
}

export interface SteeringSeverityThresholds {
  peakSteeringDeltaDeg: number;
  steeringUnwindDeltaM: Metres;
  underRotationHeadingDeltaDeg: number;
  rotationTimingDeltaM: Metres;
  minSpeedLocationDeltaM: Metres;
  highSpeedLossKmh: number;
}

export interface GearingSeverityThresholds {
  rpmDelta: number;
  highExitSpeedLossKmh: number;
  exitAccelerationLossKmh: number;
}

export interface StabilitySeverityThresholds {
  correctionCountDelta: number;
}

export interface RuleFactors {
  throttle: ThrottleRuleFactors;
}

export interface ThrottleRuleFactors {
  rushedCoastGapDivisor: number;
}

export type AnalysisConfigOverrides = DeepPartial<AnalysisConfig>;

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
