import { formatSpeedDelta, makeEvidence } from "../evidence";
import type { RuleDefinition } from "./index";

export const gearingRules: RuleDefinition[] = [
  wrongGearOnExit,
  overRevvingWithoutSpeedGain,
  shortShiftCostingExit,
];

export function wrongGearOnExit(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const gearRpm = comparison.metrics.gearRpm;
  const speed = comparison.metrics.speed;
  const throttle = comparison.metrics.throttle;
  const exitGearDelta = gearRpm?.exitGearDelta;
  if (!gearRpm || exitGearDelta === undefined || Math.abs(exitGearDelta) < comparison.config.rules.triggers.gearDelta) {
    return undefined;
  }

  const exitSpeedLoss =
    speed !== undefined && speed.exitSpeedDeltaKmh < -comparison.config.rules.triggers.exitSpeedDeltaKmh;
  const clearSpeedBenefit =
    speed !== undefined &&
    (speed.exitSpeedDeltaKmh > comparison.config.rules.triggers.exitSpeedDeltaKmh ||
      speed.averageSpeedDeltaKmh > comparison.config.rules.triggers.minSpeedDeltaKmh);
  const delayedFullThrottle =
    throttle?.fullThrottleDeltaM !== undefined &&
    throttle.fullThrottleDeltaM > comparison.config.rules.triggers.throttleTimingDeltaM;
  const rpmSupportsCost =
    gearRpm.exitRpmDelta !== undefined &&
    ((exitGearDelta > 0 && gearRpm.exitRpmDelta < -comparison.config.rules.triggers.rpmDelta) ||
      (exitGearDelta < 0 && gearRpm.exitRpmDelta > comparison.config.rules.triggers.rpmDelta));

  if (clearSpeedBenefit || (!exitSpeedLoss && !delayedFullThrottle && !rpmSupportsCost)) {
    return undefined;
  }

  return {
    id: "wrong-gear-on-exit",
    priority: 58,
    title: "Match the reference exit gear more closely",
    why: "Your exit gear differs from the reference and the speed, RPM, or throttle evidence suggests that strategy is costing the exit.",
    practiceCue: "Review the shift point before exit and aim for a gear that lets the throttle build without bogging or running out of revs.",
    category: "gearing",
    severity:
      (speed?.exitSpeedDeltaKmh ?? 0) < comparison.config.rules.severity.gearing.highExitSpeedLossKmh ||
      Math.abs(gearRpm.exitRpmDelta ?? 0) > comparison.config.rules.severity.gearing.rpmDelta
        ? "high"
        : "medium",
    confidence: 0.63,
    evidence: [
      makeEvidence("Exit gear", formatGearDelta(exitGearDelta), "delta", "primary", {
        exitGearDelta,
        referenceExitGear: gearRpm.referenceExitGear ?? 0,
        targetExitGear: gearRpm.targetExitGear ?? 0,
      }),
      ...(speed
        ? [makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", { deltaKmh: speed.exitSpeedDeltaKmh })]
        : []),
      ...(gearRpm.exitRpmDelta === undefined
        ? []
        : [makeEvidence("Exit RPM", formatRpmDelta(gearRpm.exitRpmDelta), "delta", "secondary", { exitRpmDelta: gearRpm.exitRpmDelta })]),
    ],
  };
}

export function overRevvingWithoutSpeedGain(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const gearRpm = comparison.metrics.gearRpm;
  const speed = comparison.metrics.speed;
  const rpmDelta = largestPositiveRpmDelta(gearRpm?.averageRpmDelta, gearRpm?.exitRpmDelta);
  if (!gearRpm || !speed || rpmDelta === undefined || rpmDelta <= comparison.config.rules.triggers.rpmDelta) {
    return undefined;
  }

  const hasSpeedBenefit =
    speed.averageSpeedDeltaKmh > comparison.config.rules.triggers.minSpeedDeltaKmh ||
    speed.exitSpeedDeltaKmh > comparison.config.rules.triggers.exitSpeedDeltaKmh;
  if (hasSpeedBenefit) {
    return undefined;
  }

  return {
    id: "over-revving-without-speed-gain",
    priority: 56,
    title: "Shift before the extra revs stop helping",
    why: "You run materially more RPM than the reference without a matching average-speed or exit-speed benefit.",
    practiceCue: "Try the reference shift timing and check whether the car builds exit speed with less time near the top of the rev range.",
    category: "gearing",
    severity:
      rpmDelta > comparison.config.rules.severity.gearing.rpmDelta ||
      speed.exitSpeedDeltaKmh < comparison.config.rules.severity.gearing.highExitSpeedLossKmh
        ? "high"
        : "medium",
    confidence: 0.6,
    evidence: [
      makeEvidence("RPM delta", formatRpmDelta(rpmDelta), "delta", "primary", { rpmDelta }),
      makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", {
        deltaKmh: speed.exitSpeedDeltaKmh,
      }),
    ],
  };
}

