import type {
  AnalysisMetadata,
  CarInfo,
  DriverInfo,
  LapSummary,
  SectorInfo,
  TrackInfo,
} from "../../domain/types";
import {
  type Garage61TrackFixture,
  normaliseGarage61Track,
} from "./normaliseGarage61Track";

export interface Garage61AnalysisFixture {
  id: string;
  type: "laps";
  tracks?: Array<string | number>;
  laps: Garage61AnalysisLapGroup[];
  created_at?: string;
  modified_at?: string;
  car_info?: Garage61CarInfo[];
  track_info?: Garage61TrackInfo[];
}

interface Garage61AnalysisLapGroup {
  lap?: string;
  laps?: Garage61LapFixture[];
}

interface Garage61LapFixture {
  id: string;
  user?: string;
  lap_number?: number;
  lap_time: number;
  have_samples?: boolean;
  clean?: boolean;
  sectors?: Garage61SectorFixture[];
  can_view_telemetry?: boolean;
  driver_name?: string;
  driver_rating?: number;
  driver?: Garage61DriverFixture;
  car_info?: Garage61CarInfo;
  track_info?: Garage61TrackInfo;
}

interface Garage61SectorFixture {
  sector_time?: number;
}

interface Garage61DriverFixture {
  slug?: string;
  firstname?: string;
  lastname?: string;
}

interface Garage61CarInfo {
  id: string | number;
  platform?: string;
  name: string;
  shortname?: string;
}

interface Garage61TrackInfo extends Garage61TrackFixture {}

export interface NormaliseGarage61AnalysisOptions {
  track?: Garage61TrackFixture;
}

export function normaliseGarage61Analysis(
  analysis: Garage61AnalysisFixture,
  options: NormaliseGarage61AnalysisOptions = {},
): AnalysisMetadata {
  const laps = analysis.laps.flatMap((group) => group.laps ?? []);
  if (laps.length === 0) {
    throw new Error(`Garage 61 analysis ${analysis.id} does not contain laps`);
  }

  const firstLap = laps[0]!;
  const carSource = firstLap.car_info ?? analysis.car_info?.[0];
  const trackSource = options.track ?? firstLap.track_info ?? analysis.track_info?.[0];

  if (!carSource) {
    throw new Error(`Garage 61 analysis ${analysis.id} is missing car info`);
  }
  if (!trackSource) {
    throw new Error(`Garage 61 analysis ${analysis.id} is missing track info`);
  }

  return {
    id: analysis.id,
    type: analysis.type,
    createdAt: analysis.created_at,
    modifiedAt: analysis.modified_at,
    car: normaliseGarage61Car(carSource),
    track: normaliseGarage61Track(trackSource),
    laps: laps.map(normaliseGarage61LapSummary),
  };
}

function normaliseGarage61Car(car: Garage61CarInfo): CarInfo {
  return {
    id: car.id,
    platform: car.platform,
    name: car.name,
    shortName: car.shortname,
  };
}

function normaliseGarage61LapSummary(lap: Garage61LapFixture): LapSummary {
  return {
    id: lap.id,
    lapTimeSec: lap.lap_time,
    lapNumber: lap.lap_number,
    driver: normaliseGarage61Driver(lap),
    sectors: lap.sectors?.map(normaliseGarage61Sector),
    canViewTelemetry: lap.can_view_telemetry ?? false,
    haveSamples: lap.have_samples ?? false,
    clean: lap.clean,
  };
}

function normaliseGarage61Driver(lap: Garage61LapFixture): DriverInfo {
  const driverName =
    lap.driver_name ??
    [lap.driver?.firstname, lap.driver?.lastname].filter(Boolean).join(" ");

  return {
    id: lap.user,
    name: driverName || "Unknown Driver",
    rating: lap.driver_rating,
    slug: lap.driver?.slug,
  };
}

function normaliseGarage61Sector(
  sector: Garage61SectorFixture,
  index: number,
): SectorInfo {
  return {
    index,
    timeSec: sector.sector_time,
  };
}
