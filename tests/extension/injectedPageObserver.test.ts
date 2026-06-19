import { describe, expect, it, vi } from "vitest";
import {
  GARAGE61_ROUTE_CHANGED_EVENT,
  startGarage61InjectedPageObserver,
  type Garage61RouteChangedWindowMessage,
} from "../../src/extension/injectedPageObserver";

describe("startGarage61InjectedPageObserver", () => {
  it("posts main-world route changes for Garage 61 zoom updates", () => {
    const fakeWindow = createFakeWindow(
      "https://garage61.net/app/analysis/laps/01KVBECPC8BM15DJ7X80X1RGCT?z=354-1200",
    );

    startGarage61InjectedPageObserver(fakeWindow as unknown as Window);
    fakeWindow.history.replaceState({}, "", "?z=500-900");

    const routeMessages = fakeWindow.postMessage.mock.calls
      .map(([message]) => message as Garage61RouteChangedWindowMessage)
      .filter((message) => message.type === GARAGE61_ROUTE_CHANGED_EVENT);

    expect(routeMessages).toHaveLength(1);
    expect(routeMessages[0].snapshot.route).toMatchObject({
      analysisId: "01KVBECPC8BM15DJ7X80X1RGCT",
      isEligibleAnalysisRoute: true,
      zoomRaw: "500-900",
    });
  });
});

function createFakeWindow(initialHref: string) {
  const listeners = new Map<string, Set<() => void>>();
  const location = new URL(initialHref) as URL & { href: string };

  function updateHref(url?: string | URL | null): void {
    if (url === undefined || url === null) {
      return;
    }

    const nextUrl = new URL(String(url), location.href);
    location.href = nextUrl.href;
  }

  return {
    location,
    fetch: vi.fn(async () => new Response(null, { status: 204 })),
    XMLHttpRequest: FakeXmlHttpRequest,
    postMessage: vi.fn(),
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
  };
}

class FakeXmlHttpRequest {
  response: unknown;
  responseText = "";
  responseType: XMLHttpRequestResponseType = "";
  responseURL = "";
  status = 0;

  open(): void {}

  send(): void {}

  addEventListener(): void {}
}
