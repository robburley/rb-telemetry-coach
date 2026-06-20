import {
  formatDistanceDuration,
  formatPedalPointDelta,
  formatSpeedDelta,
  makeEvidence,
  formatDistanceDelta,
} from "../evidence";
import type { RuleDefinition } from "./index";

export const throttleRules: RuleDefinition[] = [
  delayedThrottlePickup,
  earlyThrottleWithLift,
  exitHesitation,
  coastingMidCorner,
  rushedBrakeToThrottle,
  throttleBeforeSteeringUnwind,
  throttleReappliedWhileBraking,
  exitAccelerationDeficit,
  unnecessaryThrottleLift,
  deepThrottleLift,
  longThrottleLift,
];

export function delayedThrottlePickup(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const throttle = comparison.metrics.throttle;
  const delta = throttle?.firstThrottleDeltaM;
  if (delta === undefined || delta <= comparison.config.rules.triggers.throttleTimingDeltaM) {
    return undefined;
  }

  return {
    id: "delayed-throttle-pickup",
    priority: 68,
    title: "Pick up throttle earlier",
    why: "The reference starts building throttle sooner, which helps settle the exit and reduce the wait.",
    practiceCue: "Look for the first moment the wheel is opening and add a small maintenance throttle.",
    category: "throttle",
    severity: delta > comparison.config.rules.severity.throttle.throttleTimingDeltaM ? "high" : "medium",
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
  if (firstDelta === undefined || firstDelta >= -comparison.config.rules.triggers.throttleTimingDeltaM || extraLifts <= 0) {
    return undefined;
  }

  return {
    id: "early-throttle-with-lift",
    priority: 74,
    title: "Wait for a throttle you can keep",
    why: "You pick up throttle earlier, but then lift again, which suggests the car was not ready for that commitment.",
    practiceCue: "Delay the first squeeze until you can keep opening the pedal in one clean ramp.",
    category: "throttle",
    severity: extraLifts > comparison.config.rules.severity.throttle.extraLiftCount ? "high" : "medium",
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
    speed.exitSpeedDeltaKmh >= -comparison.config.rules.triggers.exitSpeedDeltaKmh ||
    (fullDelta !== undefined && fullDelta <= comparison.config.rules.triggers.throttleTimingDeltaM)
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
    severity: speed.exitSpeedDeltaKmh < comparison.config.rules.severity.throttle.highExitSpeedLossKmh ? "high" : "medium",
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
    (speed.minSpeedDeltaKmh < -comparison.config.rules.triggers.minSpeedDeltaKmh ||
      speed.exitSpeedDeltaKmh < -comparison.config.rules.triggers.exitSpeedDeltaKmh);
  if (
    !transition ||
    !speed ||
    coastDelta === undefined ||
    targetCoastGap === undefined ||
    coastDelta <= comparison.config.rules.triggers.coastingGapDeltaM ||
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
      coastDelta > comparison.config.rules.severity.throttle.coastingGapDeltaM ||
      speed.exitSpeedDeltaKmh < comparison.config.rules.severity.throttle.highExitSpeedLossKmh
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
  const targetOverlap = transition?.targetBrakeEntryThrottleOverlapM;
  const overlapDelta = transition?.brakeEntryThrottleOverlapDeltaM;
  const throttleDrop = transition?.targetThrottleDropWhileBraking;
  const throttleDropDelta = transition?.throttleDropWhileBrakingDelta;
  const overlappingBrakeEntry =
    targetOverlap !== undefined &&
    targetOverlap > comparison.config.rules.triggers.coastingGapDeltaM &&
    throttleDrop !== undefined &&
    throttleDrop > comparison.config.rules.triggers.pedalDepthDelta &&
    (overlapDelta === undefined || overlapDelta > comparison.config.rules.triggers.coastingGapDeltaM / 2) &&
    (throttleDropDelta === undefined || throttleDropDelta > comparison.config.rules.triggers.pedalDepthDelta / 2);
  const poorOutcome =
    (lift?.liftCountDelta ?? 0) > 0 ||
    (steering?.correctionCountDelta ?? 0) >= comparison.config.rules.triggers.correctionCountDelta ||
    (speed?.exitSpeedDeltaKmh ?? 0) < -comparison.config.rules.triggers.exitSpeedDeltaKmh;
  if (!transition || !overlappingBrakeEntry || !poorOutcome) {
    return undefined;
  }

  return {
    id: "rushed-brake-to-throttle",
    priority: 60,
    title: "Drop throttle before braking",
    why: "You carry throttle into the brake phase and drop it while the brake is already applied, which can unsettle the platform before the corner is settled.",
    practiceCue: "Close the throttle before the brake marker, then make the brake application one clean input.",
    category: "throttle",
    severity:
      targetOverlap > comparison.config.rules.severity.throttle.brakeThrottleOverlapM ||
      (steering?.correctionCountDelta ?? 0) > comparison.config.rules.severity.throttle.extraCorrectionCountDelta
        ? "high"
        : "medium",
    confidence: 0.68,
    evidence: [
      makeEvidence(
        "Throttle into braking",
        formatDistanceDuration(targetOverlap),
        "absolute",
        "primary",
        { targetBrakeEntryThrottleOverlapM: targetOverlap, targetThrottleDropWhileBraking: throttleDrop },
      ),
      ...(speed === undefined
        ? []
        : [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.exitSpeedDeltaKmh })]),
    ],
  };
}

export function throttleBeforeSteeringUnwind(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const throttle = comparison.metrics.throttle;
  const steering = comparison.metrics.steering;
  const speed = comparison.metrics.speed;
  const lift = comparison.metrics.throttleLiftQuality;
  const firstDelta = throttle?.firstThrottleDeltaM;
  const unwindDelta = steering?.steeringUnwindDeltaM;
  const throttleBeforeUnwind =
    firstDelta !== undefined &&
    unwindDelta !== undefined &&
    firstDelta < -comparison.config.rules.triggers.throttleTimingDeltaM &&
    unwindDelta > comparison.config.rules.triggers.throttleTimingDeltaM;
  const poorOutcome =
    (lift?.liftCountDelta ?? 0) > 0 ||
    (steering?.correctionCountDelta ?? 0) >= comparison.config.rules.triggers.correctionCountDelta ||
    (speed?.exitSpeedDeltaKmh ?? 0) < -comparison.config.rules.triggers.exitSpeedDeltaKmh;

  if (!throttleBeforeUnwind || !poorOutcome) {
    return undefined;
  }

  return {
    id: "throttle-before-steering-unwind",
    priority: 73,
    title: "Wait until the wheel is opening",
    why: "You start adding throttle before the steering has unwound compared with the reference, then the exit shows a lift, correction, or speed cost.",
    practiceCue: "Hold maintenance throttle until your hands start opening, then build the pedal with the unwind.",
    category: "throttle",
    severity:
      Math.abs(firstDelta) > comparison.config.rules.severity.throttle.throttleTimingDeltaM ||
      unwindDelta > comparison.config.rules.severity.throttle.liftDurationDeltaM ||
      (speed?.exitSpeedDeltaKmh ?? 0) < comparison.config.rules.severity.throttle.highExitSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.7,
    evidence: [
      makeEvidence("Throttle before unwind", formatDistanceDelta(firstDelta), "delta", "primary", {
        firstThrottleDeltaM: firstDelta,
      }),
      makeEvidence("Steering unwind", formatDistanceDelta(unwindDelta), "delta", "secondary", {
        steeringUnwindDeltaM: unwindDelta,
      }),
      ...(speed === undefined
        ? []
        : [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", {
            deltaKmh: speed.exitSpeedDeltaKmh,
          })]),
    ],
  };
}

