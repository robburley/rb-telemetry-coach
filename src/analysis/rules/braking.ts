import {
  formatDistanceAt,
  formatDistanceDelta,
  formatDistanceDuration,
  formatPedalDelta,
  formatPedalPointDelta,
  formatSpeedDelta,
  makeEvidence,
} from "../evidence";
import { BRAKING_SEVERITY } from "./constants/braking";
import type { RuleDefinition } from "./index";

export const brakingRules: RuleDefinition[] = [
  brakingTooEarly,
  brakingTooLate,
  holdingBrakeTooLong,
  overSlowingEntry,
  insufficientTrailBraking,
  softInitialBrake,
  spikingBrakePressure,
  dumpingBrakeRelease,
  draggingBrake,
  underBrakingPressure,
];

export function brakingTooEarly(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const braking = comparison.metrics.braking;
  const delta = braking?.brakeStartDeltaM;
  if (delta === undefined || delta >= -comparison.config.thresholds.brakeTimingDeltaM) {
    return undefined;
  }

  return {
    id: "braking-too-early",
    priority: 72,
    title: "Brake later and keep the entry calmer",
    why: "You start braking before the reference, which can spend speed before the corner is asking for it.",
    practiceCue: "Move the first brake marker a small step deeper and keep the initial hit smooth.",
    category: "braking",
    severity: Math.abs(delta) > BRAKING_SEVERITY.brakeTimingDeltaM ? "high" : "medium",
    confidence: 0.82,
    evidence: [makeEvidence("Brake start", formatDistanceDelta(delta), "delta", "primary", { deltaM: delta })],
  };
}

export function brakingTooLate(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const braking = comparison.metrics.braking;
  const delta = braking?.brakeStartDeltaM;
  if (delta === undefined || delta <= comparison.config.thresholds.brakeTimingDeltaM) {
    return undefined;
  }

  return {
    id: "braking-too-late",
    priority: 76,
    title: "Brake a touch earlier before the platform gets busy",
    why: "Your brake point is later than the reference, which can force the rest of the entry to happen in a rush.",
    practiceCue: "Try braking a car-length earlier, then release pressure rather than adding more steering.",
    category: "braking",
    severity: delta > BRAKING_SEVERITY.brakeTimingDeltaM ? "high" : "medium",
    confidence: 0.8,
    evidence: [makeEvidence("Brake start", formatDistanceDelta(delta), "delta", "primary", { deltaM: delta })],
  };
}

export function holdingBrakeTooLong(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const braking = comparison.metrics.braking;
  const delta = braking?.brakeDurationDeltaM;
  if (delta === undefined || delta <= comparison.config.thresholds.brakeTimingDeltaM) {
    return undefined;
  }

  return {
    id: "holding-brake-too-long",
    priority: 70,
    title: "Release the brake sooner through the middle",
    why: "Your brake phase covers more distance than the reference, so the car stays checked up for longer.",
    practiceCue: "Aim for the same initial brake, then bleed pressure earlier as the car rotates.",
    category: "braking",
    severity: delta > BRAKING_SEVERITY.brakeDurationDeltaM ? "high" : "medium",
    confidence: 0.78,
    evidence: [makeEvidence("Brake duration", formatDistanceDelta(delta), "delta", "primary", { deltaM: delta })],
  };
}

export function overSlowingEntry(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const speed = comparison.metrics.speed;
  if (!speed || speed.minSpeedDeltaKmh >= -comparison.config.thresholds.minSpeedDeltaKmh) {
    return undefined;
  }

  return {
    id: "over-slowing-entry",
    priority: 80,
    title: "Carry more minimum speed",
    why: "Your slowest point is below the reference, so the car has more speed to rebuild on exit.",
    practiceCue: "Release the brake into the apex and let the car roll before asking for exit throttle.",
    category: "braking",
    severity: speed.minSpeedDeltaKmh < BRAKING_SEVERITY.highSpeedLossKmh ? "high" : "medium",
    confidence: 0.86,
    evidence: [
      makeEvidence("Minimum speed", formatSpeedDelta(speed.minSpeedDeltaKmh), "delta", "primary", { deltaKmh: speed.minSpeedDeltaKmh }),
      makeEvidence("At", formatDistanceAt(speed.minSpeedDistancePct, comparison.metrics.lapLengthM), "absolute", "secondary"),
    ],
  };
}

export function insufficientTrailBraking(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const braking = comparison.metrics.braking;
  const releaseDelta = braking?.brakeReleaseDeltaM;
  const speed = comparison.metrics.speed;
  if (
    releaseDelta === undefined ||
    releaseDelta >= -comparison.config.thresholds.brakeTimingDeltaM ||
    !speed ||
    speed.minSpeedDeltaKmh <= -comparison.config.thresholds.minSpeedDeltaKmh
  ) {
    return undefined;
  }

  return {
    id: "insufficient-trail-braking",
    priority: 64,
    title: "Trail the brake a little deeper",
    why: "You come off the brake earlier than the reference without a clear minimum-speed gain, which can leave rotation unfinished.",
    practiceCue: "Keep a light brake trace to the turn-in point, then release as steering builds.",
    category: "braking",
    severity: "medium",
    confidence: 0.68,
    evidence: [
      makeEvidence("Brake release", formatDistanceDelta(releaseDelta), "delta", "primary", { deltaM: releaseDelta }),
      makeEvidence("Minimum speed", formatSpeedDelta(speed.minSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.minSpeedDeltaKmh }),
    ],
  };
}

