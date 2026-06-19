import { formatDegreesDelta, formatDistanceDelta, formatHeadingDelta, formatSpeedDelta, makeEvidence } from "../evidence";
import { STEERING_SEVERITY } from "./constants/steering";
import type { RuleDefinition } from "./index";

export const steeringRules: RuleDefinition[] = [
  excessiveSteering,
  tooMuchSteeringWhileBraking,
  lateSteeringUnwind,
  poorRotation,
  underRotatedAtApex,
  delayedRotation,
  minimumSpeedTooEarlyOrLate,
];

export function excessiveSteering(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const steering = comparison.metrics.steering;
  if (!steering || steering.peakSteeringDeltaDeg <= comparison.config.thresholds.steeringPeakDeltaDeg) {
    return undefined;
  }

  return {
    id: "excessive-steering",
    priority: 66,
    title: "Use less peak steering",
    why: "You need more wheel than the reference, which usually means the car is being asked to turn after grip is already loaded.",
    practiceCue: "Slow your hands at peak load and let brake release help the nose turn.",
    category: "steering",
    severity: steering.peakSteeringDeltaDeg > STEERING_SEVERITY.peakSteeringDeltaDeg ? "high" : "medium",
    confidence: 0.74,
    evidence: [makeEvidence("Peak steering", formatDegreesDelta(steering.peakSteeringDeltaDeg), "delta", "primary", { deltaDeg: steering.peakSteeringDeltaDeg })],
  };
}

export function tooMuchSteeringWhileBraking(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const coordination = comparison.metrics.pedalCoordination;
  const steering = comparison.metrics.steering;
  const speed = comparison.metrics.speed;
  const rotation = comparison.metrics.headingRotation;
  const peakDelta = coordination?.peakSteeringWhileBrakingDeltaDeg;
  const averageDelta = coordination?.averageSteeringWhileBrakingDeltaDeg;
  const target = coordination?.targetSteeringWhileBraking;
  const overloaded =
    target !== undefined &&
    ((peakDelta !== undefined && peakDelta > comparison.config.thresholds.steeringWhileBrakingDeltaDeg) ||
      (averageDelta !== undefined && averageDelta > comparison.config.thresholds.steeringWhileBrakingDeltaDeg / 2));
  const steeringLoadDelta = peakDelta ?? averageDelta ?? 0;
  const poorOutcome =
    (steering?.correctionCountDelta ?? 0) >= comparison.config.thresholds.correctionCountDelta ||
    (speed?.minSpeedDeltaKmh ?? 0) < -comparison.config.thresholds.minSpeedDeltaKmh ||
    (rotation?.apexHeadingDeltaDeg ?? rotation?.minSpeedHeadingDeltaDeg ?? 0) < -comparison.config.thresholds.headingDeltaDeg;

  if (!overloaded || !poorOutcome) {
    return undefined;
  }

  return {
    id: "too-much-steering-while-braking",
    priority: 67,
    title: "Reduce steering load while braking",
    why: "Compared with the reference, the car carries more steering while brake pressure is still active, and the outcome shows corrections, speed loss, or unfinished rotation.",
    practiceCue: "Bleed brake pressure as steering builds so the front tyres are not asked for peak braking and turning together.",
    category: "steering",
    severity:
      (peakDelta ?? 0) > STEERING_SEVERITY.peakSteeringDeltaDeg ||
      (speed?.minSpeedDeltaKmh ?? 0) < STEERING_SEVERITY.highSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.68,
    evidence: [
      makeEvidence("Steering while braking", formatDegreesDelta(steeringLoadDelta), "delta", "primary", {
        steeringWhileBrakingDeltaDeg: steeringLoadDelta,
        peakSteeringWhileBrakingDeltaDeg: peakDelta ?? steeringLoadDelta,
      }),
      makeEvidence("Target peak", `${target.peakAbsSteeringDeg.toFixed(1)} deg`, "absolute", "secondary", {
        targetPeakSteeringWhileBrakingDeg: target.peakAbsSteeringDeg,
      }),
      ...(speed === undefined
        ? []
        : [makeEvidence("Minimum speed", formatSpeedDelta(speed.minSpeedDeltaKmh), "delta", "secondary", {
            deltaKmh: speed.minSpeedDeltaKmh,
          })]),
    ],
  };
}

