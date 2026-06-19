import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { generateAnalysisReport } from "../analysis/report";
import { resolveComparisonLaps } from "../analysis/resolveComparisonLaps";
import { validateDistanceSlice } from "../analysis/slicing";
import type {
  AnalysisMetadata,
  AnalysisReport,
  ComparisonLapRoles,
} from "../domain/types";
import {
  observeGarage61UrlChanges,
  parseGarage61AnalysisUrl,
  parseGarage61ZoomParam,
  type Garage61AnalysisUrlState,
} from "../garage61/url";
import { Garage61PageNetworkProvider } from "../providers/Garage61PageNetworkProvider";
import { CoachPanel } from "../ui/CoachPanel";
import { defaultZoomInput } from "../ui/exampleScenario";
import uiStyles from "../ui/styles.css?inline";
import {
  GARAGE61_CAPTURED_RESPONSE_EVENT,
  type Garage61CapturedResponseWindowMessage,
} from "./injectedPageObserver";

const ROOT_ID = "__garage61_telemetry_coach_root";
const INITIAL_VISIBLE_FINDINGS = 5;
const DEBUG_PREFIX = "[Garage61 Telemetry Coach]";

interface LiveScenario {
  analysis: AnalysisMetadata;
  roles: ComparisonLapRoles;
}

function injectCoachPanel(): void {
  console.info(DEBUG_PREFIX, "Injecting coach panel", {
    href: window.location.href,
    existingRoot: document.getElementById(ROOT_ID) !== null,
  });
  document.getElementById(ROOT_ID)?.remove();

  const host = document.createElement("div");
  host.id = ROOT_ID;
  host.style.position = "fixed";
  host.style.top = "16px";
  host.style.right = "16px";
  host.style.zIndex = "2147483647";
  host.style.width = "min(460px, calc(100vw - 32px))";
  host.style.maxHeight = "calc(100vh - 32px)";
  host.style.overflow = "auto";

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

  console.info(DEBUG_PREFIX, "Coach panel mounted");
}

