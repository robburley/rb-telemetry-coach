import type { ComparisonLapRoles } from "../domain/comparisonContextTypes";
import type { AnalysisMetadata } from "../domain/metadataTypes";
import type { Garage61CapturedResponse } from "../garage61/network";
import type {
  Garage61AnalysisUrlState,
  Garage61UrlObserverSnapshot,
} from "../garage61/url";
import type { TelemetryProvider } from "../providers/types";

export type ExtensionMessage =
  | {
      type: "garage61-route-changed";
      route: Garage61AnalysisUrlState;
    }
  | {
      type: "garage61-response-captured";
      response: Garage61CapturedResponse;
    }
  | {
      type: "garage61-panel-ready";
    };

export interface Garage61CapturedResponseWindowMessage {
  source: "garage61-telemetry-coach";
  type: "garage61-telemetry-captured-response";
  response: Garage61CapturedResponse;
}

export interface Garage61RouteChangedWindowMessage {
  source: "garage61-telemetry-coach";
  type: "garage61-telemetry-route-changed";
  snapshot: Garage61UrlObserverSnapshot;
}

export type Garage61TelemetryCoachWindowMessage =
  | Garage61CapturedResponseWindowMessage
  | Garage61RouteChangedWindowMessage;

export interface GenerateLiveReportOptions {
  analysis: AnalysisMetadata;
  roles: ComparisonLapRoles;
  provider: Pick<TelemetryProvider, "getLapTelemetry">;
  zoomRaw: string | undefined | null;
}
