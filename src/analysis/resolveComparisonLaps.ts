import type { ComparisonLapRoles } from "../domain/comparisonContextTypes";
import type { AnalysisMetadata } from "../domain/metadataTypes";

export const activeLapCountUnsupportedReason = "active_lap_count";

export class ComparisonLapResolutionError extends Error {
  constructor(
    message: string,
    readonly reason: string = activeLapCountUnsupportedReason,
  ) {
    super(message);
    this.name = "ComparisonLapResolutionError";
  }
}

export function resolveComparisonLaps(
  analysis: AnalysisMetadata,
): ComparisonLapRoles {
  const activeLaps = analysis.laps.filter((lap) => lap.isActive !== false);

  if (activeLaps.length !== 2) {
    throw new ComparisonLapResolutionError(
      `V1 comparison can analyze exactly two active laps, received ${activeLaps.length}`,
    );
  }

  const [first, second] = activeLaps;
  if (!Number.isFinite(first.lapTimeSec) || !Number.isFinite(second.lapTimeSec)) {
    throw new ComparisonLapResolutionError(
      "V1 comparison requires finite lap times for both active laps",
      "non_finite_active_lap_time",
    );
  }

  if (first.lapTimeSec === second.lapTimeSec) {
    throw new ComparisonLapResolutionError(
      "V1 comparison cannot resolve equal active lap times",
      "equal_active_lap_times",
    );
  }

  const reference = first.lapTimeSec < second.lapTimeSec ? first : second;
  const target = reference === first ? second : first;

  return {
    referenceLapId: reference.id,
    targetLapId: target.id,
  };
}
