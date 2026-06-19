export const THROTTLE_SEVERITY = {
  throttleTimingDeltaM: 10,
  extraLiftCount: 1,
  highExitSpeedLossKmh: -6,
  coastingGapDeltaM: 22,
  brakeThrottleOverlapM: 18,
  extraCorrectionCountDelta: 1,
  liftDepth: 0.35,
  liftDepthDelta: 0.3,
  liftDurationDeltaM: 20,
} as const;

export const THROTTLE_RULE_FACTORS = {
  rushedCoastGapDivisor: 2,
} as const;
