import { describe, expect, it } from "vitest";
import {
  defaultAnalysisConfig,
  detectDrivingEvents,
  Garage61ExampleDataProvider,
  resampleTelemetryPair,
  sliceLapTelemetry,
  smoothResampledTelemetry,
  type DistanceSlice,
  type LapTelemetry,
} from "../../src";

const referenceLapId = "01KVBPW12Z5WJY1W33G47N95KW";
const targetLapId = "01KVBPNG1EVNB3D9310P6X2J1K";

describe("Phase 6 telemetry processing", () => {
  it("slices raw telemetry by requested distance range across all available channels", () => {
    const telemetry = makeTelemetry("lap-a", [0.1, 0.11, 0.12, 0.13], {
      speedMs: [20, 21, 22, 23],
      brake: [0, 0.2, 0.8, 0],
      gear: [2, 3, 3, 4],
    });

    const sliced = sliceLapTelemetry(telemetry, makeSlice(0.105, 0.125)).telemetry;

    expect(Array.from(sliced.channels.distancePct)).toEqual([0.11, 0.12]);
    expect(Array.from(sliced.channels.speedMs ?? [])).toEqual([21, 22]);
    expect(Array.from(sliced.channels.brake ?? [])).toEqual([
      expect.closeTo(0.2),
      expect.closeTo(0.8),
    ]);
    expect(Array.from(sliced.channels.gear ?? [])).toEqual([3, 3]);
    expect(sliced.sampleCount).toBe(2);
  });

  it("resamples two laps with different sample counts onto a common metre axis", () => {
    const reference = makeTelemetry("reference", [0.1, 0.11, 0.12], {
      speedMs: [10, 20, 30],
      throttle: [0, 0.5, 1],
    });
    const target = makeTelemetry("target", [0.1, 0.105, 0.11, 0.115, 0.12], {
      speedMs: [10, 15, 20, 25, 30],
      throttle: [0, 0.25, 0.5, 0.75, 1],
    });

    const [resampledReference, resampledTarget] = resampleTelemetryPair(
      reference,
      target,
      makeSlice(0.1, 0.12),
      {
        lapLengthM: 1000,
        config: {
          ...defaultAnalysisConfig,
          resampleStepM: 10,
          maxResampledPoints: 10,
        },
      },
    );

    expect(Array.from(resampledReference.distancePct)).toEqual([0.1, 0.11, 0.12]);
    expect(Array.from(resampledTarget.distancePct)).toEqual([0.1, 0.11, 0.12]);
    expect(Array.from(resampledReference.distanceM ?? [])).toEqual([100, 110, 120]);
    expect(Array.from(resampledReference.channels.speedMs ?? [])).toEqual([
      10, 20, 30,
    ]);
    expect(Array.from(resampledTarget.channels.speedMs ?? [])).toEqual([10, 20, 30]);
  });

  it("enforces maxResampledPoints", () => {
    const telemetry = makeTelemetry("lap-a", [0.1, 0.2], {
      speedMs: [10, 20],
    });

    expect(() =>
      resampleTelemetryPair(telemetry, telemetry, makeSlice(0.1, 0.2), {
        lapLengthM: 1000,
        config: {
          ...defaultAnalysisConfig,
          resampleStepM: 1,
          maxResampledPoints: 10,
        },
      }),
    ).toThrow("exceeds maxResampledPoints");
  });

  it("resamples a small valid slice at the minimum coaching length", () => {
    const telemetry = makeTelemetry("lap-a", [0.1, 0.1025, 0.105], {
      speedMs: [10, 15, 20],
    });

    const [resampled] = resampleTelemetryPair(
      telemetry,
      telemetry,
      makeSlice(0.1, 0.105),
      {
        lapLengthM: 1000,
        config: {
          ...defaultAnalysisConfig,
          resampleStepM: 1,
          maxResampledPoints: 10,
        },
      },
    );

    expect(Array.from(resampled.distanceM ?? [])).toEqual([
      expect.closeTo(100),
      expect.closeTo(101),
      expect.closeTo(102),
      expect.closeTo(103),
      expect.closeTo(104),
      expect.closeTo(105),
    ]);
  });

  it("smooths noisy signals by distance window after resampling", () => {
    const telemetry = makeResampledTelemetry("lap-a", [0, 0.001, 0.002], {
      brake: [0, 1, 0],
    });

    const smoothed = smoothResampledTelemetry(telemetry, {
      ...defaultAnalysisConfig,
      smoothingWindowM: {
        ...defaultAnalysisConfig.smoothingWindowM,
        brake: 2,
      },
    });

    expect(Array.from(smoothed.channels.brake ?? [])).toEqual([
      expect.closeTo(0.5),
      expect.closeTo(1 / 3),
      expect.closeTo(0.5),
    ]);
  });

  it("detects brake, throttle, and steering events deterministically", () => {
    const telemetry = makeResampledTelemetry("lap-a", [0.1, 0.11, 0.12, 0.13, 0.14], {
      brake: [0, 0.2, 0.8, 0.03, 0],
      throttle: [0, 0.1, 0.8, 0.6, 1],
      steeringRad: [0, 0.1, 0.25, 0.15, 0.03],
    });

    const events = detectDrivingEvents(telemetry);

    expect(events.brakeStartDistancePct).toBe(0.11);
    expect(events.peakBrakeDistancePct).toBe(0.12);
    expect(events.brakeReleaseDistancePct).toBe(0.13);
    expect(events.firstThrottleDistancePct).toBe(0.11);
    expect(events.fullThrottleDistancePct).toBe(0.14);
    expect(events.throttleLiftDistancePct).toEqual([0.13]);
    expect(events.steeringPeakDistancePct).toBe(0.12);
    expect(events.steeringCorrectionDistancesPct).toContain(0.13);
    expect(events.steeringUnwindDistancePct).toBe(0.14);
  });

  it("skips events for missing channels without crashing", () => {
    const telemetry = makeResampledTelemetry("lap-a", [0.1, 0.11], {
      speedMs: [20, 21],
    });

    expect(detectDrivingEvents(telemetry)).toEqual({});
  });

  it("processes a fixture-backed Garage 61 slice through resampling, smoothing, and events", async () => {
    const provider = new Garage61ExampleDataProvider();
    const [reference, target] = await Promise.all([
      provider.getLapTelemetry(referenceLapId),
      provider.getLapTelemetry(targetLapId),
    ]);

    const [resampledReference, resampledTarget] = resampleTelemetryPair(
      reference,
      target,
      makeSlice(0.0354, 0.12),
      {
        lapLengthM: 4306.5938,
        config: defaultAnalysisConfig,
      },
    );
    const smoothedReference = smoothResampledTelemetry(resampledReference);
    const events = detectDrivingEvents(smoothedReference);

    expect(resampledReference.distancePct.length).toBeGreaterThan(300);
    expect(resampledReference.distancePct.length).toBe(resampledTarget.distancePct.length);
    expect(smoothedReference.channels.speedMs).toHaveLength(
      resampledReference.distancePct.length,
    );
    expect(events.brakeStartDistancePct).toBeGreaterThanOrEqual(0.0354);
  });
});

