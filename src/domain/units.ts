export type Metres = number;
export type Seconds = number;
export type LapDistancePct = number;
export type SpeedMetresPerSecond = number;
export type SpeedKilometresPerHour = number;
export type Radians = number;
export type Degrees = number;

export const METRES_PER_KILOMETRE = 1000;
export const SECONDS_PER_HOUR = 3600;

export function metresPerSecondToKilometresPerHour(
  speedMs: SpeedMetresPerSecond,
): SpeedKilometresPerHour {
  return (speedMs * SECONDS_PER_HOUR) / METRES_PER_KILOMETRE;
}