export function softInitialBrake(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const shape = comparison.metrics.brakePressureShape;
  const speed = comparison.metrics.speed;
  const rampDelta = shape?.startToPeakDistanceDeltaM;
  const longerBraking = (comparison.metrics.braking?.brakeDurationDeltaM ?? 0) > comparison.config.thresholds.brakeTimingDeltaM;
  const speedLoss = speed ? speed.minSpeedDeltaKmh < -comparison.config.thresholds.minSpeedDeltaKmh : false;
  if (
    !shape ||
    rampDelta === undefined ||
    rampDelta <= comparison.config.thresholds.brakeRampDeltaM ||
    (!longerBraking && !speedLoss)
  ) {
    return undefined;
  }

  return {
    id: "soft-initial-brake",
    priority: 63,
    title: "Build brake pressure more decisively",
    why: "Your brake pressure takes longer to reach peak than the reference, and the corner costs either braking distance or minimum speed.",
    practiceCue: "Make the first brake squeeze firmer, then release cleanly instead of extending the whole brake phase.",
    category: "braking",
    severity:
      rampDelta > BRAKING_SEVERITY.brakeRampDeltaM ||
      (speed?.minSpeedDeltaKmh ?? 0) < BRAKING_SEVERITY.highSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.68,
    evidence: [
      makeEvidence("Start to peak", formatDistanceDelta(rampDelta), "delta", "primary", { rampDeltaM: rampDelta }),
      ...(speed
        ? [makeEvidence("Minimum speed", formatSpeedDelta(speed.minSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.minSpeedDeltaKmh })]
        : []),
    ],
  };
}

export function spikingBrakePressure(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const shape = comparison.metrics.brakePressureShape;
  const speed = comparison.metrics.speed;
  const steering = comparison.metrics.steering;
  const rampDelta = shape?.startToPeakDistanceDeltaM;
  const unstableOutcome =
    (speed?.minSpeedDeltaKmh ?? 0) < -comparison.config.thresholds.minSpeedDeltaKmh ||
    (steering?.peakSteeringDeltaDeg ?? 0) > comparison.config.thresholds.steeringPeakDeltaDeg ||
    (steering?.correctionCountDelta ?? 0) >= comparison.config.thresholds.correctionCountDelta;
  if (
    !shape ||
    rampDelta === undefined ||
    rampDelta >= -comparison.config.thresholds.brakeRampDeltaM ||
    shape.targetPeakBrake < shape.referencePeakBrake - comparison.config.thresholds.pedalDepthDelta ||
    !unstableOutcome
  ) {
    return undefined;
  }

  return {
    id: "spiking-brake-pressure",
    priority: 61,
    title: "Make the brake hit less abrupt",
    why: "Your pressure reaches peak much sooner than the reference, and the car then shows speed loss, steering load, or corrections.",
    practiceCue: "Keep the initial hit firm but progressive enough that the platform stays settled as steering begins.",
    category: "braking",
    severity:
      Math.abs(rampDelta) > BRAKING_SEVERITY.brakeRampDeltaM ||
      (steering?.correctionCountDelta ?? 0) > BRAKING_SEVERITY.extraCorrectionCountDelta
        ? "high"
        : "medium",
    confidence: 0.64,
    evidence: [
      makeEvidence("Start to peak", formatDistanceDelta(rampDelta), "delta", "primary", { rampDeltaM: rampDelta }),
      makeEvidence("Peak brake", formatPedalPointDelta(shape.targetPeakBrake - shape.referencePeakBrake), "delta", "secondary", {
        peakBrakeDelta: shape.targetPeakBrake - shape.referencePeakBrake,
      }),
    ],
  };
}

export function dumpingBrakeRelease(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const shape = comparison.metrics.brakePressureShape;
  const steering = comparison.metrics.steering;
  const releaseDelta = shape?.releaseDistanceDeltaM;
  const rotationOutcome =
    (steering?.peakSteeringDeltaDeg ?? 0) > comparison.config.thresholds.steeringPeakDeltaDeg ||
    (steering?.correctionCountDelta ?? 0) >= comparison.config.thresholds.correctionCountDelta;
  if (
    !shape ||
    releaseDelta === undefined ||
    releaseDelta >= -comparison.config.thresholds.brakeRampDeltaM ||
    !rotationOutcome
  ) {
    return undefined;
  }

  return {
    id: "dumping-brake-release",
    priority: 60,
    title: "Release brake pressure more progressively",
    why: "Your brake release is shorter than the reference, and the car needs extra steering or corrections afterward.",
    practiceCue: "Bleed the last part of brake pressure out with the steering build instead of dropping it all at once.",
    category: "braking",
    severity: Math.abs(releaseDelta) > BRAKING_SEVERITY.brakeRampDeltaM ? "high" : "medium",
    confidence: 0.63,
    evidence: [
      makeEvidence("Release distance", formatDistanceDelta(releaseDelta), "delta", "primary", { releaseDeltaM: releaseDelta }),
      ...(steering
        ? [makeEvidence("Peak steering", `${steering.peakSteeringDeltaDeg.toFixed(1)} deg extra`, "delta", "secondary", { deltaDeg: steering.peakSteeringDeltaDeg })]
        : []),
    ],
  };
}

