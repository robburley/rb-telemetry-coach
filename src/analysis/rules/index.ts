import { brakingRules } from "./braking";
import { gearingRules } from "./gearing";
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
    ...gearingRules,
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
  link(sorted, "early-throttle-with-lift", "unnecessary-throttle-lift", "an early throttle pickup can lead to an extra lift");
  link(sorted, "unnecessary-throttle-lift", "exit-hesitation", "extra lifts can delay exit commitment");
  link(sorted, "deep-throttle-lift", "instability-correction", "deep lifts and corrections often appear together");
  link(sorted, "long-throttle-lift", "exit-hesitation", "long lifts can leave the exit drive delayed");
  link(sorted, "coasting-mid-corner", "delayed-throttle-pickup", "a neutral pedal gap delays the first throttle");
  link(sorted, "coasting-mid-corner", "exit-hesitation", "coasting can leave exit speed to rebuild");
  link(sorted, "rushed-brake-to-throttle", "early-throttle-with-lift", "a rushed handoff can force a throttle reset");
  link(sorted, "rushed-brake-to-throttle", "instability-correction", "a rushed handoff can unsettle the platform");
  link(sorted, "throttle-reapplied-while-braking", "instability-correction", "mixed pedals can unsettle the platform");
  link(sorted, "throttle-reapplied-while-braking", "dumping-brake-release", "mixed pedals often pair with a rushed release");
  link(sorted, "throttle-before-steering-unwind", "early-throttle-with-lift", "early throttle before unwind can force a lift");
  link(sorted, "throttle-before-steering-unwind", "exit-hesitation", "waiting after early throttle can delay the exit");
  link(sorted, "late-steering-unwind", "unnecessary-throttle-lift", "late unwind can force a throttle reset");
  link(sorted, "too-much-steering-while-braking", "instability-correction", "steering load under brake can lead to corrections");
  link(sorted, "too-much-steering-while-braking", "poor-rotation", "steering load under brake can point to unfinished rotation");
  link(sorted, "excessive-steering", "poor-rotation", "extra wheel can be a symptom of rotation");
  link(sorted, "under-rotated-at-apex", "excessive-steering", "unfinished rotation can ask for extra steering");
  link(sorted, "under-rotated-at-apex", "late-steering-unwind", "unfinished rotation can delay the unwind");
  link(sorted, "holding-brake-too-long", "delayed-throttle-pickup", "long brake release can delay throttle");
  link(sorted, "soft-initial-brake", "holding-brake-too-long", "slow pressure build can extend the brake phase");
  link(sorted, "spiking-brake-pressure", "instability-correction", "abrupt brake pressure can unsettle the car");
  link(sorted, "dumping-brake-release", "poor-rotation", "sharp release can leave rotation unfinished");
  link(sorted, "dragging-brake", "delayed-throttle-pickup", "carrying brake near apex can delay throttle");
  link(sorted, "under-braking-pressure", "holding-brake-too-long", "too little pressure can stretch the entry");
  link(sorted, "over-driving-entry", "unused-track-on-entry-relative-to-reference", "entry pressure can shrink the available line");
  link(sorted, "unused-track-on-entry-relative-to-reference", "over-slowing-entry", "narrow entry can cost minimum speed");
  link(sorted, "missed-apex-relative-to-reference", "poor-rotation", "missed apex and poor rotation often reinforce each other");
  link(sorted, "missed-apex-relative-to-reference", "late-steering-unwind", "missing the apex can keep steering loaded");
  link(sorted, "late-apex", "missed-apex-relative-to-reference", "late apex timing can leave the reference apex missed");
  link(sorted, "late-apex", "late-steering-unwind", "late apex timing can delay steering release");
  link(sorted, "early-apex-pinched-exit", "pinched-exit-relative-to-reference", "early apex timing can tighten the exit");
  link(sorted, "early-apex-pinched-exit", "late-steering-unwind", "pinching the exit can delay steering release");
  link(sorted, "pinched-exit-relative-to-reference", "exit-hesitation", "a pinched exit can delay throttle commitment");
  link(sorted, "pinched-exit-relative-to-reference", "late-steering-unwind", "a pinched exit can keep steering loaded");
  link(sorted, "path-deviation-hotspot", "pinched-exit-relative-to-reference", "the largest path delta can show the exit pinch");
  link(sorted, "path-deviation-hotspot", "late-steering-unwind", "path divergence can keep steering loaded");
  link(sorted, "wide-without-benefit", "over-slowing-entry", "extra width without speed gain can still cost the corner");
  link(sorted, "under-rotated-at-apex", "missed-apex-relative-to-reference", "unfinished rotation can leave the apex missed");
  link(sorted, "delayed-rotation", "under-rotated-at-apex", "late rotation can show as unfinished apex rotation");
  link(sorted, "delayed-rotation", "late-steering-unwind", "late rotation can keep steering loaded");
  link(sorted, "minimum-speed-too-early-or-late", "over-slowing-entry", "early minimum speed often pairs with over-slowing");
  link(sorted, "exit-acceleration-deficit", "exit-hesitation", "weak acceleration build often appears as delayed exit commitment");
  link(sorted, "wrong-gear-on-exit", "exit-hesitation", "exit gear can limit commitment");
  link(sorted, "wrong-gear-on-exit", "exit-acceleration-deficit", "exit gear can limit acceleration build");
  link(sorted, "over-revving-without-speed-gain", "exit-hesitation", "extra revs without speed can leave the exit delayed");
  link(sorted, "over-revving-without-speed-gain", "exit-acceleration-deficit", "extra revs without speed can weaken acceleration build");
  link(sorted, "short-shift-costing-exit", "exit-acceleration-deficit", "short shifting can weaken acceleration build");

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
