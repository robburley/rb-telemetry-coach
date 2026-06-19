import { describe, expect, it } from "vitest";
import {
  compareTelemetry,
  defaultAnalysisConfig,
  distanceBetweenPct,
  distanceWindowSpeedGainKmh,
  distanceWindowIndexes,
  formatDistanceDuration,
  formatDistanceAt,
  formatDistanceDelta,
  formatHeadingDelta,
  formatLateralOffset,
  formatPedalDelta,
  formatPedalPointDelta,
  formatSpeedDelta,
  maxWithIndex,
  minWithIndex,
  normalizedPedalArea,
  averageInRange,
  Garage61ExampleDataProvider,
  generateAnalysisReport,
  resolveComparisonLaps,
  runDeterministicRules,
  sortAndLinkFindings,
  type AnalysisConfig,
  type AnalysisMetadata,
  type CoachingFinding,
  type ComparisonContext,
  type DistanceSlice,
  type LapTelemetry,
  unwrapAngles,
} from "../../src";

const analysisId = "01KVBECPC8BM15DJ7X80X1RGCT";
const referenceLapId = "01KVBPW12Z5WJY1W33G47N95KW";
const targetLapId = "01KVBPNG1EVNB3D9310P6X2J1K";
const unsmoothedConfig: AnalysisConfig = {
  ...defaultAnalysisConfig,
  resampleStepM: 10,
  smoothingWindowM: {
    speed: 0,
    brake: 0,
    throttle: 0,
    steering: 0,
  },
};

describe("Phase 1 baseline telemetry comparison and reports", () => {
  it("formats evidence with metres, lap percentage, speed, and pedal units", () => {
    expect(formatDistanceDelta(-12.25)).toBe("12.3 m earlier");
    expect(formatDistanceAt(0.1, 1000)).toBe("100 m");
    expect(formatDistanceAt(0.1234)).toBe("12.34% lap");
    expect(formatDistanceDuration(12.25)).toBe("12.3 m");
    expect(formatSpeedDelta(-4.25)).toBe("4.3 km/h slower");
    expect(formatPedalDelta(0.125)).toBe("13% more");
    expect(formatPedalPointDelta(-0.125)).toBe("13 pp lower");
    expect(formatLateralOffset(-1.234)).toBe("1.23 m right");
    expect(formatHeadingDelta(4.25)).toBe("4.3 deg more rotation");
  });

  it("generates a prioritized fixture-backed report for a valid slice", async () => {
    const provider = new Garage61ExampleDataProvider();
    const analysis = await provider.getAnalysis(analysisId);
    const roles = resolveComparisonLaps(analysis);
    const [reference, target] = await Promise.all([
      provider.getLapTelemetry(roles.referenceLapId),
      provider.getLapTelemetry(roles.targetLapId),
    ]);

    const report = generateAnalysisReport({
      analysis,
      roles,
      reference,
      target,
      slice: makeSlice(0.0354, 0.12),
    });

    expect(report.status).toBe("complete");
    expect(report.referenceLapId).toBe(referenceLapId);
    expect(report.targetLapId).toBe(targetLapId);
    expect(report.allRuleResults).toHaveLength(40);
    expect(report.allRuleResults?.map((result) => result.ruleId)).toEqual([
      "brakingTooEarly",
      "brakingTooLate",
      "holdingBrakeTooLong",
      "overSlowingEntry",
      "insufficientTrailBraking",
      "softInitialBrake",
      "spikingBrakePressure",
      "dumpingBrakeRelease",
      "draggingBrake",
      "underBrakingPressure",
      "delayedThrottlePickup",
      "earlyThrottleWithLift",
      "exitHesitation",
      "coastingMidCorner",
      "rushedBrakeToThrottle",
      "throttleBeforeSteeringUnwind",
      "throttleReappliedWhileBraking",
      "exitAccelerationDeficit",
      "unnecessaryThrottleLift",
      "deepThrottleLift",
      "longThrottleLift",
      "excessiveSteering",
      "tooMuchSteeringWhileBraking",
      "lateSteeringUnwind",
      "poorRotation",
      "underRotatedAtApex",
      "delayedRotation",
      "minimumSpeedTooEarlyOrLate",
      "overDrivingEntry",
      "unusedTrackOnEntryRelativeToReference",
      "missedApexRelativeToReference",
      "lateApex",
      "earlyApexPinchedExit",
      "pinchedExitRelativeToReference",
      "pathDeviationHotspot",
      "wideWithoutBenefit",
      "instabilityCorrection",
      "wrongGearOnExit",
      "overRevvingWithoutSpeedGain",
      "shortShiftCostingExit",
    ]);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings.map((finding) => finding.priority)).toEqual(
      [...report.findings.map((finding) => finding.priority)].sort((a, b) => b - a),
    );
    expect(report.findings[0]!.title).toMatch(/\w/);
    expect(report.findings[0]!.evidence.length).toBeGreaterThan(0);
    expect(report.findings[0]!.evidence[0]).toEqual(
      expect.objectContaining({
        label: expect.any(String),
        raw: expect.any(Object),
      }),
    );
  });

  it("keeps expanded fixture-backed reports readable and internally linked", async () => {
    const provider = new Garage61ExampleDataProvider();
    const analysis = await provider.getAnalysis(analysisId);
    const roles = resolveComparisonLaps(analysis);
    const [reference, target] = await Promise.all([
      provider.getLapTelemetry(roles.referenceLapId),
      provider.getLapTelemetry(roles.targetLapId),
    ]);

    const report = generateAnalysisReport({
      analysis,
      roles,
      reference,
      target,
      slice: makeSlice(0.0354, 0.12),
    });

    expect(report.status).toBe("complete");
    expect(report.allRuleResults).toHaveLength(40);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings.map((finding) => finding.priority)).toEqual(
      [...report.findings.map((finding) => finding.priority)].sort((a, b) => b - a),
    );

    const findingIds = new Set(report.findings.map((finding) => finding.id));
    for (const finding of report.findings) {
      expect(finding.title.trim()).not.toBe("");
      expect(finding.why.trim()).not.toBe("");
      expect(finding.practiceCue.trim()).not.toBe("");
      expect(finding.evidence.length).toBeGreaterThan(0);
      expect(finding.evidence.length).toBeLessThanOrEqual(3);
      expect(finding.evidence.some((evidence) => evidence.importance === "primary")).toBe(true);

      for (const linkedId of [
        ...(finding.possibleCauseFindingIds ?? []),
        ...(finding.possibleEffectFindingIds ?? []),
        ...(finding.relatedFindingIds ?? []),
      ]) {
        expect(findingIds.has(linkedId)).toBe(true);
      }
    }
  });

  it("returns a slice policy report instead of running rules for invalid slices", () => {
    const context = makeContext();
    const report = generateAnalysisReport({
      ...context,
      slice: makeSlice(0.1, 0.3),
    });

    expect(report.status).toBe("unsupported");
    expect(report.reason).toBe("slice_too_large");
    expect(report.findings).toEqual([]);
  });

  it("computes speed, braking, throttle, steering, gear/RPM, and path metrics when available", () => {
    const comparison = compareTelemetry(
      replaceChannels(
        makeContext(),
        {
          brake: [0, 1, 0.5, 0, 0, 0, 0],
          speedMs: [20, 20, 19, 20, 21, 22, 23],
          steeringRad: [0, 0.1, 0.2, 0.1, 0, 0, 0],
          throttle: [0, 0, 0.2, 0.6, 1, 1, 1],
        },
        {
          brake: [0, 0, 0, 1, 0.4, 0, 0],
          speedMs: [20, 18, 17, 19, 21, 22, 23],
          steeringRad: [0, 0.25, 0.45, 0.25, 0, 0, 0],
          throttle: [0, 0.3, 0.1, 0.6, 1, 1, 1],
        },
      ),
      unsmoothedConfig,
    );

    expect(comparison.metrics.speed?.minSpeedDeltaKmh).toBeLessThan(0);
    expect(comparison.metrics.braking?.brakeStartDeltaM).toBeGreaterThan(0);
    expect(comparison.metrics.throttle?.targetLiftCount).toBe(1);
    expect(comparison.metrics.steering?.peakSteeringDeltaDeg).toBeGreaterThan(0);
    expect(comparison.metrics.gearRpm?.exitGearDelta).toBe(0);
    expect(comparison.metrics.gearRpm?.averageRpmDelta).toBeGreaterThan(0);
    expect(comparison.metrics.path?.maxPathDeltaM).toBeGreaterThan(0);
    expect(comparison.metrics.throttleLiftQuality?.targetAverage).toBeGreaterThan(0);
    expect(comparison.metrics.brakePressureShape?.targetPeakBrake).toBe(1);
    expect(comparison.metrics.brakeToThrottleTransition?.targetCoastGapM).toBeDefined();
  });

  it("keeps speed metrics while degrading missing brake, throttle, steering, gear/RPM, and path channels", () => {
    const comparison = compareTelemetry(
      makeContext({
        referenceChannels: {
          brake: undefined,
          throttle: undefined,
          steeringRad: undefined,
          gear: undefined,
          rpm: undefined,
          latitude: undefined,
          longitude: undefined,
        },
        targetChannels: {
          brake: undefined,
          throttle: undefined,
          steeringRad: undefined,
          gear: undefined,
          rpm: undefined,
          latitude: undefined,
          longitude: undefined,
        },
      }),
      unsmoothedConfig,
    );

    expect(comparison.metrics.speed).toBeDefined();
    expect(comparison.metrics.braking).toBeUndefined();
    expect(comparison.metrics.throttle).toBeUndefined();
    expect(comparison.metrics.steering).toBeUndefined();
    expect(comparison.metrics.gearRpm).toBeUndefined();
    expect(comparison.metrics.path).toBeUndefined();
  });

  it("keeps throttle-derived metrics and rules optional when throttle channels are missing", () => {
    const comparison = compareTelemetry(
      makeContext({
        referenceChannels: { throttle: undefined },
        targetChannels: { throttle: undefined },
      }),
      unsmoothedConfig,
    );
    const ids = findingsFor(comparison).map((finding) => finding.id);

    expect(comparison.metrics.throttle).toBeUndefined();
    expect(comparison.metrics.throttleLiftQuality).toBeUndefined();
    expect(comparison.metrics.brakeToThrottleTransition?.targetBrakeThrottleOverlapM).toBeUndefined();
    expect(ids).not.toContain("delayed-throttle-pickup");
    expect(ids).not.toContain("early-throttle-with-lift");
    expect(ids).not.toContain("exit-hesitation");
    expect(ids).not.toContain("coasting-mid-corner");
    expect(ids).not.toContain("rushed-brake-to-throttle");
    expect(ids).not.toContain("throttle-before-steering-unwind");
    expect(ids).not.toContain("throttle-reapplied-while-braking");
    expect(ids).not.toContain("unnecessary-throttle-lift");
    expect(ids).not.toContain("deep-throttle-lift");
    expect(ids).not.toContain("long-throttle-lift");
  });

  it("keeps brake-derived metrics and rules optional when brake channels are missing", () => {
    const comparison = compareTelemetry(
      makeContext({
        referenceChannels: { brake: undefined },
        targetChannels: { brake: undefined },
      }),
      unsmoothedConfig,
    );
    const ids = findingsFor(comparison).map((finding) => finding.id);

    expect(comparison.metrics.braking).toBeUndefined();
    expect(comparison.metrics.brakePressureShape).toBeUndefined();
    expect(comparison.metrics.brakeToThrottleTransition?.targetBrakeThrottleOverlapM).toBeUndefined();
    expect(ids).not.toContain("braking-too-early");
    expect(ids).not.toContain("braking-too-late");
    expect(ids).not.toContain("holding-brake-too-long");
    expect(ids).not.toContain("insufficient-trail-braking");
    expect(ids).not.toContain("soft-initial-brake");
    expect(ids).not.toContain("spiking-brake-pressure");
    expect(ids).not.toContain("dumping-brake-release");
    expect(ids).not.toContain("dragging-brake");
    expect(ids).not.toContain("under-braking-pressure");
  });

  it("keeps steering-derived rules optional when steering channels are missing", () => {
    const comparison = compareTelemetry(
      makeContext({
        referenceChannels: { steeringRad: undefined },
        targetChannels: { steeringRad: undefined },
      }),
      unsmoothedConfig,
    );
    const ids = findingsFor(comparison).map((finding) => finding.id);

    expect(comparison.metrics.steering).toBeUndefined();
    expect(ids).not.toContain("excessive-steering");
    expect(ids).not.toContain("late-steering-unwind");
    expect(ids).not.toContain("poor-rotation");
    expect(ids).not.toContain("too-much-steering-while-braking");
    expect(ids).not.toContain("instability-correction");
  });

  it("keeps GPS-derived line metrics and rules optional when position channels are missing", () => {
    const comparison = compareTelemetry(
      makeContext({
        referenceChannels: { latitude: undefined, longitude: undefined },
        targetChannels: { latitude: undefined, longitude: undefined },
      }),
      unsmoothedConfig,
    );
    const ids = findingsFor(comparison).map((finding) => finding.id);

    expect(comparison.metrics.path).toBeUndefined();
    expect(comparison.metrics.lineUsage).toBeUndefined();
    expect(ids).not.toContain("unused-track-on-entry-relative-to-reference");
    expect(ids).not.toContain("missed-apex-relative-to-reference");
    expect(ids).not.toContain("pinched-exit-relative-to-reference");
    expect(ids).not.toContain("wide-without-benefit");
  });

  it("falls back to GPS-derived direction when heading channels are missing", () => {
    const comparison = compareTelemetry(
      makeContext({
        referenceChannels: { headingRad: undefined },
        targetChannels: { headingRad: undefined },
      }),
      unsmoothedConfig,
    );
    const ids = findingsFor(comparison).map((finding) => finding.id);

    expect(comparison.metrics.headingRotation?.targetHeadingChangeDeg).toEqual(expect.any(Number));
    expect(comparison.metrics.lineUsage).toBeDefined();
    expect(ids).not.toContain("under-rotated-at-apex");
  });

  it("skips speed-dependent metrics and affected rules when speed is missing", () => {
    const context = makeContext({
      referenceChannels: { speedMs: undefined },
      targetChannels: { speedMs: undefined },
    });
    const comparison = compareTelemetry(context, unsmoothedConfig);
    const report = generateAnalysisReport(context, unsmoothedConfig);

    expect(report.status).toBe("complete");
    expect(comparison.metrics.speed).toBeUndefined();
    expect(report.findings).toEqual([]);
  });
});

