import {
  formatDistanceDuration,
  formatPedalPointDelta,
  formatSpeedDelta,
  makeEvidence,
  formatDistanceDelta,
} from "../evidence";
import { THROTTLE_RULE_FACTORS, THROTTLE_SEVERITY } from "./constants/throttle";
import type { RuleDefinition } from "./index";

export const throttleRules: RuleDefinition[] = [
  delayedThrottlePickup,
  earlyThrottleWithLift,
  exitHesitation,
  coastingMidCorner,
  rushedBrakeToThrottle,
  unnecessaryThrottleLift,
  deepThrottleLift,
  longThrottleLift,
];

export function delayedThrottlePickup(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const throttle = comparison.metrics.throttle;
  const delta = throttle?.firstThrottleDeltaM;
  if (delta === undefined || delta <= comparison.config.thresholds.throttleTimingDeltaM) {
    return undefined;
  }

  return {
    id: "delayed-throttle-pickup",
    priority: 68,
    title: "Pick up throttle earlier",
    why: "The reference starts building throttle sooner, which helps settle the exit and reduce the wait.",
    practiceCue: "Look for the first moment the wheel is opening and add a small maintenance throttle.",
    category: "throttle",
    severity: delta > THROTTLE_SEVERITY.throttleTimingDeltaM ? "high" : "medium",
    confidence: 0.78,
    evidence: [makeEvidence("First throttle", formatDistanceDelta(delta), "delta", "primary", { deltaM: delta })],
  };
}

export function earlyThrottleWithLift(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const throttle = comparison.metrics.throttle;
  const firstDelta = throttle?.firstThrottleDeltaM;
  const extraLifts = (throttle?.targetLiftCount ?? 0) - (throttle?.referenceLiftCount ?? 0);
  if (firstDelta === undefined || firstDelta >= -comparison.config.thresholds.throttleTimingDeltaM || extraLifts <= 0) {
    return undefined;
  }

  return {
    id: "early-throttle-with-lift",
    priority: 74,
    title: "Wait for a throttle you can keep",
    why: "You pick up throttle earlier, but then lift again, which suggests the car was not ready for that commitment.",
    practiceCue: "Delay the first squeeze until you can keep opening the pedal in one clean ramp.",
    category: "throttle",
    severity: extraLifts > THROTTLE_SEVERITY.extraLiftCount ? "high" : "medium",
    confidence: 0.77,
    evidence: [
      makeEvidence("First throttle", formatDistanceDelta(firstDelta), "delta", "primary", { deltaM: firstDelta }),
      makeEvidence("Extra lifts", `${extraLifts}`, "comparison", "secondary", { extraLifts }),
    ],
  };
}

export function exitHesitation(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const speed = comparison.metrics.speed;
  const throttle = comparison.metrics.throttle;
  const fullDelta = throttle?.fullThrottleDeltaM;
  if (
    !speed ||
    speed.exitSpeedDeltaKmh >= -comparison.config.thresholds.exitSpeedDeltaKmh ||
    (fullDelta !== undefined && fullDelta <= comparison.config.thresholds.throttleTimingDeltaM)
  ) {
    return undefined;
  }

  return {
    id: "exit-hesitation",
    priority: 69,
    title: "Commit to the exit earlier",
    why: "You leave the slice slower than the reference and do not reach full throttle as early.",
    practiceCue: "Once steering starts unwinding, keep the throttle ramp deliberate instead of pausing.",
    category: "throttle",
    severity: speed.exitSpeedDeltaKmh < THROTTLE_SEVERITY.highExitSpeedLossKmh ? "high" : "medium",
    confidence: 0.76,
    evidence: [
      makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "primary", { deltaKmh: speed.exitSpeedDeltaKmh }),
      ...(fullDelta === undefined
        ? []
        : [makeEvidence("Full throttle", formatDistanceDelta(fullDelta), "delta", "secondary", { deltaM: fullDelta })]),
    ],
  };
}

