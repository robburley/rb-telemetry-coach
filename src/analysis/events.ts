import type { DetectedDrivingEvents, ResampledTelemetry } from "../domain/types";

const BRAKE_ACTIVE_THRESHOLD = 0.05;
const THROTTLE_ACTIVE_THRESHOLD = 0.05;
const FULL_THROTTLE_THRESHOLD = 0.95;
const THROTTLE_LIFT_DROP = 0.12;
const STEERING_NOISE_RAD = 0.015;
const STEERING_UNWIND_RATIO = 0.4;

export function detectDrivingEvents(
  telemetry: ResampledTelemetry,
): DetectedDrivingEvents {
  const events: DetectedDrivingEvents = {};
  const { distancePct } = telemetry;

  const brake = telemetry.channels.brake;
  if (brake) {
    const brakeStart = findFirstAtOrAbove(brake, BRAKE_ACTIVE_THRESHOLD);
    const peakBrake = findPeakIndex(brake);
    const brakeRelease =
      peakBrake === undefined
        ? undefined
        : findFirstAtOrBelow(brake, BRAKE_ACTIVE_THRESHOLD, peakBrake);

    events.brakeStartDistancePct = distanceAt(distancePct, brakeStart);
    events.peakBrakeDistancePct = distanceAt(distancePct, peakBrake);
    events.brakeReleaseDistancePct = distanceAt(distancePct, brakeRelease);
  }

  const throttle = telemetry.channels.throttle;
  if (throttle) {
    events.firstThrottleDistancePct = distanceAt(
      distancePct,
      findFirstAtOrAbove(throttle, THROTTLE_ACTIVE_THRESHOLD),
    );
    events.fullThrottleDistancePct = distanceAt(
      distancePct,
      findFirstAtOrAbove(throttle, FULL_THROTTLE_THRESHOLD),
    );
    events.throttleLiftDistancePct = findThrottleLifts(throttle).map(
      (index) => distancePct[index]!,
    );
  }

  const steering = telemetry.channels.steeringRad;
  if (steering) {
    const peakSteering = findPeakAbsIndex(steering);
    events.steeringPeakDistancePct = distanceAt(distancePct, peakSteering);
    events.steeringCorrectionDistancesPct = findSteeringCorrections(steering).map(
      (index) => distancePct[index]!,
    );
    events.steeringUnwindDistancePct =
      peakSteering === undefined
        ? undefined
        : distanceAt(
            distancePct,
            findSteeringUnwind(steering, peakSteering, Math.abs(steering[peakSteering]!)),
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

function findThrottleLifts(values: Float32Array): number[] {
  const lifts: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    const drop = values[index - 1]! - values[index]!;
    if (
      values[index - 1]! > THROTTLE_ACTIVE_THRESHOLD &&
      drop >= THROTTLE_LIFT_DROP
    ) {
      lifts.push(index);
    }
  }
  return lifts;
}

function findSteeringCorrections(values: Float32Array): number[] {
  const corrections: number[] = [];
  let previousDirection = 0;

  for (let index = 1; index < values.length; index += 1) {
    const delta = values[index]! - values[index - 1]!;
    const direction = Math.abs(delta) >= STEERING_NOISE_RAD ? Math.sign(delta) : 0;
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
): number | undefined {
  const threshold = Math.max(STEERING_NOISE_RAD, peakMagnitude * STEERING_UNWIND_RATIO);
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
