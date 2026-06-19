import {
  observeGarage61PageResponses,
  type Garage61CapturedResponse,
} from "../garage61/network";

export const GARAGE61_CAPTURED_RESPONSE_EVENT = "garage61-telemetry-captured-response";
const DEBUG_PREFIX = "[Garage61 Telemetry Coach]";

export interface Garage61CapturedResponseWindowMessage {
  source: "garage61-telemetry-coach";
  type: typeof GARAGE61_CAPTURED_RESPONSE_EVENT;
  response: Garage61CapturedResponse;
}

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

  state[globalKey] = observeGarage61PageResponses({
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
}
