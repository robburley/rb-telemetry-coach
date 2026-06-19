import type { AnalysisMetadata, LapTelemetry } from "../domain/types";

export interface TelemetryProvider {
  getAnalysis(id: string): Promise<AnalysisMetadata>;
  getLapTelemetry(lapId: string): Promise<LapTelemetry>;
}