export function coastingMidCorner(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const transition = comparison.metrics.brakeToThrottleTransition;
  const speed = comparison.metrics.speed;
  const coastDelta = transition?.coastGapDeltaM;
  const targetCoastGap = transition?.targetCoastGapM;
  const speedLostDuringCoast = transition?.targetSpeedLostDuringCoastKmh;
  const losesSpeed =
    speed !== undefined &&
    (speed.minSpeedDeltaKmh < -comparison.config.thresholds.minSpeedDeltaKmh ||
      speed.exitSpeedDeltaKmh < -comparison.config.thresholds.exitSpeedDeltaKmh);
  if (
    !transition ||
    !speed ||
    coastDelta === undefined ||
    targetCoastGap === undefined ||
    coastDelta <= comparison.config.thresholds.coastingGapDeltaM ||
    !losesSpeed
  ) {
    return undefined;
  }

  return {
    id: "coasting-mid-corner",
    priority: 71,
    title: "Reduce the neutral pedal gap",
    why: "Compared with the reference, you spend longer between brake release and throttle pickup while losing minimum or exit speed.",
    practiceCue: "Blend from the brake into a small maintenance throttle so the car keeps rolling through the middle.",
    category: "throttle",
    severity:
      coastDelta > THROTTLE_SEVERITY.coastingGapDeltaM ||
      speed.exitSpeedDeltaKmh < THROTTLE_SEVERITY.highExitSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.72,
    evidence: [
      makeEvidence("Coast gap", formatDistanceDuration(coastDelta), "delta", "primary", { coastGapDeltaM: coastDelta }),
      makeEvidence("Target coast", formatDistanceDuration(targetCoastGap), "absolute", "secondary", { targetCoastGapM: targetCoastGap }),
      ...(speedLostDuringCoast === undefined
        ? []
        : [makeEvidence("Speed during coast", formatSpeedDelta(-Math.max(0, speedLostDuringCoast)), "absolute", "secondary", {
            targetSpeedLostDuringCoastKmh: speedLostDuringCoast,
          })]),
    ],
  };
}

export function rushedBrakeToThrottle(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const transition = comparison.metrics.brakeToThrottleTransition;
  const speed = comparison.metrics.speed;
  const lift = comparison.metrics.throttleLiftQuality;
  const steering = comparison.metrics.steering;
  const targetOverlap = transition?.targetBrakeThrottleOverlapM ?? 0;
  const targetCoastGap = transition?.targetCoastGapM;
  const rushedGap =
    targetOverlap > comparison.config.thresholds.coastingGapDeltaM ||
    (targetCoastGap !== undefined &&
      targetCoastGap < comparison.config.thresholds.coastingGapDeltaM / THROTTLE_RULE_FACTORS.rushedCoastGapDivisor);
  const poorOutcome =
    (lift?.liftCountDelta ?? 0) > 0 ||
    (steering?.correctionCountDelta ?? 0) >= comparison.config.thresholds.correctionCountDelta ||
    (speed?.exitSpeedDeltaKmh ?? 0) < -comparison.config.thresholds.exitSpeedDeltaKmh;
  if (!transition || !rushedGap || !poorOutcome) {
    return undefined;
  }

  return {
    id: "rushed-brake-to-throttle",
    priority: 60,
    title: "Separate the release and throttle squeeze",
    why: "The brake release and throttle pickup are bunched together compared with a calmer handoff, and the exit then needs a lift, correction, or loses speed.",
    practiceCue: "Finish the release cleanly, let the platform settle, then add throttle you can keep.",
    category: "throttle",
    severity:
      targetOverlap > THROTTLE_SEVERITY.brakeThrottleOverlapM ||
      (steering?.correctionCountDelta ?? 0) > THROTTLE_SEVERITY.extraCorrectionCountDelta
        ? "high"
        : "medium",
    confidence: 0.68,
    evidence: [
      makeEvidence(
        targetOverlap > 0 ? "Brake/throttle overlap" : "Coast gap",
        formatDistanceDuration(targetOverlap > 0 ? targetOverlap : targetCoastGap),
        "absolute",
        "primary",
        { targetBrakeThrottleOverlapM: targetOverlap, targetCoastGapM: targetCoastGap ?? 0 },
      ),
      ...(speed === undefined
        ? []
        : [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.exitSpeedDeltaKmh })]),
    ],
  };
}

