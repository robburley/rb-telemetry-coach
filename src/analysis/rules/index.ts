import { brakingRules } from "./braking";
import { gearingRules } from "./gearing";
import { lineRules } from "./line";
import { stabilityRules } from "./stability";
import { steeringRules } from "./steering";
import { throttleRules } from "./throttle";
import type { TelemetryComparison } from "../comparisonTypes";
import type { CoachingFinding, RuleResult } from "../../domain/reportTypes";
export type RuleDefinition = (comparison: TelemetryComparison) => CoachingFinding | undefined;

const allRules = [
  ...brakingRules,
  ...throttleRules,
  ...steeringRules,
  ...lineRules,
  ...stabilityRules,
  ...gearingRules,
];

export function runDeterministicRules(comparison: TelemetryComparison): RuleResult[] {
  return allRules.map((rule) => {
    const finding = rule(comparison);
    return {
      ruleId: rule.name,
      passed: finding === undefined,
      finding,
    };
  });
}

export function sortAndLinkFindings(findings: CoachingFinding[]): CoachingFinding[] {
  const sorted = findings
    .map((finding) => ({ ...finding }))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  for (const finding of sorted) {
    for (const linkedRule of finding.linkedRules ?? []) {
      link(sorted, finding.id, linkedRule.id);
    }
  }

  return sorted;
}

function link(findings: CoachingFinding[], causeId: string, effectId: string): void {
  const cause = findings.find((finding) => finding.id === causeId);
  const effect = findings.find((finding) => finding.id === effectId);
  if (!cause || !effect) {
    return;
  }

  cause.possibleEffectFindingIds = addUnique(cause.possibleEffectFindingIds, effect.id);
  effect.possibleCauseFindingIds = addUnique(effect.possibleCauseFindingIds, cause.id);
  cause.relatedFindingIds = addUnique(cause.relatedFindingIds, effect.id);
  effect.relatedFindingIds = addUnique(effect.relatedFindingIds, cause.id);
}

function addUnique(values: string[] | undefined, value: string): string[] {
  return [...new Set([...(values ?? []), value])];
}
