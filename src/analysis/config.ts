import type { AnalysisConfig, AnalysisConfigOverrides, DeepPartial } from "./configTypes";

export type {
  AnalysisConfig,
  AnalysisConfigOverrides,
  BrakingSeverityThresholds,
  DeepPartial,
  EventDetectionConfig,
  GearingSeverityThresholds,
  LineSeverityThresholds,
  ResamplingConfig,
  RuleConfig,
  RuleFactors,
  RuleSeverityThresholds,
  RuleTriggerThresholds,
  SignalSmoothingWindows,
  SignalFilterConfig,
  SlicingConfig,
  StabilitySeverityThresholds,
  SteeringSeverityThresholds,
  ThrottleShiftBlipFilterConfig,
  ThrottleRuleFactors,
  ThrottleSeverityThresholds,
} from "./configTypes";

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
  filters: {
    throttleShiftBlip: {
      enabled: true,
      maxDurationM: 6,
      gearChangeWindowM: 3,
      peakThreshold: 0.35,
      edgeThreshold: 0.08,
    },
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
      lateralOffsetDeltaM: 0.5,
      pathDeviationDeltaM: 1.0,
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
        brakeDuringThrottleRiseDepth: 0.5,
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
