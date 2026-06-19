import type { TrackInfo } from "../../domain/types";

export interface Garage61TrackFixture {
  id: string | number;
  platform?: string;
  name: string;
  variant?: string;
  shortname?: string;
  has_map?: boolean;
  sectors?: number[];
  lap_length?: number;
  turns?: number;
  bounds?: [number, number, number, number];
}

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