describe("Phase 2 derived metric foundations", () => {
  it("adds inert optional metric sections without changing baseline rule output", () => {
    const comparison = compareTelemetry(
      makeContext({
        referenceChannels: { headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12] },
        targetChannels: { headingRad: [0, 0.015, 0.03, 0.045, 0.06, 0.075, 0.09] },
      }),
      unsmoothedConfig,
    );

    expect(comparison.metrics.throttleLiftQuality).toEqual(
      expect.objectContaining({
        targetArea: expect.any(Number),
        referenceArea: expect.any(Number),
        areaDelta: expect.any(Number),
      }),
    );
    expect(comparison.metrics.brakePressureShape).toEqual(
      expect.objectContaining({
        targetPeakBrake: expect.any(Number),
        referencePeakBrake: expect.any(Number),
        brakeAreaDelta: expect.any(Number),
        startToPeakDistanceDeltaM: expect.any(Number),
        releaseDistanceDeltaM: expect.any(Number),
        brakeAroundMinSpeedDelta: expect.any(Number),
      }),
    );
    expect(comparison.metrics.brakeToThrottleTransition).toEqual(
      expect.objectContaining({
        coastGapDeltaM: expect.any(Number),
      }),
    );
    expect(comparison.metrics.headingRotation?.headingChangeDeltaDeg).toBeLessThan(0);
    expect(comparison.metrics.headingRotation?.apexHeadingDeltaDeg).toBeDefined();
    expect(comparison.metrics.lineUsage).toEqual(
      expect.objectContaining({
        cornerDirection: "left",
        averageLateralOffsetM: expect.any(Number),
        maxAbsLateralOffsetM: expect.any(Number),
        entry: expect.objectContaining({ averageLateralOffsetM: expect.any(Number) }),
        apex: expect.objectContaining({ averageLateralOffsetM: expect.any(Number) }),
        exit: expect.objectContaining({ averageLateralOffsetM: expect.any(Number) }),
      }),
    );
    expect(runDeterministicRules(comparison)).toHaveLength(40);
  });

  it("leaves new optional metric sections undefined when their channels are missing", () => {
    const comparison = compareTelemetry(
      makeContext({
        referenceChannels: {
          brake: undefined,
          throttle: undefined,
          latitude: undefined,
          longitude: undefined,
          headingRad: undefined,
        },
        targetChannels: {
          brake: undefined,
          throttle: undefined,
          latitude: undefined,
          longitude: undefined,
          headingRad: undefined,
        },
      }),
      unsmoothedConfig,
    );

    expect(comparison.metrics.throttleLiftQuality).toBeUndefined();
    expect(comparison.metrics.brakePressureShape).toBeUndefined();
    expect(comparison.metrics.brakeToThrottleTransition).toBeUndefined();
    expect(comparison.metrics.headingRotation).toBeUndefined();
    expect(comparison.metrics.lineUsage).toBeUndefined();
  });

  it("covers low-level distance, area, range, extrema, and angle helpers", () => {
    const distancePct = Float64Array.from([0.1, 0.102, 0.104, 0.106]);
    const pedal = Float32Array.from([-0.5, 0.5, 1.5, 1]);
    const wrappedHeading = Float32Array.from([3.12, 3.13, -3.13, -3.12]);

    expect(distanceWindowIndexes(distancePct, 0.101, 0.105)).toEqual({
      startIndex: 1,
      endIndex: 2,
    });
    expect(distanceWindowIndexes(distancePct, 0.2, 0.3)).toBeUndefined();
    expect(distanceBetweenPct(0.1, 0.106, 5000)).toBeCloseTo(30);
    expect(distanceBetweenPct(0.1, 0.106, undefined)).toBeUndefined();
    expect(distanceWindowSpeedGainKmh(compareTelemetry(makeContext(), unsmoothedConfig).reference, 0.104, 0.112)).toBeCloseTo(10.8);
    expect(
      distanceWindowSpeedGainKmh(
        compareTelemetry(makeContext({ referenceChannels: { speedMs: undefined } }), unsmoothedConfig).reference,
        0.104,
        0.112,
      ),
    ).toBeUndefined();
    expect(normalizedPedalArea(pedal, distancePct, 5000)).toBeGreaterThan(0);
    expect(normalizedPedalArea(Float32Array.from([0, 0.5, 1]), Float64Array.from([0, 0.5, 1]), undefined)).toBe(0.5);
    expect(normalizedPedalArea(new Float32Array(), new Float64Array(), 5000)).toBe(0);
    expect(minWithIndex(Float32Array.from([0.3, 0.1, 0.2]))).toEqual({
      value: expect.closeTo(0.1),
      index: 1,
    });
    expect(maxWithIndex(Float32Array.from([0.1, 0.7, 0.2]))).toEqual({
      value: expect.closeTo(0.7),
      index: 1,
    });
    expect(averageInRange(Float64Array.from([1, 2, 3, 4]), 1, 2)).toBe(2.5);
    expect(averageInRange(Float32Array.from([1, 2]), 2, 1)).toBeUndefined();
    expect(Array.from(unwrapAngles(wrappedHeading))).toEqual([
      expect.closeTo(3.12),
      expect.closeTo(3.13),
      expect.closeTo(3.153),
      expect.closeTo(3.163),
    ]);
  });

  it("detects ambiguous heading rotation and avoids non-finite line evidence", () => {
    const comparison = compareTelemetry(
      makeContext({
        referenceChannels: { headingRad: [0, 0, 0, 0, 0, 0, 0] },
        targetChannels: { headingRad: [0, 0, 0, 0, 0, 0, 0] },
      }),
      unsmoothedConfig,
    );

    expect(comparison.metrics.headingRotation?.referenceHeadingChangeDeg).toBe(0);
    expect(comparison.metrics.lineUsage?.cornerDirection).toBe("ambiguous");
    expect(Number.isFinite(comparison.metrics.lineUsage?.averageLateralOffsetM)).toBe(true);
  });

  it("computes Phase 1 foundations for gearing, apex timing, speed gain, steering under brake, and throttle rise under brake", () => {
    const comparison = compareTelemetry(
      replaceChannels(
        makeContext(),
        {
          brake: [0, 1, 0.8, 0.4, 0, 0, 0],
          throttle: [0, 0, 0, 0.2, 0.7, 1, 1],
          steeringRad: [0, 0.1, 0.2, 0.1, 0, 0, 0],
          speedMs: [24, 22, 20, 21, 22, 23, 24],
          gear: [3, 3, 3, 3, 4, 4, 4],
          rpm: [5000, 5200, 5400, 5600, 5800, 6000, 6200],
        },
        {
          brake: [0, 1, 0.8, 0.6, 0, 0, 0],
          throttle: [0, 0, 0.2, 0.45, 0.2, 1, 1],
          steeringRad: [0, 0.25, 0.45, 0.3, 0, 0, 0],
          speedMs: [24, 23, 21, 20, 20.5, 21, 22],
          gear: [3, 3, 4, 4, 4, 4, 4],
          rpm: [5200, 5400, 5600, 5800, 6000, 6200, 6400],
        },
      ),
      unsmoothedConfig,
    );

    expect(comparison.metrics.gearRpm).toEqual(
      expect.objectContaining({
        referenceExitGear: 4,
        targetExitGear: 4,
        referenceExitRpm: 6200,
        targetExitRpm: 6400,
        averageRpmDelta: expect.closeTo(200),
        averageGearDelta: expect.any(Number),
      }),
    );
    expect(comparison.metrics.apex).toEqual(
      expect.objectContaining({
        referenceSource: "min-speed",
        targetSource: "min-speed",
        distanceDeltaM: expect.closeTo(10),
      }),
    );
    expect(comparison.metrics.speed?.minSpeedDistanceDeltaM).toBeCloseTo(10);
    expect(comparison.metrics.speedShape).toEqual(
      expect.objectContaining({
        referenceMinSpeedToExitGainKmh: expect.closeTo(14.4),
        targetMinSpeedToExitGainKmh: expect.closeTo(7.2),
        minSpeedToExitGainDeltaKmh: expect.closeTo(-7.2),
      }),
    );
    expect(comparison.metrics.pedalCoordination).toEqual(
      expect.objectContaining({
        averageSteeringWhileBrakingDeltaDeg: expect.any(Number),
        peakSteeringWhileBrakingDeltaDeg: expect.any(Number),
        targetThrottleRiseWhileBraking: expect.objectContaining({
          rise: expect.closeTo(0.45),
          averageBrake: expect.any(Number),
          peakBrake: expect.any(Number),
        }),
      }),
    );
    expect(runDeterministicRules(comparison)).toHaveLength(40);
  });

  it("keeps throttle-rise-under-brake distinct from throttle carried into brake entry and dropped while braking", () => {
    const dropOnly = compareTelemetry(
      replaceChannels(
        makeContext(),
        {
          brake: [0, 1, 0.8, 0.4, 0, 0, 0],
          throttle: [0, 0, 0, 0.2, 0.7, 1, 1],
        },
        {
          brake: [0, 1, 0.8, 0.4, 0, 0, 0],
          throttle: [0.6, 0.6, 0.2, 0, 0, 1, 1],
        },
      ),
      unsmoothedConfig,
    );
    const riseOnly = compareTelemetry(
      replaceChannels(
        makeContext(),
        {
          brake: [0, 1, 0.8, 0.4, 0, 0, 0],
          throttle: [0, 0, 0, 0.2, 0.7, 1, 1],
        },
        {
          brake: [0, 1, 0.8, 0.4, 0, 0, 0],
          throttle: [0, 0, 0.2, 0.5, 0, 1, 1],
        },
      ),
      unsmoothedConfig,
    );

    expect(dropOnly.metrics.brakeToThrottleTransition?.targetThrottleDropWhileBraking).toBeGreaterThan(0);
    expect(dropOnly.metrics.pedalCoordination?.targetThrottleRiseWhileBraking).toBeUndefined();
    expect(riseOnly.metrics.brakeToThrottleTransition?.targetThrottleDropWhileBraking).toBeUndefined();
    expect(riseOnly.metrics.pedalCoordination?.targetThrottleRiseWhileBraking?.rise).toBeGreaterThan(0);
  });

  it("degrades new metric sections cleanly for missing channels, short slices, and no-op baselines", () => {
    const missing = compareTelemetry(
      makeContext({
        referenceChannels: {
          speedMs: undefined,
          brake: undefined,
          throttle: undefined,
          steeringRad: undefined,
          gear: undefined,
          rpm: undefined,
        },
        targetChannels: {
          speedMs: undefined,
          brake: undefined,
          throttle: undefined,
          steeringRad: undefined,
          gear: undefined,
          rpm: undefined,
        },
      }),
      unsmoothedConfig,
    );
    const short = compareTelemetry(makeShortContext(), unsmoothedConfig);
    const quiet = compareTelemetry(makeContext(), unsmoothedConfig);

    expect(missing.metrics.gearRpm).toBeUndefined();
    expect(missing.metrics.speedShape).toBeUndefined();
    expect(missing.metrics.pedalCoordination).toBeUndefined();
    expect(short.metrics.speedShape).toBeDefined();
    expect(short.metrics.pedalCoordination).toBeUndefined();
    expect(quiet.metrics.speedShape?.minSpeedToExitGainDeltaKmh).toBeCloseTo(0);
    expect(quiet.metrics.apex?.distanceDeltaM).toBeCloseTo(0);
    expect(quiet.metrics.pedalCoordination?.throttleRiseWhileBrakingDelta).toBeCloseTo(0);
  });
});

