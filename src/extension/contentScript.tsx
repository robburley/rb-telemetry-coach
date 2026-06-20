import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ComparisonLapResolutionError,
  resolveComparisonLaps,
} from "../analysis/resolveComparisonLaps";
import type { ComparisonLapRoles } from "../domain/comparisonContextTypes";
import type { AnalysisMetadata } from "../domain/metadataTypes";
import type { AnalysisReport } from "../domain/reportTypes";
import {
  observeGarage61UrlChanges,
  parseGarage61AnalysisUrl,
  type Garage61AnalysisUrlState,
} from "../garage61/url";
import { Garage61PageNetworkProvider } from "../providers/Garage61PageNetworkProvider";
import { CoachPanel } from "../ui/CoachPanel";
import { CoachPanelShell } from "../ui/CoachPanelShell";
import { formatTrackTitle } from "../ui/formatting";
import uiStyles from "../ui/styles.css?inline";
import {
  GARAGE61_CAPTURED_RESPONSE_EVENT,
  GARAGE61_ROUTE_CHANGED_EVENT,
  type Garage61TelemetryCoachWindowMessage,
} from "./injectedPageObserver";
import { generateLiveReportForZoom } from "./liveReport";

const ROOT_ID = "__rb_telemetry_coach_root";

interface LiveScenario {
  analysis: AnalysisMetadata;
  roles: ComparisonLapRoles;
}

function injectCoachPanel(): void {
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const host = document.createElement("div");
  host.id = ROOT_ID;
  host.style.position = "fixed";
  host.style.top = "16px";
  host.style.right = "16px";
  host.style.zIndex = "2147483647";
  host.style.width = "auto";
  host.style.maxHeight = "calc(100vh - 32px)";
  host.style.overflow = "visible";
  host.style.pointerEvents = "none";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `${uiStyles}\n${extensionStyles}`;
  const mount = document.createElement("div");
  shadow.append(style, mount);
  document.documentElement.append(host);

  createRoot(mount).render(
    <StrictMode>
      <ExtensionPanel />
    </StrictMode>,
  );
}