export function shortShiftCostingExit(
  comparison: Parameters<RuleDefinition>[0],
): ReturnType<RuleDefinition> {
  const gearRpm = comparison.metrics.gearRpm;
  const speed = comparison.metrics.speed;
  const speedShape = comparison.metrics.speedShape;
  if (!gearRpm || !speed) {
    return undefined;
  }

  const higherGear =
    (gearRpm.exitGearDelta ?? 0) >= comparison.config.rules.triggers.gearDelta ||
    (gearRpm.averageGearDelta ?? 0) >= comparison.config.rules.triggers.gearDelta;
  const lowerRpm =
    (gearRpm.exitRpmDelta ?? 0) <= -comparison.config.rules.triggers.rpmDelta ||
    (gearRpm.averageRpmDelta ?? 0) <= -comparison.config.rules.triggers.rpmDelta;
  const weakerExitAcceleration =
    (speedShape?.minSpeedToExitGainDeltaKmh ?? 0) < -comparison.config.rules.triggers.exitAccelerationDeltaKmh ||
    (speedShape?.apexToExitGainDeltaKmh ?? 0) < -comparison.config.rules.triggers.exitAccelerationDeltaKmh;
  const worseExitSpeed = speed.exitSpeedDeltaKmh < -comparison.config.rules.triggers.exitSpeedDeltaKmh;

  if ((!higherGear && !lowerRpm) || (!worseExitSpeed && !weakerExitAcceleration)) {
    return undefined;
  }

  const primaryDelta = gearRpm.exitRpmDelta ?? gearRpm.averageRpmDelta ?? 0;

  return {
    id: "short-shift-costing-exit",
    priority: 57,
    title: "Avoid short-shifting the exit drive",
    why: "Compared with the reference, the target lap is in a taller or lower-RPM strategy while exit speed or acceleration build suffers.",
    practiceCue: "Hold the lower gear a little longer if it lets the engine stay in the pull without upsetting the car.",
    category: "gearing",
    severity:
      speed.exitSpeedDeltaKmh < comparison.config.rules.severity.gearing.highExitSpeedLossKmh ||
      (speedShape?.minSpeedToExitGainDeltaKmh ?? 0) < comparison.config.rules.severity.gearing.exitAccelerationLossKmh
        ? "high"
        : "medium",
    confidence: 0.62,
    evidence: [
      makeEvidence("Exit RPM", formatRpmDelta(primaryDelta), "delta", "primary", { rpmDelta: primaryDelta }),
      makeEvidence("Exit speed", formatSpeedDelta(speed.exitSpeedDeltaKmh), "delta", "secondary", {
        deltaKmh: speed.exitSpeedDeltaKmh,
      }),
      ...(speedShape?.minSpeedToExitGainDeltaKmh === undefined
        ? []
        : [
            makeEvidence("Exit acceleration", formatSpeedDelta(speedShape.minSpeedToExitGainDeltaKmh), "delta", "secondary", {
              minSpeedToExitGainDeltaKmh: speedShape.minSpeedToExitGainDeltaKmh,
            }),
          ]),
    ],
  };
}

function largestPositiveRpmDelta(
  averageRpmDelta: number | undefined,
  exitRpmDelta: number | undefined,
): number | undefined {
  const deltas = [averageRpmDelta, exitRpmDelta].filter((value): value is number => value !== undefined && value > 0);
  return deltas.length === 0 ? undefined : Math.max(...deltas);
}

function formatGearDelta(delta: number): string {
  const direction = delta >= 0 ? "higher" : "lower";
  return `${Math.abs(delta).toFixed(0)} gear ${direction}`;
}

function formatRpmDelta(delta: number): string {
  const direction = delta >= 0 ? "higher" : "lower";
  return `${Math.abs(delta).toFixed(0)} RPM ${direction}`;
}
