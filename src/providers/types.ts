import type { AnalysisMetadata } from "../domain/metadataTypes";
import type { LapTelemetry } from "../domain/telemetryTypes";

export interface TelemetryProvider {
  getAnalysis(id: string): Promise<AnalysisMetadata>;
  getLapTelemetry(lapId: string): Promise<LapTelemetry>;
}

export interface Garage61ExampleDataProviderOptions {
  fixtureDir?: string;
}

export interface Garage61PageNetworkProviderOptions {
  now?: () => number;
  pendingTdfTtlMs?: number;
}
