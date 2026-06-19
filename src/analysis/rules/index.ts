import { brakingRules } from "./braking";
import { lineRules } from "./line";
import { stabilityRules } from "./stability";
import { steeringRules } from "./steering";
import { throttleRules } from "./throttle";
import type { TelemetryComparison } from "../compareTelemetry";
import type { CoachingFinding, RuleResult } from "../../domain/types";

export type RuleDefinition = (comparison: TelemetryComparison) => CoachingFinding | undefined;

export function runDeterministicRules(comparison: TelemetryComparison): RuleResult[] {
  return [
    ...brakingRules,
    ...throttleRules,
    ...steeringRules,
    ...lineRules,
    ...stabilityRules,
  ].map((rule) => {
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

  link(sorted, "over-driving-entry", "over-slowing-entry", "entry speed often turns into minimum-speed loss");
  link(sorted, "braking-too-late", "over-driving-entry", "late braking can start the entry cascade");
  link(sorted, "early-throttle-with-lift", "instability-correction", "early throttle and corrections often travel together");
  link(sorted, "excessive-steering", "poor-rotation", "extra wheel can be a symptom of rotation");
  link(sorted, "holding-brake-too-long", "delayed-throttle-pickup", "long brake release can delay throttle");

  return sorted;
}

function link(findings: CoachingFinding[], causeId: string, effectId: string, _reason: string): void {
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
