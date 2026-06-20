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

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const baseDefaultAnalysisConfig = {
  resampling: {
    resampleStepM: 1,
    maxResampledPoints: 1000,
  },
  smoothing: {
    speed: 10,
    brake: 5,
    throttle: 5,
    steering: 5,
  },
  events: {
    brakeActiveThreshold: 0.05,
    throttleActiveThreshold: 0.05,
    fullThrottleThreshold: 0.95,
    throttleLiftDrop: 0.12,
    steeringNoiseRad: 0.015,
    steeringUnwindRatio: 0.4,
  },
  slicing: {
    minCoachingSliceLengthPct: 0.005,
    maxCoachingSliceLengthPct: 0.15,
  },
  rules: {
    triggers: {
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
      pathDeviationDeltaM: 1.5,
      headingDeltaDeg: 4,
      ambiguousCornerHeadingDeltaDeg: 2,
      gearDelta: 1,
      rpmDelta: 500,
      apexTimingDeltaM: 8,
      minSpeedLocationDeltaM: 8,
      exitAccelerationDeltaKmh: 3,
      steeringWhileBrakingDeltaDeg: 8,
      throttleRiseWhileBrakingDelta: 0.12,
    },
    severity: {
      braking: {
        brakeTimingDeltaM: 5,
        brakeDurationDeltaM: 11,
        highSpeedLossKmh: -6,
        brakeRampDeltaM: 18,
        extraCorrectionCountDelta: 1,
        brakeAroundMinSpeedDelta: 0.3,
        brakeAreaLossDelta: -0.2,
      },
      throttle: {
        throttleTimingDeltaM: 5,
        extraLiftCount: 1,
        highExitSpeedLossKmh: -6,
        coastingGapDeltaM: 22,
        brakeThrottleOverlapM: 18,
        extraCorrectionCountDelta: 1,
        liftDepth: 0.35,
        liftDepthDelta: 0.3,
        liftDurationDeltaM: 10,
        exitAccelerationLossKmh: -6,
      },
      line: {
        highSpeedLossKmh: -6,
        unusedEntryInsideOffsetM: 0.8,
        apexOffsetM: 0.9,
        apexTimingDeltaM: 10,
        exitInsideOffsetM: 0.9,
        wideApexOffsetM: 0.9,
        pathDeviationDeltaM: 1.5,
      },
      steering: {
        peakSteeringDeltaDeg: 15,
        steeringUnwindDeltaM: 10,
        underRotationHeadingDeltaDeg: -8,
        rotationTimingDeltaM: 9,
        minSpeedLocationDeltaM: 9,
        highSpeedLossKmh: -6,
      },
      gearing: {
        rpmDelta: 900,
        highExitSpeedLossKmh: -6,
        exitAccelerationLossKmh: -5,
      },
      stability: {
        correctionCountDelta: 2,
      },
    },
    factors: {
      throttle: {
        rushedCoastGapDivisor: 2,
      },
    },
  },
} satisfies AnalysisConfig;

export const defaultAnalysisConfig: AnalysisConfig = createAnalysisConfig();

export function createAnalysisConfig(overrides: AnalysisConfigOverrides = {}): AnalysisConfig {
  return mergePlainObjects(baseDefaultAnalysisConfig, overrides);
}

function mergePlainObjects<T>(base: T, overrides: DeepPartial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return (overrides === undefined ? base : overrides) as T;
  }

  const result = { ...base } as Record<string, unknown>;
  for (const [key, overrideValue] of Object.entries(overrides)) {
    if (overrideValue === undefined) {
      continue;
    }

    const baseValue = result[key];
    result[key] =
      isPlainObject(baseValue) && isPlainObject(overrideValue)
        ? mergePlainObjects(baseValue, overrideValue)
        : overrideValue;
  }

  return result as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
