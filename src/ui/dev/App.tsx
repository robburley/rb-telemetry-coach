import { useMemo, useState } from "react";
import type { AnalysisReport } from "../../domain/types";
import { CoachPanel } from "../CoachPanel";
import { CoachPanelShell } from "../CoachPanelShell";
import {
  analyzeExampleZoomInput,
  defaultZoomInput,
  loadExampleScenario,
} from "../exampleScenario";
import { formatTrackTitle } from "../formatting";
import { parseGarage61ZoomParam } from "../../garage61/url";

export function App(): JSX.Element {
  const scenario = useMemo(() => loadExampleScenario(), []);
  const defaultZoom = parseGarage61ZoomParam(defaultZoomInput);
  const [report, setReport] = useState<AnalysisReport | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const referenceLap = scenario.analysis.laps.find(
    (lap) => lap.id === scenario.roles.referenceLapId,
  );
  const targetLap = scenario.analysis.laps.find(
    (lap) => lap.id === scenario.roles.targetLapId,
  );

  function analyze(): void {
    setIsAnalyzing(true);
    setError(undefined);

    window.setTimeout(() => {
      try {
        const result = analyzeExampleZoomInput(defaultZoomInput);
        setReport(result.report);
      } catch (caught) {
        setReport(undefined);
        setError(caught instanceof Error ? caught.message : "Analysis failed");
      } finally {
        setIsAnalyzing(false);
      }
    }, 0);
  }

  return (
    <CoachPanelShell
      isExpanded={isExpanded}
      isBusy={isAnalyzing}
      onExpand={() => setIsExpanded(true)}
      onMinimize={() => setIsExpanded(false)}
    >
      <CoachPanel
        analysisTitle="Garage 61 example analysis"
        carName={scenario.analysis.car.name}
        trackName={formatTrackTitle(scenario.analysis.track)}
        referenceLap={referenceLap}
        targetLap={targetLap}
        currentSlice={defaultZoom.status === "slice" ? defaultZoom.slice : undefined}
        report={report}
        error={error}
        isAnalyzing={isAnalyzing}
        onAnalyze={analyze}
      />
    </CoachPanelShell>
  );
}