function ExtensionPanel(): JSX.Element {
  const provider = useMemo(() => new Garage61PageNetworkProvider(), []);
  const [route, setRoute] = useState<Garage61AnalysisUrlState>(() =>
    parseGarage61AnalysisUrl(window.location.href),
  );
  const [zoomInput, setZoomInput] = useState(route.zoomRaw ?? defaultZoomInput);
  const [scenario, setScenario] = useState<LiveScenario | undefined>();
  const [report, setReport] = useState<AnalysisReport | undefined>();
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_FINDINGS);
  const [error, setError] = useState<string | undefined>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasLiveTelemetry, setHasLiveTelemetry] = useState(false);

  const referenceLap = scenario?.analysis.laps.find(
    (lap) => lap.id === scenario.roles.referenceLapId,
  );
  const targetLap = scenario?.analysis.laps.find(
    (lap) => lap.id === scenario.roles.targetLapId,
  );

  useEffect(() => {
    console.info(DEBUG_PREFIX, "Extension panel effect started; waiting for main-world page observer messages");

    async function refreshLiveScenario(analysisId: string | undefined): Promise<void> {
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
        console.info(DEBUG_PREFIX, "Loaded live captured scenario", {
          analysisId: analysis.id,
          track: analysis.track.name,
          car: analysis.car.name,
          referenceLapId: roles.referenceLapId,
          targetLapId: roles.targetLapId,
          hasReferenceTelemetry: provider.hasCapturedLapTelemetry(roles.referenceLapId),
          hasTargetTelemetry: provider.hasCapturedLapTelemetry(roles.targetLapId),
        });
      } catch (caught) {
        setHasLiveTelemetry(false);
        console.info(DEBUG_PREFIX, "Live scenario is not ready yet", {
          analysisId,
          reason: caught instanceof Error ? caught.message : String(caught),
        });
      }
    }

    const observer = observeGarage61UrlChanges(
      (snapshot) => {
        console.info(DEBUG_PREFIX, "Observed Garage 61 route change", snapshot.route);
        setRoute(snapshot.route);
        if (snapshot.route.zoomRaw !== undefined) {
          setZoomInput(snapshot.route.zoomRaw);
        }
        void refreshLiveScenario(snapshot.route.analysisId);
      },
      { emitInitial: true },
    );

    const onCapturedResponse = (event: MessageEvent<unknown>) => {
      if (event.source !== window) {
        console.info(DEBUG_PREFIX, "Ignored message from non-window source");
        return;
      }
      const data = event.data as Partial<Garage61CapturedResponseWindowMessage>;
      if (
        data.source !== "garage61-telemetry-coach" ||
        data.type !== GARAGE61_CAPTURED_RESPONSE_EVENT ||
        !data.response
      ) {
        if (data.source === "garage61-telemetry-coach") {
          console.warn(DEBUG_PREFIX, "Ignored malformed capture message", data);
        }
        return;
      }

      console.info(DEBUG_PREFIX, "Received captured response from page bridge", {
        kind: data.response.kind,
        url: data.response.url,
        routeAnalysisId: data.response.routeAnalysisId,
      });
      provider.ingestCapturedResponse(data.response);
      void refreshLiveScenario(
        data.response.routeAnalysisId ?? parseGarage61AnalysisUrl(window.location.href).analysisId,
      );
    };

    window.addEventListener("message", onCapturedResponse);

    return () => {
      console.info(DEBUG_PREFIX, "Extension panel cleanup");
      observer.disconnect();
      window.removeEventListener("message", onCapturedResponse);
    };
  }, [provider]);

  function analyze(): void {
    setIsAnalyzing(true);
    setError(undefined);
    setVisibleLimit(INITIAL_VISIBLE_FINDINGS);

    void (async () => {
      try {
        if (!scenario) {
          throw new Error("Waiting for live Garage 61 analysis, track, and telemetry captures.");
        }
        if (!hasLiveTelemetry) {
          throw new Error("Waiting for both live Garage 61 lap telemetry captures.");
        }

        const parsed = parseGarage61ZoomParam(zoomInput);
        if (parsed.status !== "slice") {
          setReport({
            status: parsed.status,
            reason: parsed.reason,
            analysisId: scenario.analysis.id,
            referenceLapId: scenario.roles.referenceLapId,
            targetLapId: scenario.roles.targetLapId,
            findings: [],
          });
          return;
        }

        const validation = validateDistanceSlice(parsed.slice);
        if (validation.status !== "valid") {
          setReport({
            status: validation.status,
            reason: validation.reason,
            analysisId: scenario.analysis.id,
            referenceLapId: scenario.roles.referenceLapId,
            targetLapId: scenario.roles.targetLapId,
            slice: parsed.slice,
            findings: [],
          });
          return;
        }

        const [reference, target] = await Promise.all([
          provider.getLapTelemetry(scenario.roles.referenceLapId),
          provider.getLapTelemetry(scenario.roles.targetLapId),
        ]);

        setReport(
          generateAnalysisReport({
            analysis: scenario.analysis,
            roles: scenario.roles,
            reference,
            target,
            slice: parsed.slice,
          }),
        );
      } catch (caught) {
        setReport(undefined);
        setError(caught instanceof Error ? caught.message : "Analysis failed");
      } finally {
        setIsAnalyzing(false);
      }
    })();
  }

  return (
    <CoachPanel
      analysisTitle={route.analysisId ? `Garage 61 ${route.analysisId}` : "Garage 61 page"}
      carName={scenario?.analysis.car.name ?? "Waiting for live capture"}
      trackName={`${scenario?.analysis.track.name ?? "Live Garage 61 analysis"}${
        scenario?.analysis.track.variant ? ` - ${scenario.analysis.track.variant}` : ""
      }`}
      referenceLap={referenceLap}
      targetLap={targetLap}
      zoomInput={zoomInput}
      visibleLimit={visibleLimit}
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
      onZoomInputChange={setZoomInput}
      onAnalyze={analyze}
      onShowMore={() => setVisibleLimit((current) => current + 5)}
    />
  );
}

const extensionStyles = `
  :host {
    all: initial;
    color-scheme: light;
  }

  .coach-shell {
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .session-band,
  .control-band {
    grid-template-columns: 1fr;
  }

  .session-band,
  .control-band,
  .findings-band {
    padding-left: 16px;
    padding-right: 16px;
  }

  h1 {
    font-size: 2rem;
  }
`;

injectCoachPanel();