describe("Phase 5 heading-aware line usage metrics", () => {
  it("computes signed left-hand lateral offsets and entry/apex/exit summaries", () => {
    const referencePath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 0, 0, 0]);
    const targetPath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [1, 1.5, 2, 2.5, 2, 1.5, 1]);
    const comparison = compareTelemetry(
      replaceChannels(
        makeContext(),
        {
          latitude: referencePath.latitude,
          longitude: referencePath.longitude,
          headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
          speedMs: [25, 22, 18, 15, 18, 22, 25],
        },
        {
          latitude: targetPath.latitude,
          longitude: targetPath.longitude,
          headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
          speedMs: [25, 22, 18, 15, 18, 22, 25],
        },
      ),
      unsmoothedConfig,
    );

    expect(comparison.metrics.lineUsage).toEqual(
      expect.objectContaining({
        cornerDirection: "left",
        averageLateralOffsetM: expect.closeTo(1.64, 1),
        maxAbsLateralOffsetM: expect.closeTo(2.5, 1),
        maxAbsLateralOffsetDistancePct: expect.closeTo(0.106),
      }),
    );
    expect(comparison.metrics.lineUsage?.entry.averageLateralOffsetM).toBeGreaterThan(0);
    expect(comparison.metrics.lineUsage?.apex.maxAbsLateralOffsetM).toBeGreaterThan(2);
    expect(comparison.metrics.lineUsage?.exit.averageLateralOffsetM).toBeGreaterThan(0);
  });

  it("computes opposite signed offsets for right-hand geometry", () => {
    const referencePath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 0, 0, 0]);
    const targetPath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, -1, -2, -2.5, -2, -1, 0]);
    const comparison = compareTelemetry(
      replaceChannels(
        makeContext(),
        {
          latitude: referencePath.latitude,
          longitude: referencePath.longitude,
          headingRad: [0, -0.02, -0.04, -0.06, -0.08, -0.1, -0.12],
        },
        {
          latitude: targetPath.latitude,
          longitude: targetPath.longitude,
          headingRad: [0, -0.02, -0.04, -0.06, -0.08, -0.1, -0.12],
        },
      ),
      unsmoothedConfig,
    );

    expect(comparison.metrics.lineUsage?.cornerDirection).toBe("right");
    expect(comparison.metrics.lineUsage?.averageLateralOffsetM).toBeLessThan(0);
    expect(comparison.metrics.lineUsage?.apex.averageLateralOffsetM).toBeLessThan(0);
  });

  it("falls back to adjacent GPS points when heading is missing", () => {
    const referencePath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0.5, 1.5, 3, 5, 7.5, 10.5]);
    const targetPath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [1, 1.5, 2.5, 4, 6, 8.5, 11.5]);
    const comparison = compareTelemetry(
      replaceChannels(
        makeContext(),
        {
          latitude: referencePath.latitude,
          longitude: referencePath.longitude,
          headingRad: undefined,
        },
        {
          latitude: targetPath.latitude,
          longitude: targetPath.longitude,
          headingRad: undefined,
        },
      ),
      unsmoothedConfig,
    );

    expect(comparison.metrics.headingRotation?.referenceHeadingChangeDeg).toBeGreaterThan(2);
    expect(comparison.metrics.lineUsage?.cornerDirection).toBe("left");
    expect(comparison.metrics.lineUsage?.maxAbsLateralOffsetM).toBeGreaterThan(0.8);
  });

  it("marks straight slices ambiguous and keeps missing GPS optional", () => {
    const straight = compareTelemetry(
      replaceChannels(
        makeContext(),
        { headingRad: [0, 0, 0, 0, 0, 0, 0] },
        { headingRad: [0, 0, 0, 0, 0, 0, 0] },
      ),
      unsmoothedConfig,
    );
    const missingGps = compareTelemetry(
      makeContext({
        referenceChannels: { latitude: undefined, longitude: undefined },
        targetChannels: { latitude: undefined, longitude: undefined },
      }),
      unsmoothedConfig,
    );

    expect(straight.metrics.lineUsage?.cornerDirection).toBe("ambiguous");
    expect(missingGps.metrics.lineUsage).toBeUndefined();
  });

  it("unwraps heading around pi for rotation and direction metrics", () => {
    const referencePath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 0, 0, 0]);
    const targetPath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [1, 1, 1, 1, 1, 1, 1]);
    const comparison = compareTelemetry(
      replaceChannels(
        makeContext(),
        {
          latitude: referencePath.latitude,
          longitude: referencePath.longitude,
          headingRad: [3.1, 3.12, 3.13, -3.13, -3.12, -3.1, -3.08],
        },
        {
          latitude: targetPath.latitude,
          longitude: targetPath.longitude,
          headingRad: [3.1, 3.11, 3.12, -3.13, -3.11, -3.09, -3.07],
        },
      ),
      unsmoothedConfig,
    );

    expect(comparison.metrics.headingRotation?.referenceHeadingChangeDeg).toBeGreaterThan(5);
    expect(comparison.metrics.lineUsage?.cornerDirection).toBe("left");
    expect(comparison.metrics.headingRotation?.targetReferenceEquivalentHeadingDistanceDeltaM).toBeDefined();
  });
});

