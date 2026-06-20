import type { Garage61AnalysisUrlState } from "../garage61/url";
import type { Garage61CapturedResponse } from "../garage61/network";

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

interface ChromeRuntimeLike {
  runtime?: {
    sendMessage?: (
      message: ExtensionMessage,
      callback?: (response?: unknown) => void,
    ) => void;
    lastError?: {
      message?: string;
    };
    onMessage?: {
      addListener: (
        listener: (
          message: ExtensionMessage,
          sender: unknown,
          sendResponse: (response?: unknown) => void,
        ) => void,
      ) => void;
    };
  };
}

export function sendExtensionMessage(message: ExtensionMessage): void {
  const chromeApi = (globalThis as { chrome?: ChromeRuntimeLike }).chrome;
  if (!chromeApi?.runtime?.sendMessage) {
    return;
  }

  chromeApi.runtime.sendMessage(message, () => {
    void chromeApi.runtime?.lastError;
  });
}
