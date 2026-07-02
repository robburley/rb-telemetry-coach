import { formatDistanceAt, formatDistanceDelta, formatLateralOffset, formatSpeedDelta, makeEvidence } from "../evidence";
import type { RuleDefinition } from "./index";

export const lineRules: RuleDefinition[] = [
  overDrivingEntry,
  unusedTrackOnEntryRelativeToReference,
  missedApexRelativeToReference,
  lateApex,
  earlyApexPinchedExit,
  pinchedExitRelativeToReference,
  pathDeviationHotspot,
  wideWithoutBenefit,
];

export function overDrivingEntry(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const speed = comparison.metrics.speed;
  const braking = comparison.metrics.braking;
  if (
    !speed ||
    speed.entrySpeedDeltaKmh <= comparison.config.rules.triggers.minSpeedDeltaKmh ||
    speed.minSpeedDeltaKmh >= -comparison.config.rules.triggers.minSpeedDeltaKmh ||
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
    severity: speed.minSpeedDeltaKmh < comparison.config.rules.severity.line.highSpeedLossKmh ? "high" : "medium",
    confidence: 0.75,
    evidence: [
      makeEvidence("Entry speed", formatSpeedDelta(speed.entrySpeedDeltaKmh), "delta", "primary", { deltaKmh: speed.entrySpeedDeltaKmh }),
      makeEvidence("Minimum speed", formatSpeedDelta(speed.minSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.minSpeedDeltaKmh }),
      makeEvidence("Minimum at", formatDistanceAt(speed.minSpeedDistancePct, comparison.metrics.lapLengthM), "absolute", "secondary", {
        targetDistancePct: speed.minSpeedDistancePct,
      }),
    ],
    linkedRules: [
      { id: "over-slowing-entry", reason: "entry speed often turns into minimum-speed loss" },
      { id: "unused-track-on-entry-relative-to-reference", reason: "entry pressure can shrink the available line" },
    ],
  };
}

export function unusedTrackOnEntryRelativeToReference(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const line = comparison.metrics.lineUsage;
  const speed = comparison.metrics.speed;
  const insideOffset = signedInsideOffset(line?.entry.averageLateralOffsetM, line?.cornerDirection);
  const poorOutcome =
    (speed?.minSpeedDeltaKmh ?? 0) < -comparison.config.rules.triggers.minSpeedDeltaKmh ||
    (comparison.metrics.steering?.peakSteeringDeltaDeg ?? 0) > comparison.config.rules.triggers.steeringPeakDeltaDeg;
  if (
    !line ||
    line.cornerDirection === "ambiguous" ||
    insideOffset === undefined ||
    insideOffset <= comparison.config.rules.triggers.lateralOffsetDeltaM ||
    !poorOutcome
  ) {
    return undefined;
  }

  return {
    id: "unused-track-on-entry-relative-to-reference",
    priority: 64,
    title: "Use more entry width relative to the reference",
    why: "Compared with the reference, you start the corner farther inside and then pay with speed loss or extra steering load.",
    practiceCue: "Open the entry by a small amount so the car has more radius before the apex.",
    category: "line",
    severity: insideOffset > comparison.config.rules.severity.line.unusedEntryInsideOffsetM ? "high" : "medium",
    confidence: 0.64,
    evidence: [
      makeEvidence("Entry offset", formatLateralOffset(line.entry.averageLateralOffsetM), "delta", "primary", {
        lateralOffsetM: line.entry.averageLateralOffsetM,
      }),
      makeEvidence("Entry window", formatDistanceAt(line.entry.startDistancePct, comparison.metrics.lapLengthM), "absolute", "secondary", {
        targetDistancePct: line.entry.startDistancePct,
      }),
      ...(speed
        ? [makeEvidence("Minimum speed", formatSpeedDelta(speed.minSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.minSpeedDeltaKmh })]
        : []),
    ],
    linkedRules: [{ id: "over-slowing-entry", reason: "narrow entry can cost minimum speed" }],
  };
}