export function unnecessaryThrottleLift(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const speed = comparison.metrics.speed;
  const lift = comparison.metrics.throttleLiftQuality;
  if (
    !speed ||
    !lift ||
    lift.targetLiftCount === 0 ||
    lift.referenceLiftCount > 0 ||
    lift.targetMaxLiftDepth < comparison.config.thresholds.pedalDepthDelta ||
    Math.min(speed.exitSpeedDeltaKmh, speed.averageSpeedDeltaKmh) >= -comparison.config.thresholds.exitSpeedDeltaKmh
  ) {
    return undefined;
  }

  return {
    id: "unnecessary-throttle-lift",
    priority: 72,
    title: "Keep the throttle committed",
    why: "The reference stays committed while your lap lifts and gives away speed through the slice.",
    practiceCue: "Open the wheel and pedal together so the first confident throttle application can stay in.",
    category: "throttle",
    severity:
      lift.targetMaxLiftDepth > THROTTLE_SEVERITY.liftDepth ||
      speed.exitSpeedDeltaKmh < THROTTLE_SEVERITY.highExitSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.74,
    evidence: [
      makeEvidence("Lift depth", formatPedalPointDelta(-lift.targetMaxLiftDepth), "absolute", "primary", {
        targetMaxLiftDepth: lift.targetMaxLiftDepth,
      }),
      makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", {
        deltaKmh: speed.exitSpeedDeltaKmh,
      }),
      makeEvidence("Reference lifts", `${lift.referenceLiftCount}`, "comparison", "secondary", {
        referenceLiftCount: lift.referenceLiftCount,
      }),
    ],
  };
}

export function deepThrottleLift(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const lift = comparison.metrics.throttleLiftQuality;
  if (
    !lift ||
    lift.targetLiftCount === 0 ||
    lift.maxLiftDepthDelta <= comparison.config.thresholds.pedalDepthDelta
  ) {
    return undefined;
  }

  return {
    id: "deep-throttle-lift",
    priority: 67,
    title: "Make the lift shallower",
    why: "Your throttle drop is materially deeper than the reference, which can unsettle the car or delay the exit drive.",
    practiceCue: "If you need to breathe the throttle, make it a smaller trim instead of a full confidence reset.",
    category: "throttle",
    severity: lift.maxLiftDepthDelta > THROTTLE_SEVERITY.liftDepthDelta ? "high" : "medium",
    confidence: 0.7,
    evidence: [
      makeEvidence("Lift depth delta", formatPedalPointDelta(-lift.maxLiftDepthDelta), "delta", "primary", {
        depthDelta: lift.maxLiftDepthDelta,
      }),
      makeEvidence("Target max lift", formatPedalPointDelta(-lift.targetMaxLiftDepth), "absolute", "secondary", {
        targetMaxLiftDepth: lift.targetMaxLiftDepth,
      }),
    ],
  };
}

export function longThrottleLift(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const lift = comparison.metrics.throttleLiftQuality;
  const durationDelta = lift?.longestLiftDurationDeltaM;
  if (
    !lift ||
    durationDelta === undefined ||
    lift.targetLiftCount === 0 ||
    durationDelta <= comparison.config.thresholds.pedalDurationDeltaM
  ) {
    return undefined;
  }

  return {
    id: "long-throttle-lift",
    priority: 66,
    title: "Shorten the throttle pause",
    why: "Your longest lift lasts farther down the road than the reference, so the car spends longer waiting before the exit drive rebuilds.",
    practiceCue: "Use a quick breath if needed, then return to a progressive throttle ramp as soon as the car accepts it.",
    category: "throttle",
    severity: durationDelta > THROTTLE_SEVERITY.liftDurationDeltaM ? "high" : "medium",
    confidence: 0.69,
    evidence: [
      makeEvidence("Lift duration delta", formatDistanceDuration(durationDelta), "delta", "primary", {
        durationDeltaM: durationDelta,
      }),
      makeEvidence("Target lift duration", formatDistanceDuration(lift.targetLongestLiftDurationM), "absolute", "secondary", {
        targetLongestLiftDurationM: lift.targetLongestLiftDurationM ?? 0,
      }),
    ],
  };
}
