import { makeEvidence } from "../evidence";
import { STABILITY_SEVERITY } from "./constants/stability";
import type { RuleDefinition } from "./index";

export const stabilityRules: RuleDefinition[] = [instabilityCorrection];

export function instabilityCorrection(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const steering = comparison.metrics.steering;
  if (!steering || steering.correctionCountDelta < comparison.config.thresholds.correctionCountDelta) {
    return undefined;
  }

  return {
    id: "instability-correction",
    priority: 67,
    title: "Make the platform quieter",
    why: "You add more steering corrections than the reference, so the car is taking extra settling inputs through the slice.",
    practiceCue: "Reduce the first overload: smoother brake release or a later throttle pickup should need fewer corrections.",
    category: "stability",
    severity: steering.correctionCountDelta > STABILITY_SEVERITY.correctionCountDelta ? "high" : "medium",
    confidence: 0.7,
    evidence: [
      makeEvidence("Extra corrections", `${steering.correctionCountDelta}`, "comparison", "primary", {
        targetCorrections: steering.targetCorrectionCount,
        referenceCorrections: steering.referenceCorrectionCount,
      }),
    ],
  };
}
