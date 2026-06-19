import type { Metres } from "../domain/units";

export interface AnalysisConfig {
  resampleStepM: Metres;
  maxResampledPoints: number;
  smoothingWindowM: SignalSmoothingWindows;
  thresholds: RuleThresholds;
}

export interface SignalSmoothingWindows {
  speed: Metres;
  brake: Metres;
  throttle: Metres;
  steering: Metres;
}

export interface RuleThresholds {
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
  headingDeltaDeg: number;
  ambiguousCornerHeadingDeltaDeg: number;
}

export const defaultAnalysisConfig: AnalysisConfig = {
  resampleStepM: 1,
  maxResampledPoints: 1000,
  smoothingWindowM: {
    speed: 10,
    brake: 5,
    throttle: 5,
    steering: 5,
  },
  thresholds: {
    brakeTimingDeltaM: 10,
    throttleTimingDeltaM: 10,
    minSpeedDeltaKmh: 3,
    exitSpeedDeltaKmh: 3,
    steeringPeakDeltaDeg: 8,
    correctionCountDelta: 1,
    pedalAreaDelta: 0.08,
    pedalDurationDeltaM: 8,
    pedalDepthDelta: 0.15,
    brakePressureAreaDelta: 0.08,
    brakeRampDeltaM: 8,
    coastingGapDeltaM: 10,
    lateralOffsetDeltaM: 0.75,
    headingDeltaDeg: 4,
    ambiguousCornerHeadingDeltaDeg: 2,
  },
};
