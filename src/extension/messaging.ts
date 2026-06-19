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

const DEBUG_PREFIX = "[Garage61 Telemetry Coach]";
const NO_RUNTIME_RECEIVER_MESSAGE =
  "Could not establish connection. Receiving end does not exist.";

export function sendExtensionMessage(message: ExtensionMessage): void {
  const chromeApi = (globalThis as { chrome?: ChromeRuntimeLike }).chrome;
  if (!chromeApi?.runtime?.sendMessage) {
    console.warn(DEBUG_PREFIX, "chrome.runtime.sendMessage is unavailable", {
      type: message.type,
    });
    return;
  }

  console.info(DEBUG_PREFIX, "Sending extension runtime message", {
    type: message.type,
  });
  chromeApi.runtime.sendMessage(message, () => {
    const lastError = chromeApi.runtime?.lastError;
    if (lastError) {
      const log = lastError.message === NO_RUNTIME_RECEIVER_MESSAGE
        ? console.info
        : console.warn;
      log(DEBUG_PREFIX, "Runtime message reported lastError", {
        type: message.type,
        message: lastError.message,
        expectedWithoutBackgroundReceiver:
          lastError.message === NO_RUNTIME_RECEIVER_MESSAGE,
      });
    }
  });
}
