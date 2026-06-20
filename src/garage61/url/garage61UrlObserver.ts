import {
  parseGarage61AnalysisUrl,
} from "./parseGarage61AnalysisUrl";
import type {
  Garage61UrlObserverHandle,
  Garage61UrlObserverOptions,
  Garage61UrlObserverSnapshot,
} from "./types";

type HistoryMethod = "pushState" | "replaceState";

export type {
  Garage61UrlObserverHandle,
  Garage61UrlObserverOptions,
  Garage61UrlObserverSnapshot,
} from "./types";

export function observeGarage61UrlChanges(
  onChange: (snapshot: Garage61UrlObserverSnapshot) => void,
  options: Garage61UrlObserverOptions = {},
): Garage61UrlObserverHandle {
  const observedWindow = options.window ?? window;
  let lastHref = observedWindow.location.href;
  const originalMethods = new Map<HistoryMethod, History[HistoryMethod]>();

  function readCurrent(): Garage61UrlObserverSnapshot {
    return {
      href: observedWindow.location.href,
      route: parseGarage61AnalysisUrl(observedWindow.location.href),
    };
  }

  function emitIfChanged(): void {
    const nextHref = observedWindow.location.href;
    if (nextHref === lastHref) {
      return;
    }

    lastHref = nextHref;
    onChange(readCurrent());
  }

  for (const method of ["pushState", "replaceState"] as const) {
    const original = observedWindow.history[method];
    originalMethods.set(method, original);
    observedWindow.history[method] = function patchedHistoryMethod(
      this: History,
      ...args: Parameters<History[typeof method]>
    ): ReturnType<History[typeof method]> {
      const result = original.apply(this, args);
      emitIfChanged();
      return result;
    } as History[typeof method];
  }

  observedWindow.addEventListener("popstate", emitIfChanged);

  if (options.emitInitial) {
    onChange(readCurrent());
  }

  return {
    disconnect() {
      observedWindow.removeEventListener("popstate", emitIfChanged);
      for (const [method, original] of originalMethods) {
        observedWindow.history[method] = original;
      }
    },
    current: readCurrent,
  };
}
