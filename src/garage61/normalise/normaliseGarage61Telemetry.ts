import type {
  DecodedChannelValues,
  DecodedGarage61Channel,
  DecodedGarage61Telemetry,
  LapTelemetry,
  LapTelemetryChannels,
  TelemetryChannelAvailability,
} from "../../domain/telemetryTypes";
import type { NormaliseGarage61TelemetryOptions } from "./types";

const channelNameByTelemetryKey = {
  speedMs: "speed_mps",
  brake: "brake",
  throttle: "throttle",
  steeringRad: "steering_rad",
  gear: "gear",
  rpm: "rpm",
  latitude: "latitude",
  longitude: "longitude",
  headingRad: "heading_rad",
} as const;

export type { NormaliseGarage61TelemetryOptions } from "./types";

export function normaliseGarage61Telemetry(
  decoded: DecodedGarage61Telemetry,
  options: NormaliseGarage61TelemetryOptions,
): LapTelemetry {
  const channelByName = new Map(
    decoded.channels.map((channel) => [channel.name, channel]),
  );
  const distanceChannel = channelByName.get("lap_distance_pct");
  if (!distanceChannel) {
    throw new Error("Garage 61 telemetry is missing lap_distance_pct channel");
  }

  const rotationStart = findDistanceRotationStart(distanceChannel.values);
  const channels: LapTelemetryChannels = {
    distancePct: rotateFloat64(distanceChannel.values, rotationStart),
  };

  const speed = optionalFloat32(channelByName.get("speed_mps"), rotationStart);
  const brake = optionalFloat32(channelByName.get("brake"), rotationStart);
  const throttle = optionalFloat32(channelByName.get("throttle"), rotationStart);
  const steering = optionalFloat32(
    channelByName.get("steering_rad"),
    rotationStart,
  );
  const gear = optionalInt32(channelByName.get("gear"), rotationStart);
  const rpm = optionalFloat32(channelByName.get("rpm"), rotationStart);
  const latitude = optionalFloat64(channelByName.get("latitude"), rotationStart);
  const longitude = optionalFloat64(
    channelByName.get("longitude"),
    rotationStart,
  );
  const heading = optionalFloat32(
    channelByName.get("heading_rad"),
    rotationStart,
  );

  if (speed) channels.speedMs = speed;
  if (brake) channels.brake = brake;
  if (throttle) channels.throttle = throttle;
  if (steering) channels.steeringRad = steering;
  if (gear) channels.gear = gear;
  if (rpm) channels.rpm = rpm;
  if (latitude) channels.latitude = latitude;
  if (longitude) channels.longitude = longitude;
  if (heading) channels.headingRad = heading;

  return {
    lapId: options.lapId,
    sampleCount: decoded.meta.sampleCount,
    channels,
    channelAvailability: makeAvailability(channels),
    source: {
      provider: options.provider ?? "garage61-example",
      decodedChannelSummary: decoded.channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        dtype: channel.dtype,
        sampleCount: channel.sampleCount,
      })),
    },
  };
}

function makeAvailability(
  channels: LapTelemetryChannels,
): TelemetryChannelAvailability {
  return {
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
  };
}

function optionalFloat32(
  channel: DecodedGarage61Channel | undefined,
  rotationStart: number,
): Float32Array | undefined {
  if (!channel) {
    return undefined;
  }
  return rotateFloat32(channel.values, rotationStart);
}

function optionalFloat64(
  channel: DecodedGarage61Channel | undefined,
  rotationStart: number,
): Float64Array | undefined {
  if (!channel) {
    return undefined;
  }
  return rotateFloat64(channel.values, rotationStart);
}

function optionalInt32(
  channel: DecodedGarage61Channel | undefined,
  rotationStart: number,
): Int32Array | undefined {
  if (!channel) {
    return undefined;
  }
  return rotateInt32(channel.values, rotationStart);
}

function rotateFloat32(
  values: DecodedChannelValues,
  rotationStart: number,
): Float32Array {
  const output = new Float32Array(values.length);
  copyRotated(values, output, rotationStart);
  return output;
}

function rotateFloat64(
  values: DecodedChannelValues,
  rotationStart: number,
): Float64Array {
  const output = new Float64Array(values.length);
  copyRotated(values, output, rotationStart);
  return output;
}

function rotateInt32(
  values: DecodedChannelValues,
  rotationStart: number,
): Int32Array {
  const output = new Int32Array(values.length);
  copyRotated(values, output, rotationStart);
  return output;
}

function copyRotated(
  source: DecodedChannelValues,
  target: Float32Array | Float64Array | Int32Array,
  rotationStart: number,
): void {
  const length = source.length;
  for (let index = 0; index < length; index += 1) {
    target[index] = source[(rotationStart + index) % length]!;
  }
}

function findDistanceRotationStart(values: DecodedChannelValues): number {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1]!;
    const current = values[index]!;
    if (previous - current > 0.5) {
      return index;
    }
  }

  return 0;
}

export const garage61TelemetryChannelMap = channelNameByTelemetryKey;