export function lateSteeringUnwind(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const delta = comparison.metrics.steering?.steeringUnwindDeltaM;
  if (delta === undefined || delta <= comparison.config.thresholds.throttleTimingDeltaM) {
    return undefined;
  }

  return {
    id: "late-steering-unwind",
    priority: 62,
    title: "Unwind the wheel sooner",
    why: "Your steering stays loaded for longer than the reference, delaying how early the car can accept throttle.",
    practiceCue: "As soon as the car points, start opening your hands before asking for full power.",
    category: "steering",
    severity: delta > STEERING_SEVERITY.steeringUnwindDeltaM ? "high" : "medium",
    confidence: 0.72,
    evidence: [makeEvidence("Steering unwind", formatDistanceDelta(delta), "delta", "primary", { deltaM: delta })],
  };
}

export function poorRotation(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const steering = comparison.metrics.steering;
  const braking = comparison.metrics.braking;
  if (
    !steering ||
    steering.peakSteeringDeltaDeg <= comparison.config.thresholds.steeringPeakDeltaDeg ||
    (braking?.brakeReleaseDeltaM !== undefined && braking.brakeReleaseDeltaM >= 0)
  ) {
    return undefined;
  }

  return {
    id: "poor-rotation",
    priority: 65,
    title: "Help the car rotate before adding wheel",
    why: "Earlier brake release plus extra steering suggests the car is not rotating enough on entry.",
    practiceCue: "Carry a small trail-brake trace until the nose is set, then reduce steering demand.",
    category: "rotation",
    severity: "medium",
    confidence: 0.66,
    evidence: [
      makeEvidence("Peak steering", formatDegreesDelta(steering.peakSteeringDeltaDeg), "delta", "primary", { deltaDeg: steering.peakSteeringDeltaDeg }),
      makeEvidence("Brake release", formatDistanceDelta(braking?.brakeReleaseDeltaM), "delta", "secondary"),
    ],
  };
}

export function underRotatedAtApex(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const rotation = comparison.metrics.headingRotation;
  const steering = comparison.metrics.steering;
  const line = comparison.metrics.lineUsage;
  const apexDelta = rotation?.apexHeadingDeltaDeg ?? rotation?.minSpeedHeadingDeltaDeg;
  const lineOrSteeringSupport =
    (steering?.peakSteeringDeltaDeg ?? 0) > comparison.config.thresholds.steeringPeakDeltaDeg ||
    (line !== undefined &&
      line.cornerDirection !== "ambiguous" &&
      Math.abs(line.apex.averageLateralOffsetM) > comparison.config.thresholds.lateralOffsetDeltaM);
  if (
    !rotation ||
    apexDelta === undefined ||
    apexDelta >= -comparison.config.thresholds.headingDeltaDeg ||
    !lineOrSteeringSupport
  ) {
    return undefined;
  }

  return {
    id: "under-rotated-at-apex",
    priority: 65,
    title: "Get the car rotated by the apex",
    why: "Compared with the reference, the car has less heading change around the apex while line or steering evidence also points to unfinished rotation.",
    practiceCue: "Use the brake release and initial steering to finish rotation before committing to the exit.",
    category: "rotation",
    severity: apexDelta < STEERING_SEVERITY.underRotationHeadingDeltaDeg ? "high" : "medium",
    confidence: 0.66,
    evidence: [
      makeEvidence("Apex rotation", formatHeadingDelta(apexDelta), "delta", "primary", { headingDeltaDeg: apexDelta }),
      ...(steering
        ? [makeEvidence("Peak steering", formatDegreesDelta(steering.peakSteeringDeltaDeg), "delta", "secondary", { deltaDeg: steering.peakSteeringDeltaDeg })]
        : []),
    ],
  };
}

