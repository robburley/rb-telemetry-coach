import {
  observeGarage61PageResponses,
  type Garage61CapturedResponse,
} from "../garage61/network";
import {
  observeGarage61UrlChanges,
  type Garage61UrlObserverSnapshot,
} from "../garage61/url";

export const GARAGE61_CAPTURED_RESPONSE_EVENT = "garage61-telemetry-captured-response";
export const GARAGE61_ROUTE_CHANGED_EVENT = "garage61-telemetry-route-changed";
const DEBUG_PREFIX = "[Garage61 Telemetry Coach]";

export interface Garage61CapturedResponseWindowMessage {
  source: "garage61-telemetry-coach";
  type: typeof GARAGE61_CAPTURED_RESPONSE_EVENT;
  response: Garage61CapturedResponse;
}

export interface Garage61RouteChangedWindowMessage {
  source: "garage61-telemetry-coach";
  type: typeof GARAGE61_ROUTE_CHANGED_EVENT;
  snapshot: Garage61UrlObserverSnapshot;
}

export type Garage61TelemetryCoachWindowMessage =
  | Garage61CapturedResponseWindowMessage
  | Garage61RouteChangedWindowMessage;

export function startGarage61InjectedPageObserver(win: Window = window): void {
  const globalKey = "__garage61TelemetryCoachObserver";
  const state = win as Window & {
    [globalKey]?: { disconnect(): void };
  };

  if (state[globalKey]) {
    console.info(DEBUG_PREFIX, "Injected page observer already started");
    return;
  }

  console.info(DEBUG_PREFIX, "Starting injected page observer", {
    href: win.location.href,
    origin: win.location.origin,
  });

  const responseObserver = observeGarage61PageResponses({
    window: win,
    onCapturedResponse(response) {
      console.info(DEBUG_PREFIX, "Posting captured response to content script", {
        kind: response.kind,
        url: response.url,
        routeAnalysisId: response.routeAnalysisId,
      });
      win.postMessage(
        {
          source: "garage61-telemetry-coach",
          type: GARAGE61_CAPTURED_RESPONSE_EVENT,
          response,
        } satisfies Garage61CapturedResponseWindowMessage,
        win.location.origin,
      );
    },
  });

  const routeObserver = observeGarage61UrlChanges(
    (snapshot) => {
      console.info(DEBUG_PREFIX, "Posting route change to content script", {
        href: snapshot.href,
        analysisId: snapshot.route.analysisId,
        zoomRaw: snapshot.route.zoomRaw,
        isEligibleAnalysisRoute: snapshot.route.isEligibleAnalysisRoute,
      });
      win.postMessage(
        {
          source: "garage61-telemetry-coach",
          type: GARAGE61_ROUTE_CHANGED_EVENT,
          snapshot,
        } satisfies Garage61RouteChangedWindowMessage,
        win.location.origin,
      );
    },
    { window: win },
  );

  state[globalKey] = {
    disconnect() {
      responseObserver.disconnect();
      routeObserver.disconnect();
    },
  };
}
