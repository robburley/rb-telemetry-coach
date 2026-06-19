import { formatDistanceAt, formatDistanceDelta, formatLateralOffset, formatSpeedDelta, makeEvidence } from "../evidence";
import { LINE_SEVERITY } from "./constants/line";
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
    severity: speed.minSpeedDeltaKmh < LINE_SEVERITY.highSpeedLossKmh ? "high" : "medium",
    confidence: 0.75,
    evidence: [
      makeEvidence("Entry speed", formatSpeedDelta(speed.entrySpeedDeltaKmh), "delta", "primary", { deltaKmh: speed.entrySpeedDeltaKmh }),
      makeEvidence("Minimum speed", formatSpeedDelta(speed.minSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.minSpeedDeltaKmh }),
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
    (speed?.minSpeedDeltaKmh ?? 0) < -comparison.config.thresholds.minSpeedDeltaKmh ||
    (comparison.metrics.steering?.peakSteeringDeltaDeg ?? 0) > comparison.config.thresholds.steeringPeakDeltaDeg;
  if (
    !line ||
    line.cornerDirection === "ambiguous" ||
    insideOffset === undefined ||
    insideOffset <= comparison.config.thresholds.lateralOffsetDeltaM ||
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
    severity: insideOffset > LINE_SEVERITY.unusedEntryInsideOffsetM ? "high" : "medium",
    confidence: 0.64,
    evidence: [
      makeEvidence("Entry offset", formatLateralOffset(line.entry.averageLateralOffsetM), "delta", "primary", {
        lateralOffsetM: line.entry.averageLateralOffsetM,
      }),
      ...(speed
        ? [makeEvidence("Minimum speed", formatSpeedDelta(speed.minSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.minSpeedDeltaKmh })]
        : []),
    ],
  };
}