export function missedApexRelativeToReference(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const line = comparison.metrics.lineUsage;
  const speed = comparison.metrics.speed;
  const insideOffset = signedInsideOffset(line?.apex.averageLateralOffsetM, line?.cornerDirection);
  const poorOutcome =
    (speed?.minSpeedDeltaKmh ?? 0) < -comparison.config.rules.triggers.minSpeedDeltaKmh ||
    (comparison.metrics.steering?.peakSteeringDeltaDeg ?? 0) > comparison.config.rules.triggers.steeringPeakDeltaDeg ||
    (comparison.metrics.headingRotation?.apexHeadingDeltaDeg ?? 0) < -comparison.config.rules.triggers.headingDeltaDeg;
  if (
    !line ||
    line.cornerDirection === "ambiguous" ||
    insideOffset === undefined ||
    insideOffset >= -comparison.config.rules.triggers.lateralOffsetDeltaM ||
    !poorOutcome
  ) {
    return undefined;
  }

  return {
    id: "missed-apex-relative-to-reference",
    priority: 67,
    title: "Reach the apex relative to the reference",
    why: "Compared with the reference, your apex window stays farther outside and the corner also shows speed, steering, or rotation cost.",
    practiceCue: "Aim the release and steering build so the car reaches the same inside reference before opening exit.",
    category: "line",
    severity: Math.abs(insideOffset) > comparison.config.rules.severity.line.apexOffsetM ? "high" : "medium",
    confidence: 0.67,
    evidence: [
      makeEvidence("Apex offset", formatLateralOffset(line.apex.averageLateralOffsetM), "delta", "primary", {
        lateralOffsetM: line.apex.averageLateralOffsetM,
      }),
      makeEvidence("Apex window", formatDistanceAt(line.apex.startDistancePct, comparison.metrics.lapLengthM), "absolute", "secondary", {
        targetDistancePct: line.apex.startDistancePct,
      }),
      ...(speed
        ? [makeEvidence("Minimum speed", formatSpeedDelta(speed.minSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.minSpeedDeltaKmh })]
        : []),
    ],
    linkedRules: [
      { id: "poor-rotation", reason: "missed apex and poor rotation often reinforce each other" },
      { id: "late-steering-unwind", reason: "missing the apex can keep steering loaded" },
    ],
  };
}

export function lateApex(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const apex = comparison.metrics.apex;
  const line = comparison.metrics.lineUsage;
  const speed = comparison.metrics.speed;
  const steering = comparison.metrics.steering;
  const throttle = comparison.metrics.throttle;
  const delta = apex?.distanceDeltaM;
  const exitSpeedLoss =
    (speed?.exitSpeedDeltaKmh ?? 0) < -comparison.config.rules.triggers.exitSpeedDeltaKmh;
  const lateUnwind =
    (steering?.steeringUnwindDeltaM ?? 0) > comparison.config.rules.triggers.throttleTimingDeltaM;
  const delayedThrottle =
    (throttle?.fullThrottleDeltaM ?? 0) > comparison.config.rules.triggers.throttleTimingDeltaM;

  if (
    !apex ||
    !line ||
    line.cornerDirection === "ambiguous" ||
    delta === undefined ||
    delta <= comparison.config.rules.triggers.apexTimingDeltaM ||
    (!exitSpeedLoss && !lateUnwind && !delayedThrottle)
  ) {
    return undefined;
  }

  return {
    id: "late-apex",
    priority: 66,
    title: "Move the apex timing earlier relative to the reference",
    why: "Your apex evidence arrives later than the reference and the exit also shows speed, steering unwind, or throttle cost.",
    practiceCue: "Start the rotation a little sooner so the car can point and release before the exit opens.",
    category: "line",
    severity:
      delta > comparison.config.rules.severity.line.apexTimingDeltaM ||
      (speed?.exitSpeedDeltaKmh ?? 0) < comparison.config.rules.severity.line.highSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.64,
    evidence: [
      makeEvidence("Apex timing", formatDistanceDelta(delta), "delta", "primary", {
        apexDistanceDeltaM: delta,
        referenceSource: apex.referenceSource,
        targetSource: apex.targetSource,
      }),
      makeEvidence("Target apex", formatDistanceAt(apex.targetDistancePct, comparison.metrics.lapLengthM), "absolute", "secondary", {
        targetDistancePct: apex.targetDistancePct,
      }),
      ...(speed
        ? [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.exitSpeedDeltaKmh })]
        : []),
    ],
    linkedRules: [
      { id: "missed-apex-relative-to-reference", reason: "late apex timing can leave the reference apex missed" },
      { id: "late-steering-unwind", reason: "late apex timing can delay steering release" },
    ],
  };
}

