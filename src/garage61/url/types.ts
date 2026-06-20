import type { AnalysisReportStatus, DistanceSlice } from "../../domain/reportTypes";

export type Garage61ZoomParseReason =
  | "missing_slice"
  | "invalid_zoom"
  | "out_of_range";

export type Garage61ZoomParseResult =
  | {
      status: "slice";
      slice: DistanceSlice;
    }
  | {
      status: Exclude<AnalysisReportStatus, "complete" | "unavailable">;
      reason: Garage61ZoomParseReason;
      raw?: string;
    };

export interface Garage61AnalysisUrlState {
  url: string;
  analysisId?: string;
  isEligibleAnalysisRoute: boolean;
  zoomRaw?: string;
  zoom: Garage61ZoomParseResult;
}

interface ObservableHistory {
  pushState: History["pushState"];
  replaceState: History["replaceState"];
}

interface ObservableLocation {
  href: string;
}

interface ObservableWindow {
  history: ObservableHistory;
  location: ObservableLocation;
  addEventListener: (type: "popstate", listener: () => void) => void;
  removeEventListener: (type: "popstate", listener: () => void) => void;
}

export interface Garage61UrlObserverSnapshot {
  href: string;
  route: Garage61AnalysisUrlState;
}

export interface Garage61UrlObserverOptions {
  window?: ObservableWindow;
  emitInitial?: boolean;
}

export interface Garage61UrlObserverHandle {
  disconnect: () => void;
  current: () => Garage61UrlObserverSnapshot;
}
