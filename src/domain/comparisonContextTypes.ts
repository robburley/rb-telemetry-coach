import type { AnalysisMetadata } from "./metadataTypes";
import type { DistanceSlice } from "./reportTypes";
import type { LapTelemetry } from "./telemetryTypes";

export interface ComparisonLapRoles {
  referenceLapId: string;
  targetLapId: string;
}

export interface ComparisonContext {
  analysis: AnalysisMetadata;
  roles: ComparisonLapRoles;
  slice: DistanceSlice;
  reference: LapTelemetry;
  target: LapTelemetry;
}