export function earlyApexPinchedExit(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const apex = comparison.metrics.apex;
  const line = comparison.metrics.lineUsage;
  const speed = comparison.metrics.speed;
  const steering = comparison.metrics.steering;
  const delta = apex?.distanceDeltaM;
  const insideExitOffset = signedInsideOffset(line?.exit.averageLateralOffsetM, line?.cornerDirection);
  const pinchedExit =
    insideExitOffset !== undefined &&
    insideExitOffset > comparison.config.rules.triggers.lateralOffsetDeltaM;
  const exitSpeedLoss =
    (speed?.exitSpeedDeltaKmh ?? 0) < -comparison.config.rules.triggers.exitSpeedDeltaKmh;
  const lateUnwind =
    (steering?.steeringUnwindDeltaM ?? 0) > comparison.config.rules.triggers.throttleTimingDeltaM;

  if (
    !apex ||
    !line ||
    line.cornerDirection === "ambiguous" ||
    delta === undefined ||
    delta >= -comparison.config.rules.triggers.apexTimingDeltaM ||
    (!pinchedExit && !exitSpeedLoss && !lateUnwind)
  ) {
    return undefined;
  }

  return {
    id: "early-apex-pinched-exit",
    priority: 66,
    title: "Delay the apex enough to open the exit",
    why: "Your apex evidence arrives earlier than the reference and the exit stays tighter or slower afterward.",
    practiceCue: "Give up a little early inside distance so the car can unwind and use the reference exit width.",
    category: "line",
    severity:
      delta < -comparison.config.rules.severity.line.apexTimingDeltaM ||
      (insideExitOffset ?? 0) > comparison.config.rules.severity.line.exitInsideOffsetM ||
      (speed?.exitSpeedDeltaKmh ?? 0) < comparison.config.rules.severity.line.highSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.64,
    evidence: [
      makeEvidence("Apex timing", formatDistanceDelta(delta), "delta", "primary", {
        apexDistanceDeltaM: delta,
        referenceSource: apex.referenceSource,
        targetSource: apex.targetSource,
      }),
      makeEvidence("Target apex", formatDistanceAt(apex.targetDistancePct, comparison.metrics.lapLengthM), "absolute", "secondary", {
        targetDistancePct: apex.targetDistancePct,
      }),
      ...(insideExitOffset === undefined
        ? []
        : [makeEvidence("Exit offset", formatLateralOffset(line.exit.averageLateralOffsetM), "delta", "secondary", { lateralOffsetM: line.exit.averageLateralOffsetM })]),
    ],
    linkedRules: [
      { id: "pinched-exit-relative-to-reference", reason: "early apex timing can tighten the exit" },
      { id: "late-steering-unwind", reason: "pinching the exit can delay steering release" },
    ],
  };
}

export function pinchedExitRelativeToReference(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const line = comparison.metrics.lineUsage;
  const speed = comparison.metrics.speed;
  const throttle = comparison.metrics.throttle;
  const insideOffset = signedInsideOffset(line?.exit.averageLateralOffsetM, line?.cornerDirection);
  const delayedFullThrottle =
    throttle?.fullThrottleDeltaM !== undefined &&
    throttle.fullThrottleDeltaM > comparison.config.rules.triggers.throttleTimingDeltaM;
  const poorOutcome =
    (speed?.exitSpeedDeltaKmh ?? 0) < -comparison.config.rules.triggers.exitSpeedDeltaKmh ||
    delayedFullThrottle;
  if (
    !line ||
    line.cornerDirection === "ambiguous" ||
    insideOffset === undefined ||
    insideOffset <= comparison.config.rules.triggers.lateralOffsetDeltaM ||
    !poorOutcome
  ) {
    return undefined;
  }

  return {
    id: "pinched-exit-relative-to-reference",
    priority: 66,
    title: "Open the exit relative to the reference",
    why: "Compared with the reference, you stay farther inside on exit and the car leaves slower or reaches full throttle later.",
    practiceCue: "Let the car release toward the reference exit path as the wheel opens.",
    category: "line",
    severity:
      insideOffset > comparison.config.rules.severity.line.exitInsideOffsetM ||
      (speed?.exitSpeedDeltaKmh ?? 0) < comparison.config.rules.severity.line.highSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.66,
    evidence: [
      makeEvidence("Exit offset", formatLateralOffset(line.exit.averageLateralOffsetM), "delta", "primary", {
        lateralOffsetM: line.exit.averageLateralOffsetM,
      }),
      makeEvidence("Exit window", formatDistanceAt(line.exit.startDistancePct, comparison.metrics.lapLengthM), "absolute", "secondary", {
        targetDistancePct: line.exit.startDistancePct,
      }),
      ...(speed
        ? [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.exitSpeedDeltaKmh })]
        : []),
    ],
    linkedRules: [
      { id: "exit-hesitation", reason: "a pinched exit can delay throttle commitment" },
      { id: "late-steering-unwind", reason: "a pinched exit can keep steering loaded" },
    ],
  };
}