describe("Phase 3 throttle lift quality", () => {
  it("computes lift count, depth, duration, total distance, and area lost", () => {
    const comparison = compareTelemetry(
      replaceThrottle(
        makeContext(),
        [0, 0.4, 0.8, 0.8, 0.8, 0.8, 0.8],
        [0, 0.6, 0.2, 0.2, 0.55, 0.85, 0.85],
      ),
      unsmoothedConfig,
    );

    expect(comparison.metrics.throttleLiftQuality).toEqual(
      expect.objectContaining({
        targetLiftCount: 1,
        referenceLiftCount: 0,
        liftCountDelta: 1,
        targetMaxLiftDepth: expect.closeTo(0.4),
        maxLiftDepthDelta: expect.closeTo(0.4),
        targetLongestLiftDurationM: expect.closeTo(40),
        targetTotalLiftDistanceM: expect.closeTo(40),
      }),
    );
    expect(comparison.metrics.throttleLiftQuality?.targetThrottleAreaLostM).toBeGreaterThan(8);
  });

  it("fires unnecessary throttle lift when the reference stays committed and speed is lost", () => {
    const findings = runDeterministicRules(
      compareTelemetry(
        replaceSpeedAndThrottle(
          makeContext(),
          [22, 22, 22, 22, 23, 24, 25],
          [22, 22, 21, 21, 22, 22, 23],
          [0, 0.4, 0.8, 0.8, 0.9, 1, 1],
          [0, 0.6, 0.2, 0.2, 0.55, 0.85, 0.9],
        ),
        unsmoothedConfig,
      ),
    ).flatMap((result) => (result.finding ? [result.finding] : []));

    const finding = findings.find((candidate) => candidate.id === "unnecessary-throttle-lift");
    expect(finding).toEqual(
      expect.objectContaining({
        category: "throttle",
        severity: "high",
      }),
    );
    expect(finding?.evidence[0]).toEqual(
      expect.objectContaining({
        label: "Lift depth",
        raw: expect.objectContaining({ targetMaxLiftDepth: expect.any(Number) }),
      }),
    );
  });

  it("fires deep throttle lift for materially deeper target pedal drops", () => {
    const findings = runDeterministicRules(
      compareTelemetry(
        replaceThrottle(
          makeContext(),
          [0, 0.8, 0.65, 0.8, 1, 1, 1],
          [0, 0.8, 0.25, 0.8, 1, 1, 1],
        ),
        unsmoothedConfig,
      ),
    ).flatMap((result) => (result.finding ? [result.finding] : []));

    expect(findings.find((finding) => finding.id === "deep-throttle-lift")).toEqual(
      expect.objectContaining({
        confidence: 0.7,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Lift depth delta",
            raw: expect.objectContaining({ depthDelta: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires long throttle lift for materially longer target lift duration", () => {
    const findings = runDeterministicRules(
      compareTelemetry(
        replaceThrottle(
          makeContext(),
          [0, 0.8, 0.4, 0.8, 1, 1, 1],
          [0, 0.8, 0.4, 0.4, 0.4, 0.8, 1],
        ),
        unsmoothedConfig,
      ),
    ).flatMap((result) => (result.finding ? [result.finding] : []));

    expect(findings.find((finding) => finding.id === "long-throttle-lift")).toEqual(
      expect.objectContaining({
        confidence: 0.69,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Lift duration delta",
            raw: expect.objectContaining({ durationDeltaM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("stays quiet when both laps lift similarly or throttle is missing", () => {
    const similarLiftIds = runDeterministicRules(
      compareTelemetry(
        replaceThrottle(
          makeContext(),
          [0, 0.8, 0.4, 0.8, 1, 1, 1],
          [0, 0.8, 0.4, 0.8, 1, 1, 1],
        ),
        unsmoothedConfig,
      ),
    ).flatMap((result) => (result.finding ? [result.finding.id] : []));
    const missingThrottleIds = runDeterministicRules(
      compareTelemetry(
        makeContext({
          referenceChannels: { throttle: undefined },
          targetChannels: { throttle: undefined },
        }),
        unsmoothedConfig,
      ),
    ).flatMap((result) => (result.finding ? [result.finding.id] : []));

    expect(similarLiftIds).not.toContain("unnecessary-throttle-lift");
    expect(similarLiftIds).not.toContain("deep-throttle-lift");
    expect(similarLiftIds).not.toContain("long-throttle-lift");
    expect(missingThrottleIds).not.toContain("unnecessary-throttle-lift");
    expect(missingThrottleIds).not.toContain("deep-throttle-lift");
    expect(missingThrottleIds).not.toContain("long-throttle-lift");
  });

  it("links throttle lift findings with existing related symptoms", () => {
    const findings = sortAndLinkFindings([
      makeFinding("early-throttle-with-lift", 74),
      makeFinding("unnecessary-throttle-lift", 72),
      makeFinding("exit-hesitation", 69),
      makeFinding("deep-throttle-lift", 67),
      makeFinding("instability-correction", 65),
      makeFinding("long-throttle-lift", 66),
      makeFinding("late-steering-unwind", 64),
    ]);

    expect(findings.find((finding) => finding.id === "early-throttle-with-lift")?.possibleEffectFindingIds).toContain("unnecessary-throttle-lift");
    expect(findings.find((finding) => finding.id === "unnecessary-throttle-lift")?.possibleEffectFindingIds).toContain("exit-hesitation");
    expect(findings.find((finding) => finding.id === "deep-throttle-lift")?.possibleEffectFindingIds).toContain("instability-correction");
    expect(findings.find((finding) => finding.id === "long-throttle-lift")?.possibleEffectFindingIds).toContain("exit-hesitation");
    expect(findings.find((finding) => finding.id === "late-steering-unwind")?.possibleEffectFindingIds).toContain("unnecessary-throttle-lift");
  });
});

describe("Phase 2 gearing rules", () => {
  it("fires wrong gear on exit when gear choice differs and exit evidence supports a cost", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            gear: [3, 3, 3, 3, 4, 4, 4],
            rpm: [5000, 5200, 5400, 5600, 5800, 6000, 6200],
            speedMs: [22, 21, 20, 21, 22, 23, 24],
            throttle: [0, 0.2, 0.6, 1, 1, 1, 1],
          },
          {
            gear: [3, 3, 4, 4, 5, 5, 5],
            rpm: [4800, 4900, 5000, 5100, 5200, 5300, 5400],
            speedMs: [22, 21, 20, 20.5, 21, 21.5, 22],
            throttle: [0, 0, 0.1, 0.4, 0.7, 1, 1],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "wrong-gear-on-exit");

    expect(finding).toEqual(
      expect.objectContaining({
        category: "gearing",
        confidence: 0.63,
        severity: "high",
      }),
    );
    expect(finding?.evidence[0]).toEqual(
      expect.objectContaining({
        label: "Exit gear",
        raw: expect.objectContaining({ exitGearDelta: expect.any(Number) }),
      }),
    );
  });

  it("fires over-revving without speed gain for higher RPM that does not improve pace", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            rpm: [5000, 5200, 5400, 5600, 5800, 6000, 6200],
            speedMs: [22, 22, 22, 22, 23, 24, 25],
          },
          {
            rpm: [6100, 6300, 6500, 6700, 6900, 7100, 7300],
            speedMs: [22, 22, 22, 22, 23, 24, 25],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "over-revving-without-speed-gain");

    expect(finding).toEqual(
      expect.objectContaining({
        id: "over-revving-without-speed-gain",
        category: "gearing",
        confidence: 0.6,
      }),
    );
    expect(finding?.evidence[0]).toEqual(
      expect.objectContaining({
        label: "RPM delta",
        raw: expect.objectContaining({ rpmDelta: expect.any(Number) }),
      }),
    );
  });

  it("fires short shift costing exit when lower RPM or taller gear weakens exit acceleration", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            gear: [3, 3, 3, 3, 3, 3, 3],
            rpm: [5400, 5600, 5800, 6000, 6200, 6400, 6600],
            speedMs: [24, 22, 20, 20, 22, 24, 27],
          },
          {
            gear: [3, 4, 4, 4, 4, 4, 4],
            rpm: [4500, 4600, 4700, 4800, 4900, 5000, 5100],
            speedMs: [24, 22, 20, 20, 20.5, 21.5, 23],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "short-shift-costing-exit");

    expect(finding).toEqual(
      expect.objectContaining({
        id: "short-shift-costing-exit",
        category: "gearing",
        confidence: 0.62,
        severity: "high",
      }),
    );
    expect(finding?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Exit RPM",
          raw: expect.objectContaining({ rpmDelta: expect.any(Number) }),
        }),
        expect.objectContaining({
          label: "Exit acceleration",
          raw: expect.objectContaining({ minSpeedToExitGainDeltaKmh: expect.any(Number) }),
        }),
      ]),
    );
  });

  it("keeps gearing rules quiet for missing data, harmless strategy differences, and matched reference strategy", () => {
    const missingIds = findingsFor(
      compareTelemetry(
        makeContext({
          referenceChannels: { gear: undefined, rpm: undefined },
          targetChannels: { gear: undefined, rpm: undefined },
        }),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);
    const harmlessIds = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            gear: [3, 3, 3, 3, 4, 4, 4],
            rpm: [5000, 5200, 5400, 5600, 5800, 6000, 6200],
            speedMs: [22, 21, 20, 21, 22, 23, 24],
          },
          {
            gear: [3, 3, 4, 4, 5, 5, 5],
            rpm: [4800, 4900, 5000, 5100, 5200, 5300, 5400],
            speedMs: [22, 21, 20, 21, 23, 24, 26],
          },
        ),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);
    const matchedStrategyIds = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            gear: [4, 4, 4, 4, 5, 5, 5],
            rpm: [6100, 6300, 6500, 6700, 6900, 7100, 7300],
          },
          {
            gear: [4, 4, 4, 4, 5, 5, 5],
            rpm: [6100, 6300, 6500, 6700, 6900, 7100, 7300],
          },
        ),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);
    const gearingIds = ["wrong-gear-on-exit", "over-revving-without-speed-gain", "short-shift-costing-exit"];

    for (const id of gearingIds) {
      expect(missingIds).not.toContain(id);
      expect(harmlessIds).not.toContain(id);
      expect(matchedStrategyIds).not.toContain(id);
    }
  });
});

