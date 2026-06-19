import { formatDegreesDelta, formatDistanceDelta, formatHeadingDelta, makeEvidence } from "../evidence";
import type { RuleDefinition } from "./index";

export const steeringRules: RuleDefinition[] = [
  excessiveSteering,
  lateSteeringUnwind,
  poorRotation,
  underRotatedAtApex,
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
    severity: steering.peakSteeringDeltaDeg > 15 ? "high" : "medium",
    confidence: 0.74,
    evidence: [makeEvidence("Peak steering", formatDegreesDelta(steering.peakSteeringDeltaDeg), "delta", "primary", { deltaDeg: steering.peakSteeringDeltaDeg })],
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
    severity: delta > 20 ? "high" : "medium",
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
    severity: apexDelta < -8 ? "high" : "medium",
    confidence: 0.66,
    evidence: [
      makeEvidence("Apex rotation", formatHeadingDelta(apexDelta), "delta", "primary", { headingDeltaDeg: apexDelta }),
      ...(steering
        ? [makeEvidence("Peak steering", formatDegreesDelta(steering.peakSteeringDeltaDeg), "delta", "secondary", { deltaDeg: steering.peakSteeringDeltaDeg })]
        : []),
    ],
  };
}
