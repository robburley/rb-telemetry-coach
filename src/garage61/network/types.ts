export type Garage61CapturedResponseKind = "analysis" | "track" | "lap-tdf";

export type Garage61ResponseClassification =
  | Garage61AnalysisResponseClassification
  | Garage61TrackResponseClassification
  | Garage61LapTdfResponseClassification
  | Garage61UnknownResponseClassification;

export interface Garage61AnalysisResponseClassification {
  kind: "analysis";
  analysisId: string;
  url: string;
}

export interface Garage61TrackResponseClassification {
  kind: "track";
  trackId: string;
  url: string;
}

export interface Garage61LapTdfResponseClassification {
  kind: "lap-tdf";
  lapId: string;
  url: string;
}

export interface Garage61UnknownResponseClassification {
  kind: "unknown";
  url: string;
}

export type Garage61CapturedResponse =
  | Garage61CapturedJsonResponse
  | Garage61CapturedTdfResponse;

export interface Garage61CapturedJsonResponse {
  kind: "analysis" | "track";
  url: string;
  capturedAtMs: number;
  routeAnalysisId?: string;
  body: unknown;
}

export interface Garage61CapturedTdfResponse {
  kind: "lap-tdf";
  url: string;
  capturedAtMs: number;
  routeAnalysisId?: string;
  lapId: string;
  body: ArrayBuffer;
}

export interface Garage61PageResponseObserver {
  disconnect(): void;
}

export interface Garage61PageResponseObserverOptions {
  window?: Window;
  onCapturedResponse: (response: Garage61CapturedResponse) => void;
  onError?: (error: unknown) => void;
}
