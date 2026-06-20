import { parseGarage61AnalysisUrl } from "../url";
import { classifyGarage61ResponseUrl } from "./garage61ResponseClassifier";
import type {
  Garage61PageResponseObserver,
  Garage61PageResponseObserverOptions,
  Garage61ResponseClassification,
} from "./types";

export type {
  Garage61CapturedJsonResponse,
  Garage61CapturedResponse,
  Garage61CapturedTdfResponse,
  Garage61PageResponseObserver,
  Garage61PageResponseObserverOptions,
} from "./types";

type FetchLike = typeof fetch;
type ObservableWindow = Window & {
  fetch: FetchLike;
  XMLHttpRequest: typeof XMLHttpRequest;
};

export function observeGarage61PageResponses(
  options: Garage61PageResponseObserverOptions,
): Garage61PageResponseObserver {
  const win = (options.window ?? window) as ObservableWindow;
  const originalFetch = win.fetch.bind(win);
  const OriginalXhr = win.XMLHttpRequest;

  win.fetch = patchFetch(originalFetch, win, options) as FetchLike;
  win.XMLHttpRequest = makeObservedXmlHttpRequest(
    OriginalXhr,
    win,
    options,
  ) as typeof XMLHttpRequest;

  return {
    disconnect() {
      win.fetch = originalFetch;
      win.XMLHttpRequest = OriginalXhr;
    },
  };
}

function patchFetch(
  originalFetch: FetchLike,
  win: Window,
  options: Garage61PageResponseObserverOptions,
): FetchLike {
  return (async (...args: Parameters<FetchLike>) => {
    const response = await originalFetch(...args);
    const requestUrl = requestInfoToUrl(args[0]) ?? response.url;
    void captureResponse(requestUrl, response, win, options);
    return response;
  }) as FetchLike;
}

function makeObservedXmlHttpRequest(
  OriginalXhr: typeof XMLHttpRequest,
  win: Window,
  options: Garage61PageResponseObserverOptions,
): typeof XMLHttpRequest {
  return class ObservedXmlHttpRequest extends OriginalXhr {
    private requestUrl?: string;

    open(
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ): void {
      this.requestUrl = String(url);
      super.open(method, url, async ?? true, username ?? null, password ?? null);
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      this.addEventListener("load", () => {
        void captureXhrResponse(this, this.requestUrl, win, options);
      });
      super.send(body);
    }
  };
}

async function captureXhrResponse(
  xhr: XMLHttpRequest,
  requestUrl: string | undefined,
  win: Window,
  options: Garage61PageResponseObserverOptions,
): Promise<void> {
  try {
    const classification = classifyGarage61ResponseUrl(requestUrl ?? xhr.responseURL);
    if (classification.kind === "unknown") {
      return;
    }

    if (classification.kind === "lap-tdf") {
      const body = xhrResponseToArrayBuffer(xhr.response);
      if (!body) {
        return;
      }
      emitCapturedResponse(classification, body, win, options);
      return;
    }

    const body = xhrJsonResponseBody(xhr);
    if (body !== undefined) {
      emitCapturedResponse(classification, body, win, options);
    }
  } catch (error) {
    options.onError?.(error);
  }
}

async function captureResponse(
  requestUrl: string,
  response: Response,
  win: Window,
  options: Garage61PageResponseObserverOptions,
): Promise<void> {
  try {
    const classification = classifyGarage61ResponseUrl(requestUrl);
    if (classification.kind === "unknown") {
      return;
    }

    if (classification.kind === "lap-tdf") {
      const body = await response.clone().arrayBuffer();
      emitCapturedResponse(classification, body, win, options);
      return;
    }

    const body = await response.clone().json();
    emitCapturedResponse(classification, body, win, options);
  } catch (error) {
    options.onError?.(error);
  }
}

function emitCapturedResponse(
  classification: Exclude<Garage61ResponseClassification, { kind: "unknown" }>,
  body: unknown,
  win: Window,
  options: Garage61PageResponseObserverOptions,
): void {
  const routeAnalysisId = parseGarage61AnalysisUrl(win.location.href).analysisId;
  const capturedAtMs = Date.now();

  if (classification.kind === "lap-tdf" && body instanceof ArrayBuffer) {
    options.onCapturedResponse({
      kind: "lap-tdf",
      url: classification.url,
      capturedAtMs,
      routeAnalysisId,
      lapId: classification.lapId,
      body,
    });
    return;
  }

  if (classification.kind === "analysis" || classification.kind === "track") {
    options.onCapturedResponse({
      kind: classification.kind,
      url: classification.url,
      capturedAtMs,
      routeAnalysisId,
      body,
    });
  }
}

function requestInfoToUrl(input: RequestInfo | URL): string | undefined {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

function xhrResponseToArrayBuffer(response: unknown): ArrayBuffer | undefined {
  if (response instanceof ArrayBuffer) {
    return response;
  }
  if (response instanceof Blob) {
    return undefined;
  }
  if (typeof response === "string") {
    return new TextEncoder().encode(response).buffer;
  }
  return undefined;
}

function xhrJsonResponseBody(xhr: XMLHttpRequest): unknown {
  if (xhr.responseType === "" || xhr.responseType === "text") {
    return xhrResponseToJson(xhr.responseText || xhr.response);
  }

  if (xhr.responseType === "json") {
    return xhr.response;
  }

  return undefined;
}

function xhrResponseToJson(response: unknown): unknown {
  if (typeof response === "string") {
    return JSON.parse(response);
  }
  return response;
}
