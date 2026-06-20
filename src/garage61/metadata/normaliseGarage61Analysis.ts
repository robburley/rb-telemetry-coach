import type {
  AnalysisMetadata,
  CarInfo,
  DriverInfo,
  LapSummary,
  SectorInfo,
  TrackInfo,
} from "../../domain/metadataTypes";
import {
  type Garage61TrackFixture,
  normaliseGarage61Track,
} from "./normaliseGarage61Track";
import type {
  Garage61AnalysisLapGroup,
  Garage61AnalysisFixture,
  Garage61CarInfo,
  Garage61LapFixture,
  Garage61SectorFixture,
  Garage61VisibilityCarrier,
  Garage61VisibilityNode,
  NormaliseGarage61AnalysisOptions,
} from "./types";

export type {
  Garage61AnalysisFixture,
  NormaliseGarage61AnalysisOptions,
} from "./types";

export function normaliseGarage61Analysis(
  analysis: Garage61AnalysisFixture,
  options: NormaliseGarage61AnalysisOptions = {},
): AnalysisMetadata {
  const laps = analysis.laps.flatMap((group) =>
    (group.laps ?? []).map((lap) => ({ group, lap })),
  );
  if (laps.length === 0) {
    throw new Error(`Garage 61 analysis ${analysis.id} does not contain laps`);
  }

  const firstLap = laps[0]!.lap;
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
    laps: laps.map(({ group, lap }) => normaliseGarage61LapSummary(lap, group)),
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

function normaliseGarage61LapSummary(
  lap: Garage61LapFixture,
  group: Garage61AnalysisLapGroup,
): LapSummary {
  return {
    id: lap.id,
    lapTimeSec: lap.lap_time,
    lapNumber: lap.lap_number,
    driver: normaliseGarage61Driver(lap),
    sectors: lap.sectors?.map(normaliseGarage61Sector),
    canViewTelemetry: lap.can_view_telemetry ?? false,
    haveSamples: lap.have_samples ?? false,
    isActive: normaliseGarage61LapActiveState(lap, group),
    clean: lap.clean,
  };
}

function normaliseGarage61LapActiveState(
  lap: Garage61LapFixture,
  group: Garage61AnalysisLapGroup,
): boolean | undefined {
  if (hasInactiveVisibility(lap) || hasInactiveVisibility(group)) {
    return false;
  }

  if (hasActiveVisibility(lap) || hasActiveVisibility(group)) {
    return true;
  }

  return undefined;
}

function hasInactiveVisibility(node: Garage61VisibilityNode): boolean {
  if (!node) {
    return false;
  }

  if (Array.isArray(node)) {
    return node.some(hasInactiveVisibility);
  }

  if (
    node.hidden === true ||
    node.is_hidden === true ||
    node.inactive === true ||
    node.visible === false ||
    node.is_visible === false ||
    node.active === false ||
    node.enabled === false ||
    node.disabled === true ||
    node.selected === false ||
    node.is_selected === false
  ) {
    return true;
  }

  return visibilityChildren(node).some(hasInactiveVisibility);
}

function hasActiveVisibility(node: Garage61VisibilityNode): boolean {
  if (!node) {
    return false;
  }

  if (Array.isArray(node)) {
    return node.some(hasActiveVisibility);
  }

  if (
    node.active === true ||
    node.enabled === true ||
    node.selected === true ||
    node.is_selected === true
  ) {
    return true;
  }

  return visibilityChildren(node).some(hasActiveVisibility);
}

function visibilityChildren(carrier: Garage61VisibilityCarrier): Garage61VisibilityNode[] {
  return [carrier.options, carrier.settings, carrier.state, carrier.display];
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
