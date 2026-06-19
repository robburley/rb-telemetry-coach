import { describe, expect, it } from "vitest";
import {
  compareTelemetry,
  defaultAnalysisConfig,
  formatDistanceAt,
  formatDistanceDelta,
  formatPedalDelta,
  formatSpeedDelta,
  Garage61ExampleDataProvider,
  generateAnalysisReport,
  resolveComparisonLaps,
  runDeterministicRules,
  sortAndLinkFindings,
  type AnalysisConfig,
  type AnalysisMetadata,
  type ComparisonContext,
  type DistanceSlice,
  type LapTelemetry,
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

describe("Phase 7 telemetry comparison and reports", () => {
  it("formats evidence with metres, lap percentage, speed, and pedal units", () => {
    expect(formatDistanceDelta(-12.25)).toBe("12.3 m earlier");
    expect(formatDistanceAt(0.1, 1000)).toBe("100 m");
    expect(formatDistanceAt(0.1234)).toBe("12.34% lap");
    expect(formatSpeedDelta(-4.25)).toBe("4.3 km/h slower");
    expect(formatPedalDelta(0.125)).toBe("13% more");
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
    expect(report.allRuleResults).toHaveLength(13);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings.map((finding) => finding.priority)).toEqual(
      [...report.findings.map((finding) => finding.priority)].sort((a, b) => b - a),
    );
    expect(report.findings[0]!.title).toMatch(/\w/);
    expect(report.findings[0]!.evidence.length).toBeGreaterThan(0);
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
  });

  it("skips affected rules when channels are missing", () => {
    const context = makeContext({
      referenceChannels: { speedMs: [20, 20, 20, 20, 20, 20, 20] },
      targetChannels: { speedMs: [20, 20, 20, 20, 20, 20, 20] },
    });

    const report = generateAnalysisReport(context);

    expect(report.status).toBe("complete");
    expect(report.findings).toEqual([]);
  });
});

describe("Phase 7 deterministic rules", () => {
  const ruleCases: Array<{
    id: string;
    mutate: (context: ComparisonContext) => ComparisonContext;
  }> = [
    { id: "braking-too-early", mutate: (context: ComparisonContext) => replaceBrakes(context, [0, 0, 0, 1, 0.5, 0, 0], [0, 1, 0.8, 0.1, 0, 0, 0]) },
    { id: "braking-too-late", mutate: (context: ComparisonContext) => replaceBrakes(context, [0, 1, 0.5, 0, 0, 0, 0], [0, 0, 0, 1, 0.4, 0, 0]) },
    { id: "holding-brake-too-long", mutate: (context: ComparisonContext) => replaceBrakes(context, [0, 1, 0, 0, 0, 0, 0], [0, 1, 0.8, 0.4, 0, 0, 0]) },
    { id: "over-slowing-entry", mutate: (context: ComparisonContext) => replaceSpeed(context, [20, 20, 19, 20, 21, 22, 23], [20, 18, 17, 19, 21, 22, 23]) },
    { id: "insufficient-trail-braking", mutate: (context: ComparisonContext) =>
      replaceBrakesAndSpeed(context, [0, 1, 0.9, 0.4, 0, 0, 0], [0, 1, 0.1, 0, 0, 0, 0], [20, 19, 18, 19, 20, 21, 22], [20, 19, 18.5, 19.5, 20, 21, 22]) },
    { id: "delayed-throttle-pickup", mutate: (context: ComparisonContext) => replaceThrottle(context, [0, 0.2, 0.6, 1, 1, 1, 1], [0, 0, 0, 0.2, 0.6, 1, 1]) },
    { id: "early-throttle-with-lift", mutate: (context: ComparisonContext) => replaceThrottle(context, [0, 0, 0, 0.5, 1, 1, 1], [0, 0.3, 0.1, 0.6, 1, 1, 1]) },
    { id: "exit-hesitation", mutate: (context: ComparisonContext) =>
      replaceSpeedAndThrottle(context, [20, 20, 20, 20, 21, 22, 23], [20, 20, 20, 20, 20, 20, 21], [0, 0.2, 0.6, 1, 1, 1, 1], [0, 0, 0, 0.1, 0.4, 0.7, 0.8]) },
    { id: "excessive-steering", mutate: (context: ComparisonContext) => replaceSteering(context, [0, 0.1, 0.2, 0.1, 0, 0, 0], [0, 0.25, 0.45, 0.25, 0, 0, 0]) },
    { id: "late-steering-unwind", mutate: (context: ComparisonContext) => replaceSteering(context, [0, 0.3, 0.1, 0, 0, 0, 0], [0, 0.3, 0.25, 0.2, 0.15, 0.05, 0]) },
    { id: "poor-rotation", mutate: (context: ComparisonContext) =>
      replaceBrakesAndSteering(context, [0, 1, 0.8, 0.4, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0], [0, 0.1, 0.2, 0.1, 0, 0, 0], [0, 0.25, 0.45, 0.25, 0, 0, 0]) },
    { id: "over-driving-entry", mutate: (context: ComparisonContext) => replaceSpeed(context, [20, 20, 19, 20, 21, 22, 23], [22, 21, 17, 19, 21, 22, 23]) },
    { id: "instability-correction", mutate: (context: ComparisonContext) => replaceSteering(context, [0, 0.1, 0.2, 0.15, 0.1, 0.05, 0], [0, 0.1, -0.1, 0.15, -0.15, 0.1, 0]) },
  ];

  it.each(ruleCases)("fires %s and stays quiet for the baseline", ({ id, mutate }) => {
    const quietResults = runDeterministicRules(compareTelemetry(makeContext(), unsmoothedConfig));
    expect(quietResults.find((result) => result.finding?.id === id)).toBeUndefined();

    const results = runDeterministicRules(compareTelemetry(mutate(makeContext()), unsmoothedConfig));

    expect(results.find((result) => result.finding?.id === id)?.finding?.id).toBe(id);
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
      headingRad: false,
    },
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
