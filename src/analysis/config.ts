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
  },
};