function ExtensionPanel(): JSX.Element {
  const provider = useMemo(() => new Garage61PageNetworkProvider(), []);
  const [route, setRoute] = useState<Garage61AnalysisUrlState>(() =>
    parseGarage61AnalysisUrl(window.location.href),
  );
  const [scenario, setScenario] = useState<LiveScenario | undefined>();
  const [report, setReport] = useState<AnalysisReport | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasLiveTelemetry, setHasLiveTelemetry] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const activeReportRequestId = useRef(0);
  const lastAnalyzedRouteState = useRef<string | undefined>();

  const referenceLap = scenario?.analysis.laps.find(
    (lap) => lap.id === scenario.roles.referenceLapId,
  );
  const targetLap = scenario?.analysis.laps.find(
    (lap) => lap.id === scenario.roles.targetLapId,
  );

  const refreshLiveScenario = useCallback(
    async (analysisId: string | undefined): Promise<void> => {
      if (!analysisId) {
        return;
      }

      try {
        const analysis = await provider.getAnalysis(analysisId);
        const roles = resolveComparisonLaps(analysis);
        setScenario({ analysis, roles });
        const nextHasLiveTelemetry =
          provider.hasCapturedLapTelemetry(roles.referenceLapId) &&
          provider.hasCapturedLapTelemetry(roles.targetLapId);
        setHasLiveTelemetry(nextHasLiveTelemetry);
        setError(undefined);
      } catch (caught) {
        setHasLiveTelemetry(false);
        if (caught instanceof ComparisonLapResolutionError) {
          setScenario(undefined);
          setReport({
            status: "unsupported",
            reason: caught.reason,
            analysisId,
            findings: [],
          });
          setError(undefined);
          return;
        }
      }
    },
    [provider],
  );

  const runLiveReport = useCallback(
    (source: "manual" | "zoom", zoomRaw: string | undefined | null = route.zoomRaw): void => {
      if (!scenario) {
        setReport(undefined);
        setError("Waiting for live Garage 61 analysis, track, and telemetry captures.");
        return;
      }
      if (!hasLiveTelemetry) {
        setReport(undefined);
        setError("Waiting for both live Garage 61 lap telemetry captures.");
        return;
      }

      const requestId = activeReportRequestId.current + 1;
      activeReportRequestId.current = requestId;
      const analyzedKey = reportKey(scenario.analysis.id, zoomRaw);

      setIsAnalyzing(true);
      setError(undefined);

      void (async () => {
        try {
          const nextReport = await generateLiveReportForZoom({
            analysis: scenario.analysis,
            roles: scenario.roles,
            provider,
            zoomRaw,
          });

          if (activeReportRequestId.current !== requestId) {
            return;
          }

          setReport(nextReport);
          lastAnalyzedRouteState.current = analyzedKey;
        } catch (caught) {
          if (activeReportRequestId.current !== requestId) {
            return;
          }

          setReport(undefined);
          setError(caught instanceof Error ? caught.message : "Analysis failed");
        } finally {
          if (activeReportRequestId.current === requestId) {
            setIsAnalyzing(false);
          }
        }
      })();
    },
    [hasLiveTelemetry, provider, route.zoomRaw, scenario],
  );

  useEffect(() => {
    function applyRouteSnapshot(snapshot: { route: Garage61AnalysisUrlState }): void {
      setRoute(snapshot.route);
      if (snapshot.route.isEligibleAnalysisRoute) {
        void refreshLiveScenario(snapshot.route.analysisId);
      }
    }

    const observer = observeGarage61UrlChanges(
      applyRouteSnapshot,
      { emitInitial: true },
    );

    const onCapturedResponse = (event: MessageEvent<unknown>) => {
      if (event.source !== window) {
        return;
      }
      const data = event.data as Partial<Garage61TelemetryCoachWindowMessage>;
      if (data.source !== "garage61-telemetry-coach") {
        return;
      }

      if (data.type === GARAGE61_ROUTE_CHANGED_EVENT) {
        if (!data.snapshot) {
          return;
        }

        applyRouteSnapshot(data.snapshot);
        return;
      }

      if (data.type !== GARAGE61_CAPTURED_RESPONSE_EVENT || !data.response) {
        return;
      }

      provider.ingestCapturedResponse(data.response);
      const currentRoute = parseGarage61AnalysisUrl(window.location.href);
      if (currentRoute.isEligibleAnalysisRoute) {
        void refreshLiveScenario(data.response.routeAnalysisId ?? currentRoute.analysisId);
      }
    };

    window.addEventListener("message", onCapturedResponse);

    return () => {
      observer.disconnect();
      window.removeEventListener("message", onCapturedResponse);
    };
  }, [provider, refreshLiveScenario]);

  useEffect(() => {
    activeReportRequestId.current += 1;
    lastAnalyzedRouteState.current = undefined;
    setReport(undefined);
    setError(undefined);
  }, [route.analysisId]);

  useEffect(() => {
    if (!route.isEligibleAnalysisRoute || !report || !scenario || !hasLiveTelemetry) {
      return;
    }

    const currentKey = reportKey(scenario.analysis.id, route.zoomRaw);
    if (lastAnalyzedRouteState.current === currentKey) {
      return;
    }

    runLiveReport("zoom", route.zoomRaw);
  }, [
    hasLiveTelemetry,
    report,
    route.isEligibleAnalysisRoute,
    runLiveReport,
    route.zoomRaw,
    scenario,
  ]);

  if (!route.isEligibleAnalysisRoute) {
    return <div className="coach-route-hidden" aria-hidden="true" />;
  }

  return (
    <CoachPanelShell
      isExpanded={isExpanded}
      isBusy={isAnalyzing}
      onExpand={() => setIsExpanded(true)}
      onMinimize={() => setIsExpanded(false)}
    >
      <CoachPanel
        analysisTitle={route.analysisId ? `Garage 61 ${route.analysisId}` : "Garage 61 page"}
        carName={scenario?.analysis.car.name ?? "Waiting for live capture"}
        trackName={formatTrackTitle(scenario?.analysis.track)}
        referenceLap={referenceLap}
        targetLap={targetLap}
        currentSlice={route.zoom.status === "slice" ? route.zoom.slice : undefined}
        report={report}
        error={error}
        isAnalyzing={isAnalyzing}
        isAnalyzeDisabled={!scenario || !hasLiveTelemetry}
        analyzeDisabledReason={
          !scenario
            ? "Waiting for live Garage 61 analysis and track captures"
            : !hasLiveTelemetry
              ? "Waiting for both live lap telemetry captures"
            : undefined
        }
        onAnalyze={() => runLiveReport("manual")}
      />
    </CoachPanelShell>
  );
}

function reportKey(analysisId: string, zoomRaw: string | undefined | null): string {
  return `${analysisId}:${zoomRaw ?? ""}`;
}

const extensionStyles = `
  :host {
    all: initial;
    color: #e8eef0;
    color-scheme: dark;
    font-family:
      system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans",
      "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
      "Segoe UI Symbol", "Noto Color Emoji";
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }

  :host,
  * {
    box-sizing: border-box;
  }

  .coach-shell {
    width: 100%;
    margin: 0;
    padding: 0;
    pointer-events: auto;
  }

  .coach-panel-frame {
    width: min(460px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    overflow: hidden;
    pointer-events: auto;
  }

  .coach-panel-scroll {
    max-height: calc(100vh - 86px);
    overflow: auto;
    pointer-events: auto;
  }

  .coach-launcher {
    pointer-events: auto;
  }

  .coach-route-hidden {
    display: none;
  }

  .session-band,
  .session-actions {
    grid-template-columns: 1fr;
  }

  .session-band,
  .findings-band {
    padding-left: 16px;
    padding-right: 16px;
  }

  h1 {
    font-size: 2rem;
  }
`;

injectCoachPanel();
