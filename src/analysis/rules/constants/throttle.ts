export const THROTTLE_SEVERITY = {
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
} as const;

export const THROTTLE_RULE_FACTORS = {
  rushedCoastGapDivisor: 2,
} as const;
