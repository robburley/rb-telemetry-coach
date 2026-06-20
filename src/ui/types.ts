import type { ComparisonLapRoles } from "../domain/comparisonContextTypes";
import type { AnalysisMetadata } from "../domain/metadataTypes";
import type { AnalysisReport, DistanceSlice } from "../domain/reportTypes";
import type { LapTelemetry } from "../domain/telemetryTypes";

export interface ExampleScenario {
  analysis: AnalysisMetadata;
  roles: ComparisonLapRoles;
  reference: LapTelemetry;
  target: LapTelemetry;
}

export interface AnalyzeZoomResult {
  report: AnalysisReport;
  slice?: DistanceSlice;
}
