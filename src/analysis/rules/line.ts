import { formatSpeedDelta, makeEvidence } from "../evidence";
import type { RuleDefinition } from "./index";

export const lineRules: RuleDefinition[] = [overDrivingEntry];

export function overDrivingEntry(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const speed = comparison.metrics.speed;
  const braking = comparison.metrics.braking;
  if (
    !speed ||
    speed.entrySpeedDeltaKmh <= comparison.config.thresholds.minSpeedDeltaKmh ||
    speed.minSpeedDeltaKmh >= -comparison.config.thresholds.minSpeedDeltaKmh ||
    (braking?.brakeStartDeltaM !== undefined && braking.brakeStartDeltaM < 0)
  ) {
    return undefined;
  }

  return {
    id: "over-driving-entry",
    priority: 78,
    title: "Do less at corner entry",
    why: "You arrive faster but then drop below the reference at minimum speed, which points to asking too much on entry.",
    practiceCue: "Trade a small amount of entry speed for a cleaner brake release and higher roll speed.",
    category: "line",
    severity: speed.minSpeedDeltaKmh < -6 ? "high" : "medium",
    confidence: 0.75,
    evidence: [
      makeEvidence("Entry speed", formatSpeedDelta(speed.entrySpeedDeltaKmh), "delta", "primary", { deltaKmh: speed.entrySpeedDeltaKmh }),
      makeEvidence("Minimum speed", formatSpeedDelta(speed.minSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.minSpeedDeltaKmh }),
    ],
  };
}