export function pathDeviationHotspot(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const path = comparison.metrics.path;
  const line = comparison.metrics.lineUsage;
  const speed = comparison.metrics.speed;
  const steering = comparison.metrics.steering;
  const deltaM = path?.maxPathDeltaM;
  const distancePct = path?.maxPathDeltaDistancePct;
  const hasSpeedCost =
    speed !== undefined &&
    (speed.exitSpeedDeltaKmh < -comparison.config.rules.triggers.exitSpeedDeltaKmh ||
      speed.minSpeedDeltaKmh < -comparison.config.rules.triggers.minSpeedDeltaKmh ||
      speed.averageSpeedDeltaKmh < -comparison.config.rules.triggers.minSpeedDeltaKmh);
  const hasSteeringCost =
    (steering?.peakSteeringDeltaDeg ?? 0) > comparison.config.rules.triggers.steeringPeakDeltaDeg;
  const hasLineSupport =
    line !== undefined &&
    line.cornerDirection !== "ambiguous" &&
    line.maxAbsLateralOffsetM > comparison.config.rules.triggers.lateralOffsetDeltaM;

  if (
    deltaM === undefined ||
    distancePct === undefined ||
    deltaM <= comparison.config.rules.triggers.pathDeviationDeltaM ||
    !hasLineSupport ||
    (!hasSpeedCost && !hasSteeringCost)
  ) {
    return undefined;
  }

  return {
    id: "path-deviation-hotspot",
    priority: 62,
    title: "Bring the line back toward the reference hotspot",
    why: "Your largest path difference from the reference coincides with speed loss or extra steering load, so the alternate line is not paying back.",
    practiceCue: "Pick one visual marker around the largest separation and compare whether that line helps the exit build.",
    category: "line",
    severity:
      deltaM > comparison.config.rules.severity.line.pathDeviationDeltaM ||
      (speed?.exitSpeedDeltaKmh ?? 0) < comparison.config.rules.severity.line.highSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.6,
    evidence: [
      makeEvidence("Path delta", `${deltaM.toFixed(2).replace(/\.00$/, "")} m`, "delta", "primary", {
        maxPathDeltaM: deltaM,
        maxPathDeltaDistancePct: distancePct,
      }),
      makeEvidence("Path location", formatDistanceAt(distancePct, comparison.metrics.lapLengthM), "absolute", "secondary", {
        maxPathDeltaDistancePct: distancePct,
      }),
      ...(speed
        ? [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.exitSpeedDeltaKmh })]
        : []),
    ],
    linkedRules: [
      { id: "pinched-exit-relative-to-reference", reason: "the largest path delta can show the exit pinch" },
      { id: "late-steering-unwind", reason: "path divergence can keep steering loaded" },
    ],
  };
}

export function wideWithoutBenefit(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const line = comparison.metrics.lineUsage;
  const speed = comparison.metrics.speed;
  const insideOffset = signedInsideOffset(line?.apex.averageLateralOffsetM, line?.cornerDirection);
  const outsideOffset = insideOffset === undefined ? undefined : -insideOffset;
  const noSpeedGain =
    speed !== undefined &&
    speed.averageSpeedDeltaKmh <= comparison.config.rules.triggers.minSpeedDeltaKmh &&
    (speed.exitSpeedDeltaKmh < -comparison.config.rules.triggers.exitSpeedDeltaKmh ||
      speed.minSpeedDeltaKmh < -comparison.config.rules.triggers.minSpeedDeltaKmh);
  if (
    !line ||
    line.cornerDirection === "ambiguous" ||
    outsideOffset === undefined ||
    outsideOffset <= comparison.config.rules.triggers.lateralOffsetDeltaM ||
    !noSpeedGain
  ) {
    return undefined;
  }

  return {
    id: "wide-without-benefit",
    priority: 63,
    title: "Avoid the extra width without a speed gain",
    why: "Compared with the reference, your line runs wider but does not produce a minimum-speed or exit-speed benefit.",
    practiceCue: "Use the wider arc only if it lets you carry or build speed; otherwise return toward the reference path.",
    category: "line",
    severity: outsideOffset > comparison.config.rules.severity.line.wideApexOffsetM ? "high" : "medium",
    confidence: 0.61,
    evidence: [
      makeEvidence("Apex offset", formatLateralOffset(line.apex.averageLateralOffsetM), "delta", "primary", {
        lateralOffsetM: line.apex.averageLateralOffsetM,
      }),
      makeEvidence("Apex window", formatDistanceAt(line.apex.startDistancePct, comparison.metrics.lapLengthM), "absolute", "secondary", {
        targetDistancePct: line.apex.startDistancePct,
      }),
      ...(speed
        ? [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.exitSpeedDeltaKmh })]
        : []),
    ],
    linkedRules: [{ id: "over-slowing-entry", reason: "extra width without speed gain can still cost the corner" }],
  };
}

function signedInsideOffset(
  lateralOffsetM: number | undefined,
  cornerDirection: string | undefined,
): number | undefined {
  if (lateralOffsetM === undefined || cornerDirection === undefined || cornerDirection === "ambiguous") {
    return undefined;
  }
  return cornerDirection === "left" ? lateralOffsetM : -lateralOffsetM;
}
