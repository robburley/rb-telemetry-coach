import {
  parseGarage61AnalysisUrl,
  type Garage61AnalysisUrlState,
} from "./parseGarage61AnalysisUrl";

type HistoryMethod = "pushState" | "replaceState";

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
