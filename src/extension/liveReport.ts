import { generateAnalysisReport } from "../analysis/report";
import { validateDistanceSlice } from "../analysis/slicing";
import type { AnalysisReport } from "../domain/reportTypes";
import { parseGarage61ZoomParam } from "../garage61/url";
import type { GenerateLiveReportOptions } from "./types";

export type { GenerateLiveReportOptions } from "./types";

export async function generateLiveReportForZoom({
  analysis,
  roles,
  provider,
  zoomRaw,
}: GenerateLiveReportOptions): Promise<AnalysisReport> {
  const parsed = parseGarage61ZoomParam(zoomRaw);

  if (parsed.status !== "slice") {
    return {
      status: parsed.status,
      reason: parsed.reason,
      analysisId: analysis.id,
      referenceLapId: roles.referenceLapId,
      targetLapId: roles.targetLapId,
      findings: [],
    };
  }

  const validation = validateDistanceSlice(parsed.slice);
  if (validation.status !== "valid") {
    return {
      status: validation.status,
      reason: validation.reason,
      analysisId: analysis.id,
      referenceLapId: roles.referenceLapId,
      targetLapId: roles.targetLapId,
      slice: parsed.slice,
      findings: [],
    };
  }

  const [reference, target] = await Promise.all([
    provider.getLapTelemetry(roles.referenceLapId),
    provider.getLapTelemetry(roles.targetLapId),
  ]);

  return generateAnalysisReport({
    analysis,
    roles,
    reference,
    target,
    slice: parsed.slice,
  });
}
