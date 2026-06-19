import { parseGarage61AnalysisUrl } from "../url";
import {
  classifyGarage61ResponseUrl,
  type Garage61ResponseClassification,
} from "./garage61ResponseClassifier";

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

type FetchLike = typeof fetch;
type ObservableWindow = Window & {
  fetch: FetchLike;
  XMLHttpRequest: typeof XMLHttpRequest;
};

const DEBUG_PREFIX = "[Garage61 Telemetry Coach]";

export function observeGarage61PageResponses(
  options: Garage61PageResponseObserverOptions,
): Garage61PageResponseObserver {
  const win = (options.window ?? window) as ObservableWindow;
  const originalFetch = win.fetch.bind(win);
  const OriginalXhr = win.XMLHttpRequest;

  logDebug("Installing passive page response observer", {
    href: win.location.href,
    hasFetch: typeof win.fetch === "function",
    hasXhr: typeof win.XMLHttpRequest === "function",
  });

  win.fetch = patchFetch(originalFetch, win, options) as FetchLike;
  win.XMLHttpRequest = makeObservedXmlHttpRequest(
    OriginalXhr,
    win,
    options,
  ) as typeof XMLHttpRequest;

  return {
    disconnect() {
      logDebug("Disconnecting passive page response observer");
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
    logDebug("fetch completed", {
      requestUrl,
      responseUrl: response.url,
      status: response.status,
    });
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
      logDebug("XHR open", { method, url: this.requestUrl });
      super.open(method, url, async ?? true, username ?? null, password ?? null);
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      this.addEventListener("load", () => {
        logDebug("XHR load", {
          requestUrl: this.requestUrl,
          responseURL: this.responseURL,
          status: this.status,
          responseType: this.responseType,
        });
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
    logDebug("Classified XHR response", classification);
    if (classification.kind === "unknown") {
      return;
    }

    if (classification.kind === "lap-tdf") {
      const body = xhrResponseToArrayBuffer(xhr.response);
      if (!body) {
        logDebug("Skipped XHR TDF capture because response body was not readable", {
          responseType: xhr.responseType,
          responseURL: xhr.responseURL,
        });
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
    logDebug("Failed to capture XHR response", error);
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
    logDebug("Classified fetch response", classification);
    if (classification.kind === "unknown") {
      return;
    }

    if (classification.kind === "lap-tdf") {
      const body = await response.clone().arrayBuffer();
      logDebug("Cloned fetch TDF body", {
        lapId: classification.lapId,
        byteLength: body.byteLength,
      });
      emitCapturedResponse(classification, body, win, options);
      return;
    }

    const body = await response.clone().json();
    logDebug("Cloned fetch JSON body", { kind: classification.kind });
    emitCapturedResponse(classification, body, win, options);
  } catch (error) {
    logDebug("Failed to capture fetch response", error);
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
    logDebug("Emitting captured TDF response", {
      lapId: classification.lapId,
      routeAnalysisId,
      byteLength: body.byteLength,
    });
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
    logDebug("Emitting captured JSON response", {
      kind: classification.kind,
      routeAnalysisId,
    });
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

  logDebug("Skipped JSON capture because XHR responseType is not text/json", {
    responseType: xhr.responseType,
    responseURL: xhr.responseURL,
  });
  return undefined;
}

function xhrResponseToJson(response: unknown): unknown {
  if (typeof response === "string") {
    return JSON.parse(response);
  }
  return response;
}

function logDebug(message: string, details?: unknown): void {
  if (details === undefined) {
    console.info(DEBUG_PREFIX, message);
    return;
  }

  console.info(DEBUG_PREFIX, message, details);
}
