import { describe, expect, it, vi } from "vitest";
import { observeGarage61UrlChanges } from "../../../src";

describe("observeGarage61UrlChanges", () => {
  it("emits initial route state when requested", () => {
    const fakeWindow = createFakeWindow(
      "https://garage61.net/app/analysis/01KVBECPC8BM15DJ7X80X1RGCT?z=354-1200",
    );
    const onChange = vi.fn();

    const observer = observeGarage61UrlChanges(onChange, {
      window: fakeWindow,
      emitInitial: true,
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].route).toMatchObject({
      analysisId: "01KVBECPC8BM15DJ7X80X1RGCT",
      zoomRaw: "354-1200",
    });

    observer.disconnect();
  });

  it("observes pushState and replaceState changes once per href change", () => {
    const fakeWindow = createFakeWindow(
      "https://garage61.net/app/analysis/laps/01KVBECPC8BM15DJ7X80X1RGCT?z=354-1200",
    );
    const onChange = vi.fn();

    const observer = observeGarage61UrlChanges(onChange, { window: fakeWindow });

    fakeWindow.history.pushState({}, "", "?z=500-900");
    fakeWindow.history.replaceState({}, "", "?z=600-1000");
    fakeWindow.history.replaceState({}, "", "?z=600-1000");

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[0][0].route.zoomRaw).toBe("500-900");
    expect(onChange.mock.calls[0][0].route.isEligibleAnalysisRoute).toBe(true);
    expect(onChange.mock.calls[1][0].route.zoomRaw).toBe("600-1000");
    expect(onChange.mock.calls[1][0].route.isEligibleAnalysisRoute).toBe(true);

    observer.disconnect();
  });

  it("reports eligibility changes across Garage 61 SPA route transitions", () => {
    const fakeWindow = createFakeWindow(
      "https://garage61.net/app/analysis/laps/01KVBECPC8BM15DJ7X80X1RGCT?z=354-1200",
    );
    const onChange = vi.fn();

    const observer = observeGarage61UrlChanges(onChange, {
      window: fakeWindow,
      emitInitial: true,
    });

    fakeWindow.history.pushState({}, "", "/app/analysis/01KVBECPC8BM15DJ7X80X1RGCT");
    fakeWindow.history.pushState({}, "", "/app/analysis/laps/01KVBECPC8BM15DJ7X80X1RGCT?z=500-900");

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange.mock.calls[0][0].route.isEligibleAnalysisRoute).toBe(true);
    expect(onChange.mock.calls[1][0].route.isEligibleAnalysisRoute).toBe(false);
    expect(onChange.mock.calls[2][0].route).toMatchObject({
      analysisId: "01KVBECPC8BM15DJ7X80X1RGCT",
      isEligibleAnalysisRoute: true,
      zoomRaw: "500-900",
    });

    observer.disconnect();
  });

  it("observes popstate and restores patched history on disconnect", () => {
    const fakeWindow = createFakeWindow(
      "https://garage61.net/app/analysis/01KVBECPC8BM15DJ7X80X1RGCT?z=354-1200",
    );
    const originalPushState = fakeWindow.history.pushState;
    const onChange = vi.fn();

    const observer = observeGarage61UrlChanges(onChange, { window: fakeWindow });
    fakeWindow.setHref("https://garage61.net/app/analysis/01KVBECPC8BM15DJ7X80X1RGCT?z=700-900");
    fakeWindow.dispatch("popstate");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].route.zoomRaw).toBe("700-900");

    observer.disconnect();
    expect(fakeWindow.history.pushState).toBe(originalPushState);
  });
});

function createFakeWindow(initialHref: string) {
  const listeners = new Map<string, Set<() => void>>();
  const location = { href: initialHref };

  function updateHref(url?: string | URL | null): void {
    if (url === undefined || url === null) {
      return;
    }

    location.href = new URL(String(url), location.href).href;
  }

  return {
    location,
    history: {
      pushState(_data: unknown, _unused: string, url?: string | URL | null) {
        updateHref(url);
      },
      replaceState(_data: unknown, _unused: string, url?: string | URL | null) {
        updateHref(url);
      },
    },
    addEventListener(type: string, listener: () => void) {
      const current = listeners.get(type) ?? new Set<() => void>();
      current.add(listener);
      listeners.set(type, current);
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type: string) {
      for (const listener of listeners.get(type) ?? []) {
        listener();
      }
    },
    setHref(nextHref: string) {
      location.href = nextHref;
    },
  };
}
