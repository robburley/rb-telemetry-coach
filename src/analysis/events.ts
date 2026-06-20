import type { DetectedDrivingEvents, ResampledTelemetry } from "../domain/types";
import { defaultAnalysisConfig, type EventDetectionConfig } from "./config";

export function detectDrivingEvents(
  telemetry: ResampledTelemetry,
  config: EventDetectionConfig = defaultAnalysisConfig.events,
): DetectedDrivingEvents {
  const events: DetectedDrivingEvents = {};
  const { distancePct } = telemetry;

  const brake = telemetry.channels.brake;
  if (brake) {
    const brakeStart = findFirstAtOrAbove(brake, config.brakeActiveThreshold);
    const peakBrake = findPeakIndex(brake);
    const brakeRelease =
      peakBrake === undefined
        ? undefined
        : findFirstAtOrBelow(brake, config.brakeActiveThreshold, peakBrake);

    events.brakeStartDistancePct = distanceAt(distancePct, brakeStart);
    events.peakBrakeDistancePct = distanceAt(distancePct, peakBrake);
    events.brakeReleaseDistancePct = distanceAt(distancePct, brakeRelease);
  }

  const throttle = telemetry.channels.throttle;
  if (throttle) {
    events.firstThrottleDistancePct = distanceAt(
      distancePct,
      findFirstAtOrAbove(throttle, config.throttleActiveThreshold),
    );
    events.fullThrottleDistancePct = distanceAt(
      distancePct,
      findFirstAtOrAbove(throttle, config.fullThrottleThreshold),
    );
    events.throttleLiftDistancePct = findThrottleLifts(throttle, config).map(
      (index) => distancePct[index]!,
    );
  }

  const steering = telemetry.channels.steeringRad;
  if (steering) {
    const peakSteering = findPeakAbsIndex(steering);
    events.steeringPeakDistancePct = distanceAt(distancePct, peakSteering);
    events.steeringCorrectionDistancesPct = findSteeringCorrections(steering, config).map(
      (index) => distancePct[index]!,
    );
    events.steeringUnwindDistancePct =
      peakSteering === undefined
        ? undefined
        : distanceAt(
            distancePct,
            findSteeringUnwind(
              steering,
              peakSteering,
              Math.abs(steering[peakSteering]!),
              config,
            ),
          );
  }

  return events;
}

function findFirstAtOrAbove(
  values: Float32Array,
  threshold: number,
  startIndex = 0,
): number | undefined {
  for (let index = startIndex; index < values.length; index += 1) {
    if (values[index]! >= threshold) {
      return index;
    }
  }
  return undefined;
}

function findFirstAtOrBelow(
  values: Float32Array,
  threshold: number,
  startIndex = 0,
): number | undefined {
  for (let index = startIndex; index < values.length; index += 1) {
    if (values[index]! <= threshold) {
      return index;
    }
  }
  return undefined;
}

function findPeakIndex(values: Float32Array): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  let peakIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index]! > values[peakIndex]!) {
      peakIndex = index;
    }
  }
  return peakIndex;
}

function findPeakAbsIndex(values: Float32Array): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  let peakIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (Math.abs(values[index]!) > Math.abs(values[peakIndex]!)) {
      peakIndex = index;
    }
  }
  return peakIndex;
}

function findThrottleLifts(
  values: Float32Array,
  config: EventDetectionConfig,
): number[] {
  const lifts: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    const drop = values[index - 1]! - values[index]!;
    if (
      values[index - 1]! > config.throttleActiveThreshold &&
      drop >= config.throttleLiftDrop
    ) {
      lifts.push(index);
    }
  }
  return lifts;
}

function findSteeringCorrections(
  values: Float32Array,
  config: EventDetectionConfig,
): number[] {
  const corrections: number[] = [];
  let previousDirection = 0;

  for (let index = 1; index < values.length; index += 1) {
    const delta = values[index]! - values[index - 1]!;
    const direction = Math.abs(delta) >= config.steeringNoiseRad ? Math.sign(delta) : 0;
    if (direction !== 0) {
      if (previousDirection !== 0 && direction !== previousDirection) {
        corrections.push(index);
      }
      previousDirection = direction;
    }
  }

  return corrections;
}

function findSteeringUnwind(
  values: Float32Array,
  peakIndex: number,
  peakMagnitude: number,
  config: EventDetectionConfig,
): number | undefined {
  const threshold = Math.max(
    config.steeringNoiseRad,
    peakMagnitude * config.steeringUnwindRatio,
  );
  for (let index = peakIndex; index < values.length; index += 1) {
    if (Math.abs(values[index]!) <= threshold) {
      return index;
    }
  }
  return undefined;
}

function distanceAt(
  distancePct: Float64Array,
  index: number | undefined,
): number | undefined {
  return index === undefined ? undefined : distancePct[index];
}