export function throttleReappliedWhileBraking(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const coordination = comparison.metrics.pedalCoordination;
  const targetRise = coordination?.targetThrottleRiseWhileBraking;
  const riseDelta = coordination?.throttleRiseWhileBrakingDelta;
  const steering = comparison.metrics.steering;
  const speed = comparison.metrics.speed;
  const lift = comparison.metrics.throttleLiftQuality;
  const clearRise =
    targetRise !== undefined &&
    targetRise.rise > comparison.config.rules.triggers.throttleRiseWhileBrakingDelta &&
    targetRise.peakBrake > comparison.config.rules.triggers.pedalDepthDelta &&
    (riseDelta === undefined || riseDelta > comparison.config.rules.triggers.throttleRiseWhileBrakingDelta / 2);
  const poorOutcome =
    (lift?.liftCountDelta ?? 0) > 0 ||
    (steering?.correctionCountDelta ?? 0) >= comparison.config.rules.triggers.correctionCountDelta ||
    (speed?.exitSpeedDeltaKmh ?? 0) < -comparison.config.rules.triggers.exitSpeedDeltaKmh;

  if (!clearRise || !poorOutcome) {
    return undefined;
  }

  return {
    id: "throttle-reapplied-while-braking",
    priority: 72,
    title: "Avoid adding throttle while still braking",
    why: "Throttle rises while brake pressure is still active, which asks the car to settle and accelerate at the same time.",
    practiceCue: "Finish the brake release first, then reapply throttle in one progressive squeeze.",
    category: "throttle",
    severity:
      targetRise.rise > comparison.config.rules.severity.throttle.liftDepth ||
      targetRise.peakBrake > 0.5 ||
      (steering?.correctionCountDelta ?? 0) > comparison.config.rules.severity.throttle.extraCorrectionCountDelta
        ? "high"
        : "medium",
    confidence: 0.69,
    evidence: [
      makeEvidence("Throttle rise while braking", formatPedalPointDelta(targetRise.rise), "absolute", "primary", {
        throttleRise: targetRise.rise,
        throttleRiseWhileBrakingDelta: riseDelta ?? targetRise.rise,
      }),
      makeEvidence("Brake during rise", formatPedalPointDelta(targetRise.peakBrake), "absolute", "secondary", {
        averageBrake: targetRise.averageBrake,
        peakBrake: targetRise.peakBrake,
      }),
      makeEvidence("Overlap distance", formatDistanceDuration(targetRise.distanceM), "absolute", "secondary", {
        overlapDistanceM: targetRise.distanceM ?? 0,
      }),
    ],
  };
}

