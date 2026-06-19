import type { AnalysisReport, CoachingFinding, LapSummary } from "../domain/types";
import {
  formatLapSummary,
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
  zoomInput: string;
  visibleLimit: number;
  report?: AnalysisReport;
  isAnalyzing: boolean;
  isAnalyzeDisabled?: boolean;
  analyzeDisabledReason?: string;
  error?: string;
  onZoomInputChange: (value: string) => void;
  onAnalyze: () => void;
  onShowMore: () => void;
}

export function CoachPanel({
  analysisTitle,
  carName,
  trackName,
  referenceLap,
  targetLap,
  zoomInput,
  visibleLimit,
  report,
  isAnalyzing,
  isAnalyzeDisabled = false,
  analyzeDisabledReason,
  error,
  onZoomInputChange,
  onAnalyze,
  onShowMore,
}: CoachPanelProps): JSX.Element {
  const findings = report?.findings ?? [];
  const visibleFindings = findings.slice(0, visibleLimit);
  const hiddenCount = Math.max(0, findings.length - visibleFindings.length);
  const analyzeDisabled = isAnalyzing || isAnalyzeDisabled;

  return (
    <main className="coach-shell">
      <section className="session-band" aria-label="Current analysis">
        <div>
          <p className="eyebrow">{analysisTitle}</p>
          <h1>{trackName}</h1>
          <p className="session-subtitle">{carName}</p>
        </div>
        <div className="lap-pair">
          <LapBadge label="Reference" value={formatLapSummary(referenceLap)} />
          <LapBadge label="Target" value={formatLapSummary(targetLap)} />
        </div>
      </section>

      <section className="control-band" aria-label="Slice controls">
        <label className="zoom-field">
          <span>Slice z</span>
          <input
            value={zoomInput}
            onChange={(event) => onZoomInputChange(event.target.value)}
            placeholder="354-1200"
            spellCheck={false}
          />
        </label>
        <button
          className="analyze-button"
          onClick={onAnalyze}
          disabled={analyzeDisabled}
          title={isAnalyzeDisabled ? analyzeDisabledReason : undefined}
        >
          {isAnalyzing ? "Analyzing" : isAnalyzeDisabled ? "Waiting" : "Analyze"}
        </button>
        <p className="slice-readout">{formatSlice(report?.slice)}</p>
      </section>

      <section className="findings-band" aria-label="Coaching findings">
        <div className="findings-header">
          <div>
            <p className="eyebrow">Coaching report</p>
            <h2>{report ? reportStatusMessage(report) : "Ready"}</h2>
          </div>
          {report?.status === "complete" ? (
            <span className="status-pill">Priority sorted</span>
          ) : null}
        </div>

        {error ? <p className="message message-error">{error}</p> : null}
        {!report && !error ? (
          <p className="message">Enter a short Garage 61 zoom range and run the report.</p>
        ) : null}
        {report && report.status !== "complete" ? (
          <p className="message">{reportStatusMessage(report)}</p>
        ) : null}
        {report?.status === "complete" && findings.length === 0 ? (
          <p className="message">This slice does not produce a clear deterministic finding.</p>
        ) : null}

        <div className="finding-list">
          {visibleFindings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>

        {hiddenCount > 0 ? (
          <button className="show-more-button" onClick={onShowMore}>
            Show {hiddenCount} more
          </button>
        ) : null}
      </section>
    </main>
  );
}

function LapBadge({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="lap-badge">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FindingCard({ finding }: { finding: CoachingFinding }): JSX.Element {
  return (
    <article className="finding-card">
      <div className="finding-title-row">
        <span
          className={`severity-dot severity-${finding.severity}`}
          aria-label={severityLabel(finding.severity)}
          title={severityLabel(finding.severity)}
        />
        <h3>{finding.title}</h3>
      </div>
      <p className="finding-why">{finding.why}</p>
      <dl className="evidence-list">
        {finding.evidence.map((item) => (
          <div key={`${finding.id}-${item.label}-${item.value}`}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="cue">{finding.practiceCue}</p>
    </article>
  );
}
