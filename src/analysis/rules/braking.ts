import { formatDistanceAt, formatDistanceDelta, formatPedalDelta, formatSpeedDelta, makeEvidence } from "../evidence";
import type { RuleDefinition } from "./index";

export const brakingRules: RuleDefinition[] = [
  brakingTooEarly,
  brakingTooLate,
  holdingBrakeTooLong,
  overSlowingEntry,
  insufficientTrailBraking,
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
    severity: Math.abs(delta) > 20 ? "high" : "medium",
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
    severity: delta > 20 ? "high" : "medium",
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
    severity: delta > 22 ? "high" : "medium",
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
    severity: speed.minSpeedDeltaKmh < -6 ? "high" : "medium",
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
