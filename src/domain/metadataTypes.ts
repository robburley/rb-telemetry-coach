import type { LapDistancePct, Metres, Seconds } from "./units";

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
