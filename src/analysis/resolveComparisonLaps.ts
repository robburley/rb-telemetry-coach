import type { AnalysisMetadata, ComparisonLapRoles } from "../domain/types";

export function resolveComparisonLaps(
  analysis: AnalysisMetadata,
): ComparisonLapRoles {
  if (analysis.laps.length !== 2) {
    throw new Error(
      `V1 comparison requires exactly two laps, received ${analysis.laps.length}`,
    );
  }

  const [first, second] = analysis.laps;
  if (!Number.isFinite(first.lapTimeSec) || !Number.isFinite(second.lapTimeSec)) {
    throw new Error("V1 comparison requires finite lap times for both laps");
  }

  if (first.lapTimeSec === second.lapTimeSec) {
    throw new Error("V1 comparison cannot resolve equal lap times");
  }

  const reference = first.lapTimeSec < second.lapTimeSec ? first : second;
  const target = reference === first ? second : first;

  return {
    referenceLapId: reference.id,
    targetLapId: target.id,
  };
}