export function draggingBrake(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const shape = comparison.metrics.brakePressureShape;
  const throttle = comparison.metrics.throttle;
  const releaseDelta = comparison.metrics.braking?.brakeReleaseDeltaM;
  const delayedThrottle =
    throttle?.firstThrottleDeltaM !== undefined &&
    throttle.firstThrottleDeltaM > comparison.config.thresholds.throttleTimingDeltaM;
  if (
    !shape ||
    shape.brakeAroundMinSpeedDelta <= comparison.config.thresholds.pedalDepthDelta ||
    shape.brakeAreaDelta <= comparison.config.thresholds.brakePressureAreaDelta ||
    !delayedThrottle &&
      (releaseDelta === undefined || releaseDelta <= comparison.config.thresholds.brakeTimingDeltaM)
  ) {
    return undefined;
  }

  return {
    id: "dragging-brake",
    priority: 62,
    title: "Let the brake go before the car waits",
    why: "You carry more brake pressure around the slowest point than the reference, which can hold the car before throttle pickup.",
    practiceCue: "Aim to finish the heavy braking sooner, then keep only the pressure needed for rotation.",
    category: "braking",
    severity: shape.brakeAroundMinSpeedDelta > BRAKING_SEVERITY.brakeAroundMinSpeedDelta ? "high" : "medium",
    confidence: 0.66,
    evidence: [
      makeEvidence("Brake near apex", formatPedalPointDelta(shape.brakeAroundMinSpeedDelta), "delta", "primary", {
        brakeAroundMinSpeedDelta: shape.brakeAroundMinSpeedDelta,
      }),
      makeEvidence("Brake area", formatPedalDelta(shape.brakeAreaDelta), "delta", "secondary", {
        brakeAreaDelta: shape.brakeAreaDelta,
      }),
      ...(throttle?.firstThrottleDeltaM === undefined
        ? []
        : [makeEvidence("First throttle", formatDistanceDelta(throttle.firstThrottleDeltaM), "delta", "secondary", { deltaM: throttle.firstThrottleDeltaM })]),
    ],
  };
}

export function underBrakingPressure(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const shape = comparison.metrics.brakePressureShape;
  const speed = comparison.metrics.speed;
  const braking = comparison.metrics.braking;
  const pressureLoss =
    shape !== undefined &&
    (shape.targetPeakBrake - shape.referencePeakBrake < -comparison.config.thresholds.pedalDepthDelta ||
      shape.brakeAreaDelta < -comparison.config.thresholds.brakePressureAreaDelta);
  const poorOutcome =
    (braking?.brakeDurationDeltaM ?? 0) > comparison.config.thresholds.brakeTimingDeltaM ||
    (speed?.minSpeedDeltaKmh ?? 0) < -comparison.config.thresholds.minSpeedDeltaKmh;
  if (!shape || !pressureLoss || !poorOutcome) {
    return undefined;
  }

  return {
    id: "under-braking-pressure",
    priority: 61,
    title: "Use enough brake pressure to shorten the entry",
    why: "You use less brake pressure than the reference, but still brake longer or arrive with less minimum speed.",
    practiceCue: "Add enough initial pressure to slow the car in the right place, then release rather than dragging the phase out.",
    category: "braking",
    severity:
      shape.brakeAreaDelta < BRAKING_SEVERITY.brakeAreaLossDelta ||
      (speed?.minSpeedDeltaKmh ?? 0) < BRAKING_SEVERITY.highSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.65,
    evidence: [
      makeEvidence("Brake area", formatPedalDelta(shape.brakeAreaDelta), "delta", "primary", {
        brakeAreaDelta: shape.brakeAreaDelta,
      }),
      makeEvidence("Peak brake", formatPedalPointDelta(shape.targetPeakBrake - shape.referencePeakBrake), "delta", "secondary", {
        peakBrakeDelta: shape.targetPeakBrake - shape.referencePeakBrake,
      }),
      ...(braking?.brakeDurationDeltaM === undefined
        ? []
        : [makeEvidence("Brake duration", formatDistanceDuration(braking.brakeDurationDeltaM), "delta", "secondary", { deltaM: braking.brakeDurationDeltaM })]),
    ],
  };
}
