import type {
  LapDistancePct,
  Metres,
  Radians,
  Seconds,
} from "./units";

export interface AnalysisMetadata {
  id: string;
  type: "laps";
  laps: LapSummary[];
  car: CarInfo;
  track: TrackInfo;
  createdAt?: string;
  modifiedAt?: string;
}

export interface LapSummary {
  id: string;
  driver: DriverInfo;
  lapTimeSec: Seconds;
  lapNumber?: number;
  sectors?: SectorInfo[];
  canViewTelemetry: boolean;
  haveSamples: boolean;
  isActive?: boolean;
  clean?: boolean;
}

export interface DriverInfo {
  id?: string;
  name: string;
  rating?: number;
  slug?: string;
}

export interface CarInfo {
  id: string | number;
  platform?: string;
  name: string;
  shortName?: string;
}

export interface TrackInfo {
  id: string | number;
  platform?: string;
  name: string;
  variant?: string;
  shortName?: string;
  lapLengthM?: Metres;
  sectorMarkersPct?: LapDistancePct[];
  turns?: number;
  bounds?: [number, number, number, number];
  hasMap?: boolean;
}

export interface SectorInfo {
  index: number;
  timeSec?: Seconds;
  startDistancePct?: LapDistancePct;
  endDistancePct?: LapDistancePct;
}

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

export interface DistanceSlice {
  startDistancePct: LapDistancePct;
  endDistancePct: LapDistancePct;
  source?: DistanceSliceSource;
}

export interface DistanceSliceSource {
  kind: "garage61-url-z" | "manual";
  raw?: string;
  startTick?: number | null;
  endTick?: number | null;
}

export interface AnalysisReport {
  status: AnalysisReportStatus;
  analysisId: string;
  referenceLapId?: string;
  targetLapId?: string;
  slice?: DistanceSlice;
  findings: CoachingFinding[];
  allRuleResults?: RuleResult[];
  reason?: string;
}

export type AnalysisReportStatus =
  | "complete"
  | "needs_slice"
  | "unsupported"
  | "unavailable";

export interface CoachingFinding {
  id: string;
  priority: number;
  title: string;
  why: string;
  practiceCue: string;
  category: FindingCategory;
  severity: FindingSeverity;
  confidence: number;
  evidence: EvidenceItem[];
  relatedFindingIds?: string[];
  possibleCauseFindingIds?: string[];
  possibleEffectFindingIds?: string[];
}

export type FindingCategory =
  | "braking"
  | "throttle"
  | "steering"
  | "line"
  | "gearing"
  | "rotation"
  | "stability";

export type FindingSeverity = "low" | "medium" | "high";

export interface EvidenceItem {
  label: string;
  value: string;
  kind: "delta" | "comparison" | "absolute";
  importance?: "primary" | "secondary";
  raw?: Record<string, number | string | boolean>;
}

export interface RuleResult {
  ruleId: string;
  passed: boolean;
  finding?: CoachingFinding;
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

export interface ComparisonLapRoles {
  referenceLapId: string;
  targetLapId: string;
}

export interface ComparisonContext {
  analysis: AnalysisMetadata;
  roles: ComparisonLapRoles;
  slice: DistanceSlice;
  reference: LapTelemetry;
  target: LapTelemetry;
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