function makeSlice(startDistancePct: number, endDistancePct: number): DistanceSlice {
  return { startDistancePct, endDistancePct };
}

function makeTelemetry(
  lapId: string,
  distancePct: number[],
  channels: {
    speedMs?: number[];
    brake?: number[];
    throttle?: number[];
    steeringRad?: number[];
    gear?: number[];
  },
): LapTelemetry {
  return {
    lapId,
    sampleCount: distancePct.length,
    channels: {
      distancePct: Float64Array.from(distancePct),
      speedMs: channels.speedMs ? Float32Array.from(channels.speedMs) : undefined,
      brake: channels.brake ? Float32Array.from(channels.brake) : undefined,
      throttle: channels.throttle ? Float32Array.from(channels.throttle) : undefined,
      steeringRad: channels.steeringRad
        ? Float32Array.from(channels.steeringRad)
        : undefined,
      gear: channels.gear ? Int32Array.from(channels.gear) : undefined,
    },
    channelAvailability: {
      distancePct: true,
      speedMs: channels.speedMs !== undefined,
      brake: channels.brake !== undefined,
      throttle: channels.throttle !== undefined,
      steeringRad: channels.steeringRad !== undefined,
      gear: channels.gear !== undefined,
      rpm: false,
      latitude: false,
      longitude: false,
      headingRad: false,
    },
  };
}

function makeResampledTelemetry(
  lapId: string,
  distancePct: number[],
  channels: {
    speedMs?: number[];
    brake?: number[];
    throttle?: number[];
    steeringRad?: number[];
  },
) {
  return {
    lapId,
    distancePct: Float64Array.from(distancePct),
    distanceM: Float64Array.from(distancePct, (distance) => distance * 1000),
    channels: {
      distancePct: Float64Array.from(distancePct),
      speedMs: channels.speedMs ? Float32Array.from(channels.speedMs) : undefined,
      brake: channels.brake ? Float32Array.from(channels.brake) : undefined,
      throttle: channels.throttle ? Float32Array.from(channels.throttle) : undefined,
      steeringRad: channels.steeringRad
        ? Float32Array.from(channels.steeringRad)
        : undefined,
    },
  };
}
