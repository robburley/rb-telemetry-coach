import type { ExtensionMessage } from "./types";

export type { ExtensionMessage } from "./types";

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
