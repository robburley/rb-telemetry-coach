import type { TrackInfo } from "../../domain/metadataTypes";
import type { Garage61TrackFixture } from "./types";

export type { Garage61TrackFixture } from "./types";

export function normaliseGarage61Track(track: Garage61TrackFixture): TrackInfo {
  return {
    id: track.id,
    platform: track.platform,
    name: track.name,
    variant: track.variant,
    shortName: track.shortname,
    hasMap: track.has_map,
    lapLengthM: track.lap_length,
    sectorMarkersPct: track.sectors,
    turns: track.turns,
    bounds: track.bounds,
  };
}
