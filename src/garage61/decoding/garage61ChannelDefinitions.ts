import type { Garage61KnownChannelDefinition } from "./types";

export type { Garage61KnownChannelDefinition } from "./types";

export const garage61KnownChannelDefinitions = [
  { id: 1, name: "speed_mps", dtype: "float32" },
  { id: 2, name: "lap_distance_pct", dtype: "float32" },
  { id: 3, name: "latitude", dtype: "float64" },
  { id: 4, name: "longitude", dtype: "float64" },
  { id: 5, name: "brake", dtype: "float32" },
  { id: 6, name: "throttle", dtype: "float32" },
  { id: 7, name: "steering_rad", dtype: "float32" },
  { id: 8, name: "gear", dtype: "int32" },
  { id: 11, name: "rpm", dtype: "float32" },
  { id: 27, name: "heading_rad", dtype: "float32" },
] as const satisfies readonly Garage61KnownChannelDefinition[];

export const garage61KnownChannelById: ReadonlyMap<
  number,
  Garage61KnownChannelDefinition
> = new Map(
  garage61KnownChannelDefinitions.map((definition) => [
    definition.id,
    definition,
  ]),
);