export function missedApexRelativeToReference(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const line = comparison.metrics.lineUsage;
  const speed = comparison.metrics.speed;
  const insideOffset = signedInsideOffset(line?.apex.averageLateralOffsetM, line?.cornerDirection);
  const poorOutcome =
    (speed?.minSpeedDeltaKmh ?? 0) < -comparison.config.thresholds.minSpeedDeltaKmh ||
    (comparison.metrics.steering?.peakSteeringDeltaDeg ?? 0) > comparison.config.thresholds.steeringPeakDeltaDeg ||
    (comparison.metrics.headingRotation?.apexHeadingDeltaDeg ?? 0) < -comparison.config.thresholds.headingDeltaDeg;
  if (
    !line ||
    line.cornerDirection === "ambiguous" ||
    insideOffset === undefined ||
    insideOffset >= -comparison.config.thresholds.lateralOffsetDeltaM ||
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
    severity: Math.abs(insideOffset) > LINE_SEVERITY.apexOffsetM ? "high" : "medium",
    confidence: 0.67,
    evidence: [
      makeEvidence("Apex offset", formatLateralOffset(line.apex.averageLateralOffsetM), "delta", "primary", {
        lateralOffsetM: line.apex.averageLateralOffsetM,
      }),
      ...(speed
        ? [makeEvidence("Minimum speed", formatSpeedDelta(speed.minSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.minSpeedDeltaKmh })]
        : []),
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
    (speed?.exitSpeedDeltaKmh ?? 0) < -comparison.config.thresholds.exitSpeedDeltaKmh;
  const lateUnwind =
    (steering?.steeringUnwindDeltaM ?? 0) > comparison.config.thresholds.throttleTimingDeltaM;
  const delayedThrottle =
    (throttle?.fullThrottleDeltaM ?? 0) > comparison.config.thresholds.throttleTimingDeltaM;

  if (
    !apex ||
    !line ||
    line.cornerDirection === "ambiguous" ||
    delta === undefined ||
    delta <= comparison.config.thresholds.apexTimingDeltaM ||
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
      delta > LINE_SEVERITY.apexTimingDeltaM ||
      (speed?.exitSpeedDeltaKmh ?? 0) < LINE_SEVERITY.highSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.64,
    evidence: [
      makeEvidence("Apex timing", formatDistanceDelta(delta), "delta", "primary", {
        apexDistanceDeltaM: delta,
        referenceSource: apex.referenceSource,
        targetSource: apex.targetSource,
      }),
      ...(speed
        ? [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.exitSpeedDeltaKmh })]
        : []),
      ...(steering?.steeringUnwindDeltaM === undefined
        ? []
        : [makeEvidence("Steering unwind", formatDistanceDelta(steering.steeringUnwindDeltaM), "delta", "secondary", { deltaM: steering.steeringUnwindDeltaM })]),
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
    insideExitOffset > comparison.config.thresholds.lateralOffsetDeltaM;
  const exitSpeedLoss =
    (speed?.exitSpeedDeltaKmh ?? 0) < -comparison.config.thresholds.exitSpeedDeltaKmh;
  const lateUnwind =
    (steering?.steeringUnwindDeltaM ?? 0) > comparison.config.thresholds.throttleTimingDeltaM;

  if (
    !apex ||
    !line ||
    line.cornerDirection === "ambiguous" ||
    delta === undefined ||
    delta >= -comparison.config.thresholds.apexTimingDeltaM ||
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
      delta < -LINE_SEVERITY.apexTimingDeltaM ||
      (insideExitOffset ?? 0) > LINE_SEVERITY.exitInsideOffsetM ||
      (speed?.exitSpeedDeltaKmh ?? 0) < LINE_SEVERITY.highSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.64,
    evidence: [
      makeEvidence("Apex timing", formatDistanceDelta(delta), "delta", "primary", {
        apexDistanceDeltaM: delta,
        referenceSource: apex.referenceSource,
        targetSource: apex.targetSource,
      }),
      ...(insideExitOffset === undefined
        ? []
        : [makeEvidence("Exit offset", formatLateralOffset(line.exit.averageLateralOffsetM), "delta", "secondary", { lateralOffsetM: line.exit.averageLateralOffsetM })]),
      ...(speed
        ? [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.exitSpeedDeltaKmh })]
        : []),
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
    throttle.fullThrottleDeltaM > comparison.config.thresholds.throttleTimingDeltaM;
  const poorOutcome =
    (speed?.exitSpeedDeltaKmh ?? 0) < -comparison.config.thresholds.exitSpeedDeltaKmh ||
    delayedFullThrottle;
  if (
    !line ||
    line.cornerDirection === "ambiguous" ||
    insideOffset === undefined ||
    insideOffset <= comparison.config.thresholds.lateralOffsetDeltaM ||
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
      insideOffset > LINE_SEVERITY.exitInsideOffsetM ||
      (speed?.exitSpeedDeltaKmh ?? 0) < LINE_SEVERITY.highSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.66,
    evidence: [
      makeEvidence("Exit offset", formatLateralOffset(line.exit.averageLateralOffsetM), "delta", "primary", {
        lateralOffsetM: line.exit.averageLateralOffsetM,
      }),
      ...(speed
        ? [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.exitSpeedDeltaKmh })]
        : []),
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
    (speed.exitSpeedDeltaKmh < -comparison.config.thresholds.exitSpeedDeltaKmh ||
      speed.minSpeedDeltaKmh < -comparison.config.thresholds.minSpeedDeltaKmh ||
      speed.averageSpeedDeltaKmh < -comparison.config.thresholds.minSpeedDeltaKmh);
  const hasSteeringCost =
    (steering?.peakSteeringDeltaDeg ?? 0) > comparison.config.thresholds.steeringPeakDeltaDeg;
  const hasLineSupport =
    line !== undefined &&
    line.cornerDirection !== "ambiguous" &&
    line.maxAbsLateralOffsetM > comparison.config.thresholds.lateralOffsetDeltaM;

  if (
    deltaM === undefined ||
    distancePct === undefined ||
    deltaM <= comparison.config.thresholds.pathDeviationDeltaM ||
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
      deltaM > LINE_SEVERITY.pathDeviationDeltaM ||
      (speed?.exitSpeedDeltaKmh ?? 0) < LINE_SEVERITY.highSpeedLossKmh
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
    speed.averageSpeedDeltaKmh <= comparison.config.thresholds.minSpeedDeltaKmh &&
    (speed.exitSpeedDeltaKmh < -comparison.config.thresholds.exitSpeedDeltaKmh ||
      speed.minSpeedDeltaKmh < -comparison.config.thresholds.minSpeedDeltaKmh);
  if (
    !line ||
    line.cornerDirection === "ambiguous" ||
    outsideOffset === undefined ||
    outsideOffset <= comparison.config.thresholds.lateralOffsetDeltaM ||
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
    severity: outsideOffset > LINE_SEVERITY.wideApexOffsetM ? "high" : "medium",
    confidence: 0.61,
    evidence: [
      makeEvidence("Apex offset", formatLateralOffset(line.apex.averageLateralOffsetM), "delta", "primary", {
        lateralOffsetM: line.apex.averageLateralOffsetM,
      }),
      ...(speed
        ? [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.exitSpeedDeltaKmh })]
        : []),
    ],
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
