import type { TelemetrySourceSummary } from "../../domain/telemetryTypes";

export interface NormaliseGarage61TelemetryOptions {
  lapId: string;
  provider?: TelemetrySourceSummary["provider"];
}
