import { formatDistanceDelta, formatSpeedDelta, makeEvidence } from "../evidence";
import type { RuleDefinition } from "./index";

export const throttleRules: RuleDefinition[] = [
  delayedThrottlePickup,
  earlyThrottleWithLift,
  exitHesitation,
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
    severity: delta > 20 ? "high" : "medium",
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
    severity: extraLifts > 1 ? "high" : "medium",
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
    severity: speed.exitSpeedDeltaKmh < -6 ? "high" : "medium",
    confidence: 0.76,
    evidence: [
      makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "primary", { deltaKmh: speed.exitSpeedDeltaKmh }),
      ...(fullDelta === undefined
        ? []
        : [makeEvidence("Full throttle", formatDistanceDelta(fullDelta), "delta", "secondary", { deltaM: fullDelta })]),
    ],
  };
}