export function exitAccelerationDeficit(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const speedShape = comparison.metrics.speedShape;
  const speed = comparison.metrics.speed;
  const gainDelta = speedShape?.minSpeedToExitGainDeltaKmh;
  const apexGainDelta = speedShape?.apexToExitGainDeltaKmh;
  const accelerationLoss =
    gainDelta !== undefined &&
    gainDelta < -comparison.config.rules.triggers.exitAccelerationDeltaKmh;
  const apexAccelerationLoss =
    apexGainDelta !== undefined &&
    apexGainDelta < -comparison.config.rules.triggers.exitAccelerationDeltaKmh;

  if (!speedShape || !speed || (!accelerationLoss && !apexAccelerationLoss)) {
    return undefined;
  }

  const primaryDelta = accelerationLoss ? gainDelta! : apexGainDelta!;
  const referenceGain = accelerationLoss
    ? speedShape.referenceMinSpeedToExitGainKmh
    : speedShape.referenceApexToExitGainKmh;
  const targetGain = accelerationLoss
    ? speedShape.targetMinSpeedToExitGainKmh
    : speedShape.targetApexToExitGainKmh;

  return {
    id: "exit-acceleration-deficit",
    priority: 67,
    title: "Build speed sooner after the slowest point",
    why: "Minimum speed is not the main loss, but the target lap gains less speed from the corner center to the exit.",
    practiceCue: "Focus on opening the wheel and pedal together so acceleration starts building as soon as the car is pointed.",
    category: "throttle",
    severity:
      primaryDelta < comparison.config.rules.severity.throttle.exitAccelerationLossKmh ||
      speed.exitSpeedDeltaKmh < comparison.config.rules.severity.throttle.highExitSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.71,
    evidence: [
      makeEvidence("Exit acceleration", formatSpeedDelta(primaryDelta), "delta", "primary", {
        accelerationDeltaKmh: primaryDelta,
      }),
      ...(targetGain === undefined
        ? []
        : [makeEvidence("Target gain", `${targetGain.toFixed(1).replace(/\.0$/, "")} km/h`, "absolute", "secondary", {
            targetGainKmh: targetGain,
          })]),
      ...(referenceGain === undefined
        ? []
        : [makeEvidence("Reference gain", `${referenceGain.toFixed(1).replace(/\.0$/, "")} km/h`, "absolute", "secondary", {
            referenceGainKmh: referenceGain,
          })]),
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
    lift.targetMaxLiftDepth < comparison.config.rules.triggers.pedalDepthDelta ||
    Math.min(speed.exitSpeedDeltaKmh, speed.averageSpeedDeltaKmh) >= -comparison.config.rules.triggers.exitSpeedDeltaKmh
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
      lift.targetMaxLiftDepth > comparison.config.rules.severity.throttle.liftDepth ||
      speed.exitSpeedDeltaKmh < comparison.config.rules.severity.throttle.highExitSpeedLossKmh
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
    lift.maxLiftDepthDelta <= comparison.config.rules.triggers.pedalDepthDelta
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
    severity: lift.maxLiftDepthDelta > comparison.config.rules.severity.throttle.liftDepthDelta ? "high" : "medium",
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
    durationDelta <= comparison.config.rules.triggers.pedalDurationDeltaM
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
    severity: durationDelta > comparison.config.rules.severity.throttle.liftDurationDeltaM ? "high" : "medium",
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