describe("Phase 4 brake pressure shape", () => {
  it("computes peak location, brake area, ramp distances, ramp rates, and min-speed pressure", () => {
    const comparison = compareTelemetry(
      replaceBrakesAndSpeed(
        makeContext(),
        [0, 0.2, 1, 0.4, 0, 0, 0],
        [0, 0.1, 0.3, 0.7, 1, 0.4, 0],
        [20, 19, 18, 19, 20, 21, 22],
        [20, 19, 17, 17, 18, 20, 22],
      ),
      unsmoothedConfig,
    );

    expect(comparison.metrics.brakePressureShape).toEqual(
      expect.objectContaining({
        targetPeakBrake: expect.closeTo(1),
        referencePeakBrake: expect.closeTo(1),
        peakBrakeDistanceDeltaM: expect.closeTo(20),
        brakeAreaDelta: expect.any(Number),
        targetStartToPeakDistanceM: expect.closeTo(30),
        referenceStartToPeakDistanceM: expect.closeTo(10),
        startToPeakDistanceDeltaM: expect.closeTo(20),
        targetInitialRampRatePerM: expect.closeTo(1 / 30),
        referenceInitialRampRatePerM: expect.closeTo(0.1),
        releaseDistanceDeltaM: expect.closeTo(0),
        brakeAroundMinSpeedDelta: expect.any(Number),
      }),
    );
  });

  it("fires soft initial brake when slow pressure build costs speed or braking distance", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceBrakesAndSpeed(
          makeContext(),
          [0, 0.2, 1, 0.4, 0, 0, 0],
          [0, 0.1, 0.3, 0.7, 1, 0.4, 0],
          [20, 19, 18, 19, 20, 21, 22],
          [20, 19, 17, 17, 18, 20, 22],
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "soft-initial-brake");

    expect(finding).toEqual(
      expect.objectContaining({
        category: "braking",
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Start to peak",
            raw: expect.objectContaining({ rampDeltaM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires spiking brake pressure when abrupt pressure pairs with instability or speed loss", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            brake: [0, 0.2, 0.5, 0.8, 1, 0.4, 0],
            speedMs: [20, 19, 18, 19, 20, 21, 22],
            steeringRad: [0, 0.1, 0.2, 0.1, 0, 0, 0],
          },
          {
            brake: [0, 1, 0.6, 0.2, 0, 0, 0],
            speedMs: [20, 18, 17, 18, 20, 21, 22],
            steeringRad: [0, 0.25, 0.45, 0.25, 0, 0, 0],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "spiking-brake-pressure");

    expect(finding).toEqual(
      expect.objectContaining({
        confidence: 0.64,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Start to peak",
            raw: expect.objectContaining({ rampDeltaM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires dumping brake release when a sharp release pairs with extra steering", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceBrakesAndSteering(
          makeContext(),
          [0, 1, 0.9, 0.6, 0.3, 0.1, 0],
          [0, 1, 0, 0, 0, 0, 0],
          [0, 0.1, 0.2, 0.1, 0, 0, 0],
          [0, 0.25, 0.45, 0.25, 0, 0, 0],
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "dumping-brake-release");

    expect(finding).toEqual(
      expect.objectContaining({
        severity: "high",
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Release distance",
            raw: expect.objectContaining({ releaseDeltaM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires dragging brake when target carries extra pressure near the slowest point and delays throttle", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            brake: [0, 1, 0.2, 0, 0, 0, 0],
            throttle: [0, 0, 0.2, 0.6, 1, 1, 1],
            speedMs: [20, 19, 18, 19, 20, 21, 22],
          },
          {
            brake: [0, 1, 0.8, 0.6, 0.3, 0, 0],
            throttle: [0, 0, 0, 0, 0.2, 0.6, 1],
            speedMs: [20, 19, 17, 17, 18, 20, 22],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "dragging-brake");

    expect(finding).toEqual(
      expect.objectContaining({
        confidence: 0.66,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Brake near apex",
            raw: expect.objectContaining({ brakeAroundMinSpeedDelta: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires under-braking pressure when less pressure still gives a longer or slower entry", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceBrakesAndSpeed(
          makeContext(),
          [0, 1, 0.8, 0.3, 0, 0, 0],
          [0, 0.5, 0.5, 0.4, 0.3, 0.2, 0],
          [20, 19, 18, 19, 20, 21, 22],
          [20, 19, 17, 17, 18, 20, 22],
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "under-braking-pressure");

    expect(finding).toEqual(
      expect.objectContaining({
        confidence: 0.65,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Brake area",
            raw: expect.objectContaining({ brakeAreaDelta: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("keeps brake shape rules quiet for missing brake and unsupported low-confidence pressure differences", () => {
    const brakeShapeRuleIds = [
      "soft-initial-brake",
      "spiking-brake-pressure",
      "dumping-brake-release",
      "dragging-brake",
      "under-braking-pressure",
    ];
    const missingBrakeIds = findingsFor(
      compareTelemetry(
        makeContext({
          referenceChannels: { brake: undefined },
          targetChannels: { brake: undefined },
        }),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);
    const unsupportedPressureIds = findingsFor(
      compareTelemetry(
        replaceBrakesAndSpeed(
          makeContext(),
          [0, 0.2, 0.5, 0.8, 1, 0.4, 0],
          [0, 1, 0.6, 0.2, 0, 0, 0],
          [20, 20, 20, 20, 21, 22, 23],
          [20, 20, 20, 20, 21, 22, 23],
        ),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);

    for (const id of brakeShapeRuleIds) {
      expect(missingBrakeIds).not.toContain(id);
      expect(unsupportedPressureIds).not.toContain(id);
    }
  });

  it("links brake pressure findings with related braking, throttle, rotation, and stability symptoms", () => {
    const findings = sortAndLinkFindings([
      makeFinding("soft-initial-brake", 63),
      makeFinding("holding-brake-too-long", 70),
      makeFinding("spiking-brake-pressure", 61),
      makeFinding("instability-correction", 67),
      makeFinding("dumping-brake-release", 60),
      makeFinding("poor-rotation", 65),
      makeFinding("dragging-brake", 62),
      makeFinding("delayed-throttle-pickup", 68),
      makeFinding("under-braking-pressure", 61),
    ]);

    expect(findings.find((finding) => finding.id === "soft-initial-brake")?.possibleEffectFindingIds).toContain("holding-brake-too-long");
    expect(findings.find((finding) => finding.id === "spiking-brake-pressure")?.possibleEffectFindingIds).toContain("instability-correction");
    expect(findings.find((finding) => finding.id === "dumping-brake-release")?.possibleEffectFindingIds).toContain("poor-rotation");
    expect(findings.find((finding) => finding.id === "dragging-brake")?.possibleEffectFindingIds).toContain("delayed-throttle-pickup");
    expect(findings.find((finding) => finding.id === "under-braking-pressure")?.possibleEffectFindingIds).toContain("holding-brake-too-long");
  });
});

describe("Phase 6 transition, line, and rotation rules", () => {
  it("computes min-speed throttle timing and speed lost during coast", () => {
    const comparison = compareTelemetry(
      replaceChannels(
        makeContext(),
        {
          brake: [0, 1, 0, 0, 0, 0, 0],
          throttle: [0, 0, 0.2, 0.6, 1, 1, 1],
          speedMs: [24, 22, 20, 21, 22, 23, 24],
        },
        {
          brake: [0, 1, 0, 0, 0, 0, 0],
          throttle: [0, 0, 0, 0, 0, 0.3, 1],
          speedMs: [24, 21, 19, 18, 18, 19, 21],
        },
      ),
      unsmoothedConfig,
    );

    expect(comparison.metrics.brakeToThrottleTransition).toEqual(
      expect.objectContaining({
        coastGapDeltaM: expect.closeTo(30),
        targetMinSpeedToThrottlePickupM: expect.closeTo(20),
        targetSpeedLostDuringCoastKmh: expect.any(Number),
      }),
    );
  });

  it("fires coasting mid-corner for a longer neutral pedal gap with speed loss", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            brake: [0, 1, 0, 0, 0, 0, 0],
            throttle: [0, 0, 0.2, 0.6, 1, 1, 1],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
          },
          {
            brake: [0, 1, 0, 0, 0, 0, 0],
            throttle: [0, 0, 0, 0, 0, 0.3, 1],
            speedMs: [24, 21, 19, 18, 18, 19, 21],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "coasting-mid-corner");

    expect(finding).toEqual(
      expect.objectContaining({
        category: "throttle",
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Coast gap",
            raw: expect.objectContaining({ coastGapDeltaM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires rushed brake-to-throttle when throttle is dropped during brake overlap", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            brake: [0, 1, 0.3, 0, 0, 0, 0],
            throttle: [0, 0, 0.2, 0.6, 1, 1, 1],
            steeringRad: [0, 0.1, 0.2, 0.1, 0, 0, 0],
          },
          {
            brake: [0, 1, 0.8, 0.6, 0, 0, 0],
            throttle: [0, 0.8, 0.45, 0.2, 0.6, 1, 1],
            steeringRad: [0, 0.1, -0.1, 0.15, -0.15, 0.1, 0],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "rushed-brake-to-throttle");

    expect(finding).toEqual(
      expect.objectContaining({
        confidence: 0.68,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Throttle into braking",
            raw: expect.objectContaining({
              targetBrakeEntryThrottleOverlapM: expect.any(Number),
              targetThrottleDropWhileBraking: expect.any(Number),
            }),
          }),
        ]),
      }),
    );
  });

  it("does not fire rushed brake-to-throttle for throttle reapplication during braking", () => {
    const ids = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            brake: [0, 1, 0.8, 0.6, 0, 0, 0],
            throttle: [0, 0, 0, 0, 0.6, 1, 1],
            steeringRad: [0, 0.1, 0.2, 0.1, 0, 0, 0],
          },
          {
            brake: [0, 1, 0.8, 0.6, 0, 0, 0],
            throttle: [0, 0, 0.45, 0.7, 0.2, 1, 1],
            steeringRad: [0, 0.1, -0.1, 0.15, -0.15, 0.1, 0],
          },
        ),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);

    expect(ids).not.toContain("rushed-brake-to-throttle");
  });

  it("fires too much steering while braking when brake-phase steering load has a poor outcome", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            brake: [0, 1, 0.8, 0.2, 0, 0, 0],
            steeringRad: [0, 0.05, 0.1, 0.08, 0, 0, 0],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
          },
          {
            brake: [0, 1, 0.8, 0.4, 0, 0, 0],
            steeringRad: [0, 0.25, 0.45, 0.35, 0, 0, 0],
            speedMs: [24, 21, 18, 19, 20, 21, 23],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "too-much-steering-while-braking");

    expect(finding).toEqual(
      expect.objectContaining({
        category: "steering",
        confidence: 0.68,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Steering while braking",
            raw: expect.objectContaining({ peakSteeringWhileBrakingDeltaDeg: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires throttle before steering unwind when early throttle is followed by exit cost", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            throttle: [0, 0, 0, 0, 0.4, 1, 1],
            steeringRad: [0, 0.4, 0.2, 0.05, 0, 0, 0],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
          },
          {
            throttle: [0, 0.4, 0.1, 0.6, 1, 1, 1],
            steeringRad: [0, 0.4, 0.35, 0.3, 0.22, 0.1, 0],
            speedMs: [24, 22, 20, 20, 20, 21, 22],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "throttle-before-steering-unwind");

    expect(finding).toEqual(
      expect.objectContaining({
        category: "throttle",
        confidence: 0.7,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Throttle before unwind",
            raw: expect.objectContaining({ firstThrottleDeltaM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires throttle reapplied while braking only for throttle rising after brake is active", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            brake: [0, 1, 0.8, 0.4, 0, 0, 0],
            throttle: [0, 0, 0, 0, 0.6, 1, 1],
            steeringRad: [0, 0.1, 0.2, 0.1, 0, 0, 0],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
          },
          {
            brake: [0, 1, 0.8, 0.6, 0, 0, 0],
            throttle: [0, 0, 0.45, 0.7, 0.2, 1, 1],
            steeringRad: [0, 0.1, -0.1, 0.15, -0.15, 0.1, 0],
            speedMs: [24, 22, 20, 20, 20, 21, 22],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "throttle-reapplied-while-braking");

    expect(finding).toEqual(
      expect.objectContaining({
        category: "throttle",
        confidence: 0.69,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Throttle rise while braking",
            raw: expect.objectContaining({
              throttleRise: expect.any(Number),
              throttleRiseWhileBrakingDelta: expect.any(Number),
            }),
          }),
          expect.objectContaining({
            label: "Brake during rise",
            raw: expect.objectContaining({ peakBrake: expect.any(Number) }),
          }),
          expect.objectContaining({
            label: "Overlap distance",
            raw: expect.objectContaining({ overlapDistanceM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("does not fire throttle reapplied while braking for throttle carried into brake entry and dropped", () => {
    const ids = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            brake: [0, 1, 0.3, 0, 0, 0, 0],
            throttle: [0, 0, 0.2, 0.6, 1, 1, 1],
            steeringRad: [0, 0.1, 0.2, 0.1, 0, 0, 0],
          },
          {
            brake: [0, 1, 0.8, 0.6, 0, 0, 0],
            throttle: [0, 0.8, 0.45, 0.2, 0.6, 1, 1],
            steeringRad: [0, 0.1, -0.1, 0.15, -0.15, 0.1, 0],
          },
        ),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);

    expect(ids).toContain("rushed-brake-to-throttle");
    expect(ids).not.toContain("throttle-reapplied-while-braking");
  });

  it("keeps coordination rules quiet when overlap exists without a bad outcome", () => {
    const ids = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            brake: [0, 1, 0.8, 0.4, 0, 0, 0],
            throttle: [0, 0, 0, 0, 0.6, 1, 1],
            steeringRad: [0, 0.2, 0.25, 0.2, 0.05, 0, 0],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
          },
          {
            brake: [0, 1, 0.8, 0.4, 0, 0, 0],
            throttle: [0, 0, 0.25, 0.45, 0.6, 1, 1],
            steeringRad: [0, 0.22, 0.27, 0.22, 0.05, 0, 0],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
          },
        ),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);

    expect(ids).not.toContain("too-much-steering-while-braking");
    expect(ids).not.toContain("throttle-before-steering-unwind");
    expect(ids).not.toContain("throttle-reapplied-while-braking");
  });

  it("fires unused entry width for a left-hand corner when target starts inside and loses speed", () => {
    const referencePath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 0, 0, 0]);
    const targetPath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [2, 2, 1, 0, 0, 0, 0]);
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            latitude: referencePath.latitude,
            longitude: referencePath.longitude,
            headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
          },
          {
            latitude: targetPath.latitude,
            longitude: targetPath.longitude,
            headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
            speedMs: [24, 21, 18, 19, 20, 21, 23],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "unused-track-on-entry-relative-to-reference");

    expect(finding).toEqual(
      expect.objectContaining({
        category: "line",
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Entry offset",
            raw: expect.objectContaining({ lateralOffsetM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires missed apex for a right-hand corner with opposite lateral signs", () => {
    const referencePath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 0, 0, 0]);
    const targetPath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 1, 2, 1, 0, 0]);
    const comparison = compareTelemetry(
      replaceChannels(
        makeContext(),
        {
          latitude: referencePath.latitude,
          longitude: referencePath.longitude,
          headingRad: [0, -0.02, -0.04, -0.06, -0.08, -0.1, -0.12],
          speedMs: [24, 22, 20, 21, 22, 23, 24],
        },
        {
          latitude: targetPath.latitude,
          longitude: targetPath.longitude,
          headingRad: [0, -0.02, -0.04, -0.06, -0.08, -0.1, -0.12],
          speedMs: [24, 21, 18, 19, 20, 21, 23],
        },
      ),
      unsmoothedConfig,
    );
    const finding = findingsFor(comparison).find((candidate) => candidate.id === "missed-apex-relative-to-reference");

    expect(comparison.metrics.lineUsage?.cornerDirection).toBe("right");
    expect(finding).toEqual(
      expect.objectContaining({
        confidence: 0.67,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Apex offset",
            raw: expect.objectContaining({ lateralOffsetM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires pinched exit when target stays inside and delays exit speed or full throttle", () => {
    const referencePath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 0, 0, 0]);
    const targetPath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 1, 2, 2]);
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            latitude: referencePath.latitude,
            longitude: referencePath.longitude,
            headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
            throttle: [0, 0, 0.2, 0.6, 1, 1, 1],
          },
          {
            latitude: targetPath.latitude,
            longitude: targetPath.longitude,
            headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
            speedMs: [24, 22, 20, 20, 21, 21, 22],
            throttle: [0, 0, 0.1, 0.2, 0.5, 0.8, 1],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "pinched-exit-relative-to-reference");

    expect(finding).toEqual(
      expect.objectContaining({
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Exit offset",
            raw: expect.objectContaining({ lateralOffsetM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires wide without benefit when a wider apex path does not gain speed", () => {
    const referencePath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 0, 0, 0]);
    const targetPath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, -1, -2, -1, 0, 0]);
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            latitude: referencePath.latitude,
            longitude: referencePath.longitude,
            headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
          },
          {
            latitude: targetPath.latitude,
            longitude: targetPath.longitude,
            headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
            speedMs: [24, 21, 18, 19, 20, 21, 22],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "wide-without-benefit");

    expect(finding).toEqual(
      expect.objectContaining({
        confidence: 0.61,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Apex offset",
            raw: expect.objectContaining({ lateralOffsetM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires under-rotated at apex when heading and steering support unfinished rotation", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            headingRad: [0, 0.03, 0.06, 0.1, 0.13, 0.16, 0.2],
            steeringRad: [0, 0.1, 0.2, 0.1, 0, 0, 0],
            speedMs: [24, 22, 20, 18, 20, 22, 24],
          },
          {
            headingRad: [0, 0.01, 0.02, 0.03, 0.05, 0.08, 0.11],
            steeringRad: [0, 0.25, 0.45, 0.25, 0, 0, 0],
            speedMs: [24, 22, 20, 18, 20, 22, 24],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "under-rotated-at-apex");

    expect(finding).toEqual(
      expect.objectContaining({
        category: "rotation",
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Apex rotation",
            raw: expect.objectContaining({ headingDeltaDeg: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires late apex when apex evidence arrives later and exit suffers", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            speedMs: [24, 22, 18, 20, 22, 23, 24],
            headingRad: [0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.18],
          },
          {
            speedMs: [24, 23, 22, 20, 17, 20, 22],
            headingRad: [0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.18],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "late-apex");

    expect(finding).toEqual(
      expect.objectContaining({
        category: "line",
        confidence: 0.64,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Apex timing",
            raw: expect.objectContaining({ apexDistanceDeltaM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires early apex pinched exit when apex evidence arrives early and exit stays tight", () => {
    const referencePath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 0, 0, 0]);
    const targetPath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 1, 2, 2]);
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            latitude: referencePath.latitude,
            longitude: referencePath.longitude,
            speedMs: [24, 23, 22, 18, 20, 22, 24],
            headingRad: [0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.18],
          },
          {
            latitude: targetPath.latitude,
            longitude: targetPath.longitude,
            speedMs: [24, 17, 20, 21, 21, 21, 21],
            headingRad: [0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.18],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "early-apex-pinched-exit");

    expect(finding).toEqual(
      expect.objectContaining({
        category: "line",
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Apex timing",
            raw: expect.objectContaining({ apexDistanceDeltaM: expect.any(Number) }),
          }),
          expect.objectContaining({
            label: "Exit offset",
            raw: expect.objectContaining({ lateralOffsetM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires delayed rotation when comparable heading arrives later without relying on under-rotation", () => {
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            headingRad: [0, 0.05, 0.1, 0.15, 0.18, 0.2, 0.22],
            steeringRad: [0, 0.3, 0.1, 0, 0, 0, 0],
            speedMs: [24, 22, 20, 18, 20, 22, 24],
          },
          {
            headingRad: [0, 0.01, 0.03, 0.06, 0.12, 0.18, 0.22],
            steeringRad: [0, 0.3, 0.25, 0.2, 0.15, 0.05, 0],
            speedMs: [24, 22, 20, 18, 20, 21, 22],
          },
        ),
        unsmoothedConfig,
      ),
    );
    const ids = finding.map((candidate) => candidate.id);
    const delayed = finding.find((candidate) => candidate.id === "delayed-rotation");

    expect(ids).not.toContain("under-rotated-at-apex");
    expect(delayed).toEqual(
      expect.objectContaining({
        category: "rotation",
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Rotation timing",
            raw: expect.objectContaining({ rotationTimingDeltaM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires minimum-speed timing for early over-slowing and late corner drag", () => {
    const early = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          { speedMs: [24, 23, 22, 18, 20, 22, 24] },
          { speedMs: [24, 17, 20, 21, 22, 23, 24] },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "minimum-speed-too-early-or-late");
    const late = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          { speedMs: [24, 22, 18, 20, 22, 24, 26] },
          { speedMs: [24, 23, 22, 20, 17, 19, 21] },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "minimum-speed-too-early-or-late");

    expect(early).toEqual(
      expect.objectContaining({
        title: "Avoid reaching minimum speed too early",
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Minimum-speed location",
            raw: expect.objectContaining({ minSpeedDistanceDeltaM: expect.any(Number) }),
          }),
        ]),
      }),
    );
    expect(late).toEqual(
      expect.objectContaining({
        title: "Finish the slowest point sooner",
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Minimum-speed location",
            raw: expect.objectContaining({ minSpeedDistanceDeltaM: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("fires path deviation hotspot when a GPS line difference has speed cost", () => {
    const referencePath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 0, 0, 0]);
    const targetPath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 1, 3, 3, 2, 2]);
    const finding = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            latitude: referencePath.latitude,
            longitude: referencePath.longitude,
            headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
          },
          {
            latitude: targetPath.latitude,
            longitude: targetPath.longitude,
            headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
            speedMs: [24, 21, 18, 19, 20, 21, 22],
          },
        ),
        unsmoothedConfig,
      ),
    ).find((candidate) => candidate.id === "path-deviation-hotspot");

    expect(finding).toEqual(
      expect.objectContaining({
        category: "line",
        confidence: 0.6,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Path delta",
            raw: expect.objectContaining({
              maxPathDeltaM: expect.any(Number),
              maxPathDeltaDistancePct: expect.any(Number),
            }),
          }),
        ]),
      }),
    );
  });

  it("keeps path deviation quiet for missing GPS, ambiguous corners, and harmless alternate lines", () => {
    const referencePath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 0, 0, 0, 0, 0]);
    const targetPath = localPathToLatLon([0, 10, 20, 30, 40, 50, 60], [0, 0, 1, 3, 3, 2, 2]);
    const missingGpsIds = findingsFor(
      compareTelemetry(
        makeContext({
          referenceChannels: { latitude: undefined, longitude: undefined },
          targetChannels: { latitude: undefined, longitude: undefined },
        }),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);
    const ambiguousIds = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            latitude: referencePath.latitude,
            longitude: referencePath.longitude,
            headingRad: [0, 0, 0, 0, 0, 0, 0],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
          },
          {
            latitude: targetPath.latitude,
            longitude: targetPath.longitude,
            headingRad: [0, 0, 0, 0, 0, 0, 0],
            speedMs: [24, 21, 18, 19, 20, 21, 22],
          },
        ),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);
    const harmlessIds = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          {
            latitude: referencePath.latitude,
            longitude: referencePath.longitude,
            headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
            speedMs: [24, 22, 20, 21, 22, 23, 24],
          },
          {
            latitude: targetPath.latitude,
            longitude: targetPath.longitude,
            headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
            speedMs: [24, 22, 20, 21, 23, 24, 25],
          },
        ),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);

    expect(missingGpsIds).not.toContain("path-deviation-hotspot");
    expect(ambiguousIds).not.toContain("path-deviation-hotspot");
    expect(harmlessIds).not.toContain("path-deviation-hotspot");
  });

  it("fires exit acceleration deficit when minimum speed is similar but exit build is worse", () => {
    const comparison = compareTelemetry(
      replaceChannels(
        makeContext(),
        { speedMs: [24, 22, 20, 21, 23, 25, 27] },
        { speedMs: [24, 22, 20.2, 20.5, 21, 22, 23] },
      ),
      unsmoothedConfig,
    );
    const finding = findingsFor(comparison).find((candidate) => candidate.id === "exit-acceleration-deficit");

    expect(Math.abs(comparison.metrics.speed?.minSpeedDeltaKmh ?? 99)).toBeLessThan(defaultAnalysisConfig.thresholds.minSpeedDeltaKmh);
    expect(finding).toEqual(
      expect.objectContaining({
        category: "throttle",
        confidence: 0.71,
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: "Exit acceleration",
            raw: expect.objectContaining({ accelerationDeltaKmh: expect.any(Number) }),
          }),
        ]),
      }),
    );
  });

  it("keeps exit acceleration quiet without speed data", () => {
    const ids = findingsFor(
      compareTelemetry(
        makeContext({
          referenceChannels: { speedMs: undefined },
          targetChannels: { speedMs: undefined },
        }),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);

    expect(ids).not.toContain("exit-acceleration-deficit");
  });

  it("keeps direction-dependent line rules quiet for straight or missing GPS slices", () => {
    const straightIds = findingsFor(
      compareTelemetry(
        replaceChannels(
          makeContext(),
          { headingRad: [0, 0, 0, 0, 0, 0, 0] },
          {
            headingRad: [0, 0, 0, 0, 0, 0, 0],
            latitude: [1, 1.00001, 1.00002, 1.00003, 1.00004, 1.00005, 1.00006],
            longitude: [2.00002, 2.00002, 2.00002, 2.00002, 2.00002, 2.00002, 2.00002],
            speedMs: [24, 21, 18, 19, 20, 21, 22],
          },
        ),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);
    const missingGpsIds = findingsFor(
      compareTelemetry(
        makeContext({
          referenceChannels: { latitude: undefined, longitude: undefined },
          targetChannels: { latitude: undefined, longitude: undefined },
        }),
        unsmoothedConfig,
      ),
    ).map((finding) => finding.id);
    const lineRuleIds = [
      "unused-track-on-entry-relative-to-reference",
      "missed-apex-relative-to-reference",
      "late-apex",
      "early-apex-pinched-exit",
      "pinched-exit-relative-to-reference",
      "path-deviation-hotspot",
      "wide-without-benefit",
    ];

    for (const id of lineRuleIds) {
      expect(straightIds).not.toContain(id);
      expect(missingGpsIds).not.toContain(id);
    }
  });

  it("links transition, line, and rotation findings with related symptoms", () => {
    const findings = sortAndLinkFindings([
      makeFinding("coasting-mid-corner", 71),
      makeFinding("delayed-throttle-pickup", 68),
      makeFinding("rushed-brake-to-throttle", 70),
      makeFinding("early-throttle-with-lift", 74),
      makeFinding("unused-track-on-entry-relative-to-reference", 64),
      makeFinding("over-slowing-entry", 80),
      makeFinding("missed-apex-relative-to-reference", 67),
      makeFinding("late-apex", 66),
      makeFinding("early-apex-pinched-exit", 66),
      makeFinding("late-steering-unwind", 66),
      makeFinding("poor-rotation", 65),
      makeFinding("pinched-exit-relative-to-reference", 66),
      makeFinding("path-deviation-hotspot", 62),
      makeFinding("exit-hesitation", 69),
      makeFinding("under-rotated-at-apex", 65),
      makeFinding("delayed-rotation", 65),
      makeFinding("minimum-speed-too-early-or-late", 64),
      makeFinding("excessive-steering", 66),
      makeFinding("too-much-steering-while-braking", 67),
      makeFinding("throttle-before-steering-unwind", 73),
      makeFinding("throttle-reapplied-while-braking", 72),
      makeFinding("exit-acceleration-deficit", 67),
      makeFinding("dumping-brake-release", 60),
      makeFinding("instability-correction", 70),
      makeFinding("wrong-gear-on-exit", 63),
      makeFinding("over-revving-without-speed-gain", 62),
      makeFinding("short-shift-costing-exit", 62),
    ]);

    expect(findings.find((finding) => finding.id === "coasting-mid-corner")?.possibleEffectFindingIds).toContain("delayed-throttle-pickup");
    expect(findings.find((finding) => finding.id === "rushed-brake-to-throttle")?.possibleEffectFindingIds).toContain("early-throttle-with-lift");
    expect(findings.find((finding) => finding.id === "unused-track-on-entry-relative-to-reference")?.possibleEffectFindingIds).toContain("over-slowing-entry");
    expect(findings.find((finding) => finding.id === "missed-apex-relative-to-reference")?.possibleEffectFindingIds).toContain("poor-rotation");
    expect(findings.find((finding) => finding.id === "late-apex")?.possibleEffectFindingIds).toContain("missed-apex-relative-to-reference");
    expect(findings.find((finding) => finding.id === "early-apex-pinched-exit")?.possibleEffectFindingIds).toContain("pinched-exit-relative-to-reference");
    expect(findings.find((finding) => finding.id === "pinched-exit-relative-to-reference")?.possibleEffectFindingIds).toContain("exit-hesitation");
    expect(findings.find((finding) => finding.id === "path-deviation-hotspot")?.possibleEffectFindingIds).toContain("pinched-exit-relative-to-reference");
    expect(findings.find((finding) => finding.id === "path-deviation-hotspot")?.possibleEffectFindingIds).toContain("late-steering-unwind");
    expect(findings.find((finding) => finding.id === "under-rotated-at-apex")?.possibleEffectFindingIds).toContain("excessive-steering");
    expect(findings.find((finding) => finding.id === "delayed-rotation")?.possibleEffectFindingIds).toContain("under-rotated-at-apex");
    expect(findings.find((finding) => finding.id === "minimum-speed-too-early-or-late")?.possibleEffectFindingIds).toContain("over-slowing-entry");
    expect(findings.find((finding) => finding.id === "too-much-steering-while-braking")?.possibleEffectFindingIds).toContain("instability-correction");
    expect(findings.find((finding) => finding.id === "throttle-before-steering-unwind")?.possibleEffectFindingIds).toContain("early-throttle-with-lift");
    expect(findings.find((finding) => finding.id === "throttle-reapplied-while-braking")?.possibleEffectFindingIds).toContain("instability-correction");
    expect(findings.find((finding) => finding.id === "throttle-reapplied-while-braking")?.possibleEffectFindingIds).toContain("dumping-brake-release");
    expect(findings.find((finding) => finding.id === "exit-acceleration-deficit")?.possibleEffectFindingIds).toContain("exit-hesitation");
    expect(findings.find((finding) => finding.id === "wrong-gear-on-exit")?.possibleEffectFindingIds).toContain("exit-acceleration-deficit");
    expect(findings.find((finding) => finding.id === "over-revving-without-speed-gain")?.possibleEffectFindingIds).toContain("exit-hesitation");
    expect(findings.find((finding) => finding.id === "over-revving-without-speed-gain")?.possibleEffectFindingIds).toContain("exit-acceleration-deficit");
    expect(findings.find((finding) => finding.id === "short-shift-costing-exit")?.possibleEffectFindingIds).toContain("exit-acceleration-deficit");
  });
});

describe("Phase 1 deterministic rules", () => {
  // This table is the baseline inventory for the currently registered rule set.
  // The 20 m synthetic distance cases intentionally document current threshold
  // behavior, including tiny floating-point overages that classify as "high".
  const ruleCases: Array<{
    id: string;
    category: CoachingFinding["category"];
    severity: CoachingFinding["severity"];
    confidence: number;
    primaryEvidenceLabel: string;
    primaryRawKey: string;
    mutate: (context: ComparisonContext) => ComparisonContext;
  }> = [
    { id: "braking-too-early", category: "braking", severity: "high", confidence: 0.82, primaryEvidenceLabel: "Brake start", primaryRawKey: "deltaM", mutate: (context: ComparisonContext) => replaceBrakes(context, [0, 0, 0, 1, 0.5, 0, 0], [0, 1, 0.8, 0.1, 0, 0, 0]) },
    { id: "braking-too-late", category: "braking", severity: "high", confidence: 0.8, primaryEvidenceLabel: "Brake start", primaryRawKey: "deltaM", mutate: (context: ComparisonContext) => replaceBrakes(context, [0, 1, 0.5, 0, 0, 0, 0], [0, 0, 0, 1, 0.4, 0, 0]) },
    { id: "holding-brake-too-long", category: "braking", severity: "medium", confidence: 0.78, primaryEvidenceLabel: "Brake duration", primaryRawKey: "deltaM", mutate: (context: ComparisonContext) => replaceBrakes(context, [0, 1, 0, 0, 0, 0, 0], [0, 1, 0.8, 0.4, 0, 0, 0]) },
    { id: "over-slowing-entry", category: "braking", severity: "high", confidence: 0.86, primaryEvidenceLabel: "Minimum speed", primaryRawKey: "deltaKmh", mutate: (context: ComparisonContext) => replaceSpeed(context, [20, 20, 19, 20, 21, 22, 23], [20, 18, 17, 19, 21, 22, 23]) },
    { id: "insufficient-trail-braking", category: "braking", severity: "medium", confidence: 0.68, primaryEvidenceLabel: "Brake release", primaryRawKey: "deltaM", mutate: (context: ComparisonContext) =>
      replaceBrakesAndSpeed(context, [0, 1, 0.9, 0.4, 0, 0, 0], [0, 1, 0.1, 0, 0, 0, 0], [20, 19, 18, 19, 20, 21, 22], [20, 19, 18.5, 19.5, 20, 21, 22]) },
    { id: "delayed-throttle-pickup", category: "throttle", severity: "high", confidence: 0.78, primaryEvidenceLabel: "First throttle", primaryRawKey: "deltaM", mutate: (context: ComparisonContext) => replaceThrottle(context, [0, 0.2, 0.6, 1, 1, 1, 1], [0, 0, 0, 0.2, 0.6, 1, 1]) },
    { id: "early-throttle-with-lift", category: "throttle", severity: "medium", confidence: 0.77, primaryEvidenceLabel: "First throttle", primaryRawKey: "deltaM", mutate: (context: ComparisonContext) => replaceThrottle(context, [0, 0, 0, 0.5, 1, 1, 1], [0, 0.3, 0.1, 0.6, 1, 1, 1]) },
    { id: "exit-hesitation", category: "throttle", severity: "high", confidence: 0.76, primaryEvidenceLabel: "Exit speed", primaryRawKey: "deltaKmh", mutate: (context: ComparisonContext) =>
      replaceSpeedAndThrottle(context, [20, 20, 20, 20, 21, 22, 23], [20, 20, 20, 20, 20, 20, 21], [0, 0.2, 0.6, 1, 1, 1, 1], [0, 0, 0, 0.1, 0.4, 0.7, 0.8]) },
    { id: "throttle-before-steering-unwind", category: "throttle", severity: "high", confidence: 0.7, primaryEvidenceLabel: "Throttle before unwind", primaryRawKey: "firstThrottleDeltaM", mutate: (context: ComparisonContext) =>
      replaceChannels(context, { throttle: [0, 0, 0, 0, 0.4, 1, 1], steeringRad: [0, 0.4, 0.2, 0.05, 0, 0, 0], speedMs: [24, 22, 20, 21, 22, 23, 24] }, { throttle: [0, 0.4, 0.1, 0.6, 1, 1, 1], steeringRad: [0, 0.4, 0.35, 0.3, 0.22, 0.1, 0], speedMs: [24, 22, 20, 20, 20, 21, 22] }) },
    { id: "throttle-reapplied-while-braking", category: "throttle", severity: "high", confidence: 0.69, primaryEvidenceLabel: "Throttle rise while braking", primaryRawKey: "throttleRise", mutate: (context: ComparisonContext) =>
      replaceChannels(context, { brake: [0, 1, 0.8, 0.4, 0, 0, 0], throttle: [0, 0, 0, 0, 0.6, 1, 1], steeringRad: [0, 0.1, 0.2, 0.1, 0, 0, 0], speedMs: [24, 22, 20, 21, 22, 23, 24] }, { brake: [0, 1, 0.8, 0.6, 0, 0, 0], throttle: [0, 0, 0.45, 0.7, 0.2, 1, 1], steeringRad: [0, 0.1, -0.1, 0.15, -0.15, 0.1, 0], speedMs: [24, 22, 20, 20, 20, 21, 22] }) },
    { id: "excessive-steering", category: "steering", severity: "medium", confidence: 0.74, primaryEvidenceLabel: "Peak steering", primaryRawKey: "deltaDeg", mutate: (context: ComparisonContext) => replaceSteering(context, [0, 0.1, 0.2, 0.1, 0, 0, 0], [0, 0.25, 0.45, 0.25, 0, 0, 0]) },
    { id: "too-much-steering-while-braking", category: "steering", severity: "high", confidence: 0.68, primaryEvidenceLabel: "Steering while braking", primaryRawKey: "peakSteeringWhileBrakingDeltaDeg", mutate: (context: ComparisonContext) =>
      replaceChannels(context, { brake: [0, 1, 0.8, 0.2, 0, 0, 0], steeringRad: [0, 0.05, 0.1, 0.08, 0, 0, 0], speedMs: [24, 22, 20, 21, 22, 23, 24] }, { brake: [0, 1, 0.8, 0.4, 0, 0, 0], steeringRad: [0, 0.25, 0.45, 0.35, 0, 0, 0], speedMs: [24, 21, 18, 19, 20, 21, 23] }) },
    { id: "late-steering-unwind", category: "steering", severity: "high", confidence: 0.72, primaryEvidenceLabel: "Steering unwind", primaryRawKey: "deltaM", mutate: (context: ComparisonContext) => replaceSteering(context, [0, 0.3, 0.1, 0, 0, 0, 0], [0, 0.3, 0.25, 0.2, 0.15, 0.05, 0]) },
    { id: "poor-rotation", category: "rotation", severity: "medium", confidence: 0.66, primaryEvidenceLabel: "Peak steering", primaryRawKey: "deltaDeg", mutate: (context: ComparisonContext) =>
      replaceBrakesAndSteering(context, [0, 1, 0.8, 0.4, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0], [0, 0.1, 0.2, 0.1, 0, 0, 0], [0, 0.25, 0.45, 0.25, 0, 0, 0]) },
    { id: "over-driving-entry", category: "line", severity: "high", confidence: 0.75, primaryEvidenceLabel: "Entry speed", primaryRawKey: "deltaKmh", mutate: (context: ComparisonContext) => replaceSpeed(context, [20, 20, 19, 20, 21, 22, 23], [22, 21, 17, 19, 21, 22, 23]) },
    { id: "instability-correction", category: "stability", severity: "high", confidence: 0.7, primaryEvidenceLabel: "Extra corrections", primaryRawKey: "targetCorrections", mutate: (context: ComparisonContext) => replaceSteering(context, [0, 0.1, 0.2, 0.15, 0.1, 0.05, 0], [0, 0.1, -0.1, 0.15, -0.15, 0.1, 0]) },
  ];

  it.each(ruleCases)("fires %s with stable metadata and stays quiet for the baseline", ({ id, category, severity, confidence, primaryEvidenceLabel, primaryRawKey, mutate }) => {
    const quietResults = runDeterministicRules(compareTelemetry(makeContext(), unsmoothedConfig));
    expect(quietResults.find((result) => result.finding?.id === id)).toBeUndefined();

    const results = runDeterministicRules(compareTelemetry(mutate(makeContext()), unsmoothedConfig));
    const finding = results.find((result) => result.finding?.id === id)?.finding;

    expect(finding).toEqual(
      expect.objectContaining({
        id,
        category,
        severity,
        confidence,
      }),
    );
    expect(finding?.evidence[0]).toEqual(
      expect.objectContaining({
        label: primaryEvidenceLabel,
        importance: "primary",
        raw: expect.objectContaining({ [primaryRawKey]: expect.any(Number) }),
      }),
    );
  });

  it("sorts findings stably and adds cause/effect links", () => {
    const findings = sortAndLinkFindings([
      makeFinding("over-slowing-entry", 80),
      makeFinding("over-driving-entry", 78),
      makeFinding("delayed-throttle-pickup", 68),
      makeFinding("holding-brake-too-long", 70),
    ]);

    expect(findings.map((finding) => finding.id)).toEqual([
      "over-slowing-entry",
      "over-driving-entry",
      "holding-brake-too-long",
      "delayed-throttle-pickup",
    ]);
    expect(findings.find((finding) => finding.id === "over-slowing-entry")?.possibleCauseFindingIds).toContain("over-driving-entry");
    expect(findings.find((finding) => finding.id === "holding-brake-too-long")?.possibleEffectFindingIds).toContain("delayed-throttle-pickup");
  });
});

function makeContext(
  options: {
    referenceChannels?: Partial<TelemetryChannelsInput>;
    targetChannels?: Partial<TelemetryChannelsInput>;
  } = {},
): ComparisonContext {
  const distancePct = [0.1, 0.102, 0.104, 0.106, 0.108, 0.11, 0.112];
  const referenceChannels = {
    speedMs: [20, 20, 20, 20, 21, 22, 23],
    brake: [0, 1, 0.7, 0, 0, 0, 0],
    throttle: [0, 0, 0.2, 0.6, 1, 1, 1],
    steeringRad: [0, 0.1, 0.2, 0.1, 0, 0, 0],
    gear: [3, 3, 3, 3, 4, 4, 4],
    rpm: [5000, 5200, 5400, 5600, 5800, 6000, 6200],
    latitude: [1, 1.00001, 1.00002, 1.00003, 1.00004, 1.00005, 1.00006],
    longitude: [2, 2, 2, 2, 2, 2, 2],
    headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
    ...options.referenceChannels,
  };
  const targetChannels = {
    speedMs: [20, 20, 20, 20, 21, 22, 23],
    brake: [0, 1, 0.7, 0, 0, 0, 0],
    throttle: [0, 0, 0.2, 0.1, 1, 1, 1],
    steeringRad: [0, 0.1, 0.2, 0.1, 0, 0, 0],
    gear: [3, 3, 3, 3, 4, 4, 4],
    rpm: [5100, 5300, 5500, 5700, 5900, 6100, 6300],
    latitude: [1, 1.00001, 1.00002, 1.00003, 1.00005, 1.00006, 1.00007],
    longitude: [2, 2, 2, 2, 2, 2, 2],
    headingRad: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12],
    ...options.targetChannels,
  };

  return {
    analysis: makeAnalysis(),
    roles: {
      referenceLapId: "reference",
      targetLapId: "target",
    },
    slice: makeSlice(0.1, 0.112),
    reference: makeTelemetry("reference", distancePct, referenceChannels),
    target: makeTelemetry("target", distancePct, targetChannels),
  };
}

function makeShortContext(): ComparisonContext {
  const distancePct = [0.1, 0.103, 0.106];
  const channels = {
    speedMs: [20, 20, 20],
    brake: [0, 0, 0],
    throttle: [0, 0, 0],
    steeringRad: [0, 0, 0],
    gear: [3, 3, 3],
    rpm: [5000, 5000, 5000],
    latitude: [1, 1.00001, 1.00002],
    longitude: [2, 2, 2],
    headingRad: [0, 0, 0],
  };

  return {
    analysis: makeAnalysis(),
    roles: {
      referenceLapId: "reference",
      targetLapId: "target",
    },
    slice: makeSlice(0.1, 0.106),
    reference: makeTelemetry("reference", distancePct, channels),
    target: makeTelemetry("target", distancePct, channels),
  };
}

function replaceBrakes(context: ComparisonContext, reference: number[], target: number[]): ComparisonContext {
  return replaceChannels(context, { brake: reference }, { brake: target });
}

function replaceSpeed(context: ComparisonContext, reference: number[], target: number[]): ComparisonContext {
  return replaceChannels(context, { speedMs: reference }, { speedMs: target });
}

function replaceThrottle(context: ComparisonContext, reference: number[], target: number[]): ComparisonContext {
  return replaceChannels(context, { throttle: reference }, { throttle: target });
}

function replaceSteering(context: ComparisonContext, reference: number[], target: number[]): ComparisonContext {
  return replaceChannels(context, { steeringRad: reference }, { steeringRad: target });
}

function replaceBrakesAndSpeed(
  context: ComparisonContext,
  referenceBrake: number[],
  targetBrake: number[],
  referenceSpeed: number[],
  targetSpeed: number[],
): ComparisonContext {
  return replaceChannels(context, { brake: referenceBrake, speedMs: referenceSpeed }, { brake: targetBrake, speedMs: targetSpeed });
}

function replaceSpeedAndThrottle(
  context: ComparisonContext,
  referenceSpeed: number[],
  targetSpeed: number[],
  referenceThrottle: number[],
  targetThrottle: number[],
): ComparisonContext {
  return replaceChannels(context, { speedMs: referenceSpeed, throttle: referenceThrottle }, { speedMs: targetSpeed, throttle: targetThrottle });
}

function replaceBrakesAndSteering(
  context: ComparisonContext,
  referenceBrake: number[],
  targetBrake: number[],
  referenceSteering: number[],
  targetSteering: number[],
): ComparisonContext {
  return replaceChannels(context, { brake: referenceBrake, steeringRad: referenceSteering }, { brake: targetBrake, steeringRad: targetSteering });
}

function findingsFor(comparison: ReturnType<typeof compareTelemetry>): CoachingFinding[] {
  return runDeterministicRules(comparison).flatMap((result) => (result.finding ? [result.finding] : []));
}

function replaceChannels(
  context: ComparisonContext,
  reference: Partial<TelemetryChannelsInput>,
  target: Partial<TelemetryChannelsInput>,
): ComparisonContext {
  return makeContext({
    referenceChannels: { ...contextToInput(context.reference), ...reference },
    targetChannels: { ...contextToInput(context.target), ...target },
  });
}

function contextToInput(telemetry: LapTelemetry): Partial<TelemetryChannelsInput> {
  return {
    speedMs: telemetry.channels.speedMs ? Array.from(telemetry.channels.speedMs) : undefined,
    brake: telemetry.channels.brake ? Array.from(telemetry.channels.brake) : undefined,
    throttle: telemetry.channels.throttle ? Array.from(telemetry.channels.throttle) : undefined,
    steeringRad: telemetry.channels.steeringRad ? Array.from(telemetry.channels.steeringRad) : undefined,
    gear: telemetry.channels.gear ? Array.from(telemetry.channels.gear) : undefined,
    rpm: telemetry.channels.rpm ? Array.from(telemetry.channels.rpm) : undefined,
    latitude: telemetry.channels.latitude ? Array.from(telemetry.channels.latitude) : undefined,
    longitude: telemetry.channels.longitude ? Array.from(telemetry.channels.longitude) : undefined,
    headingRad: telemetry.channels.headingRad ? Array.from(telemetry.channels.headingRad) : undefined,
  };
}

function makeSlice(startDistancePct: number, endDistancePct: number): DistanceSlice {
  return { startDistancePct, endDistancePct };
}

function makeAnalysis(): AnalysisMetadata {
  return {
    id: "analysis",
    type: "laps",
    car: { id: 145, name: "Toyota GR86" },
    track: { id: 67, name: "Interlagos", lapLengthM: 5000 },
    laps: [
      {
        id: "reference",
        driver: { name: "reference" },
        lapTimeSec: 100,
        canViewTelemetry: true,
        haveSamples: true,
      },
      {
        id: "target",
        driver: { name: "target" },
        lapTimeSec: 101,
        canViewTelemetry: true,
        haveSamples: true,
      },
    ],
  };
}

interface TelemetryChannelsInput {
  speedMs: number[];
  brake: number[];
  throttle: number[];
  steeringRad: number[];
  gear: number[];
  rpm: number[];
  latitude: number[];
  longitude: number[];
  headingRad: number[];
}

function makeTelemetry(
  lapId: string,
  distancePct: number[],
  channels: Partial<TelemetryChannelsInput>,
): LapTelemetry {
  return {
    lapId,
    sampleCount: distancePct.length,
    channels: {
      distancePct: Float64Array.from(distancePct),
      speedMs: channels.speedMs ? Float32Array.from(channels.speedMs) : undefined,
      brake: channels.brake ? Float32Array.from(channels.brake) : undefined,
      throttle: channels.throttle ? Float32Array.from(channels.throttle) : undefined,
      steeringRad: channels.steeringRad ? Float32Array.from(channels.steeringRad) : undefined,
      gear: channels.gear ? Int32Array.from(channels.gear) : undefined,
      rpm: channels.rpm ? Float32Array.from(channels.rpm) : undefined,
      latitude: channels.latitude ? Float64Array.from(channels.latitude) : undefined,
      longitude: channels.longitude ? Float64Array.from(channels.longitude) : undefined,
      headingRad: channels.headingRad ? Float32Array.from(channels.headingRad) : undefined,
    },
    channelAvailability: {
      distancePct: true,
      speedMs: channels.speedMs !== undefined,
      brake: channels.brake !== undefined,
      throttle: channels.throttle !== undefined,
      steeringRad: channels.steeringRad !== undefined,
      gear: channels.gear !== undefined,
      rpm: channels.rpm !== undefined,
      latitude: channels.latitude !== undefined,
      longitude: channels.longitude !== undefined,
      headingRad: channels.headingRad !== undefined,
    },
  };
}

function localPathToLatLon(
  xM: number[],
  yM: number[],
  origin: { latitude: number; longitude: number } = { latitude: 1, longitude: 2 },
): { latitude: number[]; longitude: number[] } {
  const metresPerDegreeLat = 111_320;
  const metresPerDegreeLon = metresPerDegreeLat * Math.cos(origin.latitude * (Math.PI / 180));

  return {
    latitude: yM.map((y) => origin.latitude + y / metresPerDegreeLat),
    longitude: xM.map((x) => origin.longitude + x / metresPerDegreeLon),
  };
}

function makeFinding(id: string, priority: number) {
  return {
    id,
    priority,
    title: id,
    why: id,
    practiceCue: id,
    category: "braking" as const,
    severity: "medium" as const,
    confidence: 0.5,
    evidence: [],
  };
}
