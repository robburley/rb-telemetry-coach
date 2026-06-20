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
    return;
  }

  const responseObserver = observeGarage61PageResponses({
    window: win,
    onCapturedResponse(response) {
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
