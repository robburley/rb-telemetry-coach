import type { LapSummary } from "../domain/metadataTypes";
import type {
  AnalysisReport,
  CoachingFinding,
  DistanceSlice,
} from "../domain/reportTypes";
import {
  formatLapTime,
  formatSignedDelta,
  formatSlice,
  reportStatusMessage,
  severityLabel,
} from "./formatting";

interface CoachPanelProps {
  analysisTitle: string;
  carName: string;
  trackName: string;
  referenceLap?: LapSummary;
  targetLap?: LapSummary;
  currentSlice?: DistanceSlice;
  report?: AnalysisReport;
  isAnalyzing: boolean;
  isAnalyzeDisabled?: boolean;
  analyzeDisabledReason?: string;
  error?: string;
  onAnalyze: () => void;
}

export function CoachPanel({
  analysisTitle,
  carName,
  trackName,
  referenceLap,
  targetLap,
  currentSlice,
  report,
  isAnalyzing,
  isAnalyzeDisabled = false,
  analyzeDisabledReason,
  error,
  onAnalyze,
}: CoachPanelProps): JSX.Element {
  const findings = report?.findings ?? [];
  const analyzeDisabled = isAnalyzing || isAnalyzeDisabled;
  const displayedSlice = report?.slice ?? currentSlice;
  const isCompleteReport = report?.status === "complete";
  const reportTitle =
    report && report.status !== "complete" ? "Needs attention" : report ? reportStatusMessage(report) : "Ready";
  const analyzeButtonLabel = isAnalyzing
    ? "Analyzing"
    : isAnalyzeDisabled
      ? "Waiting"
      : `Analyze ${formatSlice(displayedSlice)}`;
  const targetDeltaSec =
    referenceLap && targetLap ? targetLap.lapTimeSec - referenceLap.lapTimeSec : undefined;

  return (
    <main className="coach-shell">
      <section className="session-band" aria-label="Current analysis">
        <div className="session-copy">
          <p className="eyebrow">RB Telemetry Coach</p>
          <div className="session-title-row">
            <h1>{trackName}</h1>
            <span>{carName}</span>
          </div>
        </div>
        <div className="session-stack">
          <div className="session-detail-grid">
            <LapBadge label="Reference" lap={referenceLap} />
            <LapBadge label="Target" lap={targetLap} deltaSec={targetDeltaSec} />
          </div>
          <div className="session-actions">
            <button
              className="analyze-button"
              type="button"
              onClick={onAnalyze}
              disabled={analyzeDisabled}
              title={isAnalyzeDisabled ? analyzeDisabledReason : undefined}
            >
              {analyzeButtonLabel}
            </button>
          </div>
        </div>
      </section>

      <section className="findings-band" aria-label="Coaching findings">
        <div className="findings-header">
          <div>
            <div className="report-heading-row">
              <p className="eyebrow">Coaching report</p>
              {isCompleteReport ? <span className="status-pill">{reportTitle}</span> : null}
            </div>
            {!isCompleteReport ? <h2>{reportTitle}</h2> : null}
          </div>
        </div>

        {error ? <p className="message message-error">{error}</p> : null}
        {!report && !error ? (
          <p className="message">Zoom to a short Garage 61 sector, then run the report.</p>
        ) : null}
        {report && report.status !== "complete" ? (
          <p className="message">{reportStatusMessage(report)}</p>
        ) : null}
        {report?.status === "complete" && findings.length === 0 ? (
          <p className="message">This slice does not produce a clear deterministic finding.</p>
        ) : null}

        <div className="finding-list">
          {findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} findings={findings} />
          ))}
          
          {isCompleteReport ? <p className="message">These findings only report the differences between the target and reference laps and may not accurately portray the best way to drive this section of track.</p> : null}
        </div>

        <p className="support-link">
          <a href="https://buymeacoffee.com/burleydev" target="_blank" rel="noreferrer">
            Support BurleyDev on Buy Me a Coffee
          </a>
        </p>
      </section>
    </main>
  );
}

function LapBadge({
  label,
  lap,
  deltaSec,
}: {
  label: string;
  lap: LapSummary | undefined;
  deltaSec?: number;
}): JSX.Element {
  return (
    <div className="lap-badge">
      <span>{label}</span>
      {lap ? (
        <strong className="lap-badge-value">
          <span className="lap-badge-driver">{lap.driver.name}</span>
          <span className="lap-badge-time">
            <span>{formatLapTime(lap.lapTimeSec)}</span>
            {deltaSec === undefined ? null : (
              <span className="lap-badge-delta">{formatSignedDelta(deltaSec)}</span>
            )}
          </span>
        </strong>
      ) : (
        <strong className="lap-badge-value">Unknown lap</strong>
      )}
    </div>
  );
}

function FindingCard({
  finding,
  findings,
}: {
  finding: CoachingFinding;
  findings: CoachingFinding[];
}): JSX.Element {
  const causeTitles = titlesForIds(finding.possibleCauseFindingIds, findings);
  const effectTitles = titlesForIds(finding.possibleEffectFindingIds, findings);

  return (
    <details className="finding-card">
      <summary className="finding-title-row">
        <span
          className={`severity-dot severity-${finding.severity}`}
          aria-label={severityLabel(finding.severity)}
          title={severityLabel(finding.severity)}
        />
        <h3>{finding.title}</h3>
        <span className="accordion-indicator" aria-hidden="true" />
      </summary>
      <div className="finding-card-content">
        <p className="finding-why">{finding.why}</p>
        <dl className="evidence-list">
          {finding.evidence.map((item) => (
            <div key={`${finding.id}-${item.label}-${item.value}`}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        {causeTitles.length > 0 || effectTitles.length > 0 ? (
          <div className="linked-findings" aria-label="Linked findings">
            {causeTitles.length > 0 ? (
              <p>
                <span>Possible cause</span>
                {causeTitles.join(", ")}
              </p>
            ) : null}
            {effectTitles.length > 0 ? (
              <p>
                <span>Possible effect</span>
                {effectTitles.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="cue">{finding.practiceCue}</p>
      </div>
    </details>
  );
}

function titlesForIds(ids: string[] | undefined, findings: CoachingFinding[]): string[] {
  if (!ids || ids.length === 0) {
    return [];
  }

  const titleById = new Map(findings.map((finding) => [finding.id, finding.title]));
  return ids.flatMap((id) => {
    const title = titleById.get(id);
    return title ? [title] : [];
  });
}
