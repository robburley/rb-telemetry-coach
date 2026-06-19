import { defaultAnalysisConfig, type AnalysisConfig } from "./config";
import type { ResampledTelemetry } from "../domain/types";

export function smoothResampledTelemetry(
  telemetry: ResampledTelemetry,
  config: AnalysisConfig = defaultAnalysisConfig,
): ResampledTelemetry {
  return {
    ...telemetry,
    channels: {
      ...telemetry.channels,
      speedMs: smoothFloat32ByDistance(
        telemetry.channels.speedMs,
        telemetry.distanceM,
        config.smoothingWindowM.speed,
      ),
      brake: smoothFloat32ByDistance(
        telemetry.channels.brake,
        telemetry.distanceM,
        config.smoothingWindowM.brake,
      ),
      throttle: smoothFloat32ByDistance(
        telemetry.channels.throttle,
        telemetry.distanceM,
        config.smoothingWindowM.throttle,
      ),
      steeringRad: smoothFloat32ByDistance(
        telemetry.channels.steeringRad,
        telemetry.distanceM,
        config.smoothingWindowM.steering,
      ),
    },
  };
}

export function smoothFloat32ByDistance(
  values: Float32Array | undefined,
  distanceM: Float64Array | undefined,
  windowM: number,
): Float32Array | undefined {
  if (!values) {
    return undefined;
  }

  if (!distanceM || windowM <= 0) {
    return values.slice();
  }

  const output = new Float32Array(values.length);
  const halfWindow = windowM / 2;
  let left = 0;
  let right = 0;
  let sum = 0;

  for (let index = 0; index < values.length; index += 1) {
    const center = distanceM[index]!;
    while (right < values.length && distanceM[right]! <= center + halfWindow) {
      sum += values[right]!;
      right += 1;
    }
    while (left < right && distanceM[left]! < center - halfWindow) {
      sum -= values[left]!;
      left += 1;
    }
    output[index] = sum / Math.max(1, right - left);
  }

  return output;
}
