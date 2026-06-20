import type { LapDistancePct, Metres, Radians } from "./units";
import type { DistanceSlice } from "./reportTypes";

export type TelemetryDtype = "float32" | "float64" | "int32" | "uint8";

export type DecodedChannelValues =
  | Float32Array
  | Float64Array
  | Int32Array
  | Uint8Array;

export interface DecodedGarage61Telemetry {
  meta: DecodedGarage61TelemetryMeta;
  channels: DecodedGarage61Channel[];
  unknownChannels: DecodedGarage61Channel[];
}

export interface DecodedGarage61TelemetryMeta {
  magic: string;
  sampleCount: number;
  sampleRateOrStep?: number;
  rawDataStart?: number;
  rawDataEnd?: number;
  fileSizeBytes: number;
}

export interface DecodedGarage61Channel {
  id: number;
  name: string;
  dtype: TelemetryDtype;
  values: DecodedChannelValues;
  sampleCount: number;
  byteLength?: number;
  rawOffset?: number;
  decodedMin?: number;
  decodedMax?: number;
}

export interface LapTelemetry {
  lapId: string;
  sampleCount: number;
  channels: LapTelemetryChannels;
  channelAvailability: TelemetryChannelAvailability;
  source?: TelemetrySourceSummary;
}

export interface LapTelemetryChannels {
  distancePct: Float64Array;
  speedMs?: Float32Array;
  brake?: Float32Array;
  throttle?: Float32Array;
  steeringRad?: Float32Array;
  gear?: Int32Array;
  rpm?: Float32Array;
  latitude?: Float64Array;
  longitude?: Float64Array;
  headingRad?: Float32Array;
}

export interface TelemetryChannelAvailability {
  distancePct: boolean;
  speedMs: boolean;
  brake: boolean;
  throttle: boolean;
  steeringRad: boolean;
  gear: boolean;
  rpm: boolean;
  latitude: boolean;
  longitude: boolean;
  headingRad: boolean;
}

export interface TelemetrySourceSummary {
  provider: "garage61-example" | "garage61-page-network" | string;
  decodedChannelSummary?: DecodedChannelSummary[];
}

export interface DecodedChannelSummary {
  id: number;
  name: string;
  dtype: TelemetryDtype;
  sampleCount: number;
}

export interface SliceTelemetry {
  lapId: string;
  slice: DistanceSlice;
  telemetry: LapTelemetry;
}

export interface ResampledTelemetry {
  lapId: string;
  distancePct: Float64Array;
  distanceM?: Float64Array;
  channels: LapTelemetryChannels;
}

export interface DetectedDrivingEvents {
  brakeStartDistancePct?: LapDistancePct;
  peakBrakeDistancePct?: LapDistancePct;
  brakeReleaseDistancePct?: LapDistancePct;
  firstThrottleDistancePct?: LapDistancePct;
  fullThrottleDistancePct?: LapDistancePct;
  throttleLiftDistancePct?: LapDistancePct[];
  steeringPeakDistancePct?: LapDistancePct;
  steeringCorrectionDistancesPct?: LapDistancePct[];
  steeringUnwindDistancePct?: LapDistancePct;
}

export interface EventDelta {
  label: string;
  referenceDistancePct?: LapDistancePct;
  targetDistancePct?: LapDistancePct;
  deltaM?: Metres;
  deltaPct?: LapDistancePct;
}

export interface SteeringMetric {
  peakSteeringRad?: Radians;
  correctionCount?: number;
}