export function delayedRotation(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const rotation = comparison.metrics.headingRotation;
  const steering = comparison.metrics.steering;
  const line = comparison.metrics.lineUsage;
  const speed = comparison.metrics.speed;
  const delta = rotation?.targetReferenceEquivalentHeadingDistanceDeltaM;
  const comparableFinalRotation =
    (rotation?.headingChangeDeltaDeg ?? 0) >= -comparison.config.thresholds.headingDeltaDeg;
  const supportingCost =
    (steering?.steeringUnwindDeltaM ?? 0) > comparison.config.thresholds.throttleTimingDeltaM ||
    (speed?.exitSpeedDeltaKmh ?? 0) < -comparison.config.thresholds.exitSpeedDeltaKmh ||
    (line !== undefined &&
      line.cornerDirection !== "ambiguous" &&
      Math.abs(line.apex.averageLateralOffsetM) > comparison.config.thresholds.lateralOffsetDeltaM);

  if (
    !rotation ||
    !line ||
    line.cornerDirection === "ambiguous" ||
    delta === undefined ||
    delta <= comparison.config.thresholds.apexTimingDeltaM ||
    !comparableFinalRotation ||
    !supportingCost
  ) {
    return undefined;
  }

  return {
    id: "delayed-rotation",
    priority: 65,
    title: "Bring the rotation in sooner",
    why: "You reach the reference apex heading later, so the car is pointed late even though the final rotation is comparable.",
    practiceCue: "Use the brake release and initial steering to start the yaw earlier, then reduce steering as the car points.",
    category: "rotation",
    severity: delta > STEERING_SEVERITY.rotationTimingDeltaM ? "high" : "medium",
    confidence: 0.65,
    evidence: [
      makeEvidence("Rotation timing", formatDistanceDelta(delta), "delta", "primary", {
        rotationTimingDeltaM: delta,
      }),
      ...(steering?.steeringUnwindDeltaM === undefined
        ? []
        : [makeEvidence("Steering unwind", formatDistanceDelta(steering.steeringUnwindDeltaM), "delta", "secondary", { deltaM: steering.steeringUnwindDeltaM })]),
      makeEvidence("Final rotation", formatHeadingDelta(rotation.headingChangeDeltaDeg), "delta", "secondary", {
        headingDeltaDeg: rotation.headingChangeDeltaDeg,
      }),
    ],
  };
}

export function minimumSpeedTooEarlyOrLate(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const speed = comparison.metrics.speed;
  const delta = speed?.minSpeedDistanceDeltaM;
  if (!speed || delta === undefined || Math.abs(delta) <= comparison.config.thresholds.minSpeedLocationDeltaM) {
    return undefined;
  }

  const early = delta < 0;
  const speedLoss = speed.minSpeedDeltaKmh < -comparison.config.thresholds.minSpeedDeltaKmh;
  const exitLoss = speed.exitSpeedDeltaKmh < -comparison.config.thresholds.exitSpeedDeltaKmh;
  const weakExitGain =
    (comparison.metrics.speedShape?.minSpeedToExitGainDeltaKmh ?? 0) <
    -comparison.config.thresholds.exitAccelerationDeltaKmh;
  if (early ? !speedLoss : !exitLoss && !weakExitGain) {
    return undefined;
  }

  return {
    id: "minimum-speed-too-early-or-late",
    priority: 64,
    title: early ? "Avoid reaching minimum speed too early" : "Finish the slowest point sooner",
    why: early
      ? "Your slowest point arrives earlier than the reference and is slower, which points to over-slowing before the car is ready to rotate."
      : "Your slowest point arrives later than the reference, so the corner keeps dragging into the exit phase.",
    practiceCue: early
      ? "Trail the release toward the apex so the car keeps rolling instead of parking before rotation."
      : "Complete the braking and rotation sooner so speed can rebuild before the exit.",
    category: "rotation",
    severity:
      Math.abs(delta) > STEERING_SEVERITY.minSpeedLocationDeltaM ||
      speed.minSpeedDeltaKmh < STEERING_SEVERITY.highSpeedLossKmh ||
      speed.exitSpeedDeltaKmh < STEERING_SEVERITY.highSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.63,
    evidence: [
      makeEvidence("Minimum-speed location", formatDistanceDelta(delta), "delta", "primary", {
        minSpeedDistanceDeltaM: delta,
      }),
      makeEvidence(
        early ? "Minimum speed" : "Exit speed",
        formatSpeedDelta(early ? speed.minSpeedDeltaKmh : speed.exitSpeedDeltaKmh),
        "delta",
        "secondary",
        { deltaKmh: early ? speed.minSpeedDeltaKmh : speed.exitSpeedDeltaKmh },
      ),
    ],
  };
}
