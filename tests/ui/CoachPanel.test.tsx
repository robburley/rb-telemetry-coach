import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CoachingFinding } from "../../src";
import { CoachPanel } from "../../src/ui/CoachPanel";

describe("CoachPanel", () => {
  it("keeps lap cards to two columns and moves the slice range into the analyze button", () => {
    const markup = renderToStaticMarkup(
      <CoachPanel
        analysisTitle="Comparison"
        carName="Formula Vee"
        trackName="Oulton Park"
        referenceLap={{
          id: "reference",
          driver: { name: "Breaken" },
          lapNumber: 9,
          lapTimeSec: 108.366,
          canViewTelemetry: true,
          haveSamples: true,
        }}
        targetLap={{
          id: "target",
          driver: { name: "Fyrvik" },
          lapNumber: 12,
          lapTimeSec: 112.715,
          canViewTelemetry: true,
          haveSamples: true,
        }}
        currentSlice={{
          startDistancePct: 0.2792,
          endDistancePct: 0.3483,
        }}
        isAnalyzing={false}
        onAnalyze={() => undefined}
      />,
    );

    expect(markup).toContain("Analyze 27.92% to 34.83%");
    expect(markup).toContain('<div class="session-title-row"><h1>Oulton Park</h1><span>Formula Vee</span></div>');
    expect(markup).toContain('<span class="lap-badge-driver">Breaken</span>');
    expect(markup).toContain('<span class="lap-badge-time"><span>1:48.366</span></span>');
    expect(markup).toContain('<span class="lap-badge-driver">Fyrvik</span>');
    expect(markup).toContain(
      '<span class="lap-badge-time"><span>1:52.715</span><span class="lap-badge-delta">(+4.349s)</span></span>',
    );
    expect(markup).not.toContain("Current slice");
    expect(markup).not.toContain("Â");
    expect(markup).not.toContain("Lap 9");
    expect(markup).not.toContain("Lap 12");
  });

  it("renders unavailable report guidance only in the boxed message", () => {
    const message =
      "The coach can analyze exactly two active laps. Hide laps in Garage 61 until exactly two active laps remain.";
    const markup = renderToStaticMarkup(
      <CoachPanel
        analysisTitle="Comparison"
        carName="Formula Vee"
        trackName="Oulton Park"
        report={{
          status: "unavailable",
          analysisId: "analysis",
          findings: [],
          reason: "active_lap_count",
        }}
        isAnalyzing={false}
        onAnalyze={() => undefined}
      />,
    );

    expect(markup.match(new RegExp(message, "g"))).toHaveLength(1);
    expect(markup).toContain(`<p class="message">${message}</p>`);
    expect(markup).toContain("<h2>Needs attention</h2>");
  });

  it("renders the support link at the bottom of the coaching report", () => {
    const markup = renderToStaticMarkup(
      <CoachPanel
        analysisTitle="Comparison"
        carName="Formula Vee"
        trackName="Oulton Park"
        report={{
          status: "complete",
          analysisId: "analysis",
          findings: [],
        }}
        isAnalyzing={false}
        onAnalyze={() => undefined}
      />,
    );

    expect(markup).toContain('class="support-link"');
    expect(markup).toContain('href="https://buymeacoffee.com/burleydev"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
    expect(markup).toContain("Support BurleyDev on Buy Me a Coffee");
  });

  it("renders the completed report count as a pill beside the report label", () => {
    const markup = renderToStaticMarkup(
      <CoachPanel
        analysisTitle="Comparison"
        carName="Formula Vee"
        trackName="Oulton Park"
        report={{
          status: "complete",
          analysisId: "analysis",
          findings: Array.from({ length: 8 }, (_, index) =>
            makeFinding({
              id: `finding-${index + 1}`,
              title: `Finding ${index + 1}`,
            }),
          ),
        }}
        isAnalyzing={false}
        onAnalyze={() => undefined}
      />,
    );

    expect(markup).toContain('<div class="report-heading-row">');
    expect(markup).toContain('<p class="eyebrow">Coaching report</p><span class="status-pill">8 findings</span>');
    expect(markup).not.toContain("<h2>8 findings</h2>");
  });

  it("renders expanded evidence and linked finding context", () => {
    const markup = renderToStaticMarkup(
      <CoachPanel
        analysisTitle="Comparison"
        carName="Formula Vee"
        trackName="Oulton Park"
        report={{
          status: "complete",
          analysisId: "analysis",
          findings: [
            makeFinding({
              id: "exit-hesitation",
              title: "Commit to the exit earlier",
              possibleCauseFindingIds: ["wrong-gear-on-exit"],
              possibleEffectFindingIds: ["late-steering-unwind"],
            }),
            makeFinding({ id: "wrong-gear-on-exit", title: "Match the reference exit gear more closely" }),
            makeFinding({ id: "late-steering-unwind", title: "Unwind the wheel sooner" }),
          ],
        }}
        isAnalyzing={false}
        onAnalyze={() => undefined}
      />,
    );

    expect(markup).toContain('<details class="finding-card">');
    expect(markup).toContain(
      '<span class="finding-category-pill">Throttle</span><span class="finding-title-main"><span class="severity-dot severity-medium"',
    );
    expect(markup).toContain("<h3>Commit to the exit earlier</h3>");
    expect(markup).toContain("Exit speed");
    expect(markup).toContain("Full throttle");
    expect(markup).toContain("Linked findings");
    expect(markup).toContain("Possible cause");
    expect(markup).toContain("Match the reference exit gear more closely");
    expect(markup).toContain("Possible effect");
    expect(markup).toContain("Unwind the wheel sooner");
  });

  it("renders every finding without a show more control", () => {
    const markup = renderToStaticMarkup(
      <CoachPanel
        analysisTitle="Comparison"
        carName="Formula Vee"
        trackName="Oulton Park"
        report={{
          status: "complete",
          analysisId: "analysis",
          findings: Array.from({ length: 7 }, (_, index) =>
            makeFinding({
              id: `finding-${index + 1}`,
              title: `Finding ${index + 1}`,
            }),
          ),
        }}
        isAnalyzing={false}
        onAnalyze={() => undefined}
      />,
    );

    expect(markup.match(/class="finding-card"/g)).toHaveLength(7);
    expect(markup).toContain("Finding 7");
    expect(markup).not.toContain("Show 2 more");
    expect(markup).not.toContain("show-more-button");
  });
});

function makeFinding(overrides: Partial<CoachingFinding> & Pick<CoachingFinding, "id" | "title">): CoachingFinding {
  return {
    id: overrides.id,
    priority: overrides.priority ?? 60,
    title: overrides.title,
    why: overrides.why ?? "Why text",
    practiceCue: overrides.practiceCue ?? "Practice cue",
    category: overrides.category ?? "throttle",
    severity: overrides.severity ?? "medium",
    confidence: overrides.confidence ?? 0.7,
    evidence: overrides.evidence ?? [
      {
        label: "Exit speed",
        value: "3.2 km/h slower",
        kind: "delta",
        importance: "primary",
        raw: { deltaKmh: -3.2 },
      },
      {
        label: "Full throttle",
        value: "12 m later",
        kind: "delta",
        importance: "secondary",
        raw: { deltaM: 12 },
      },
    ],
    relatedFindingIds: overrides.relatedFindingIds,
    possibleCauseFindingIds: overrides.possibleCauseFindingIds,
    possibleEffectFindingIds: overrides.possibleEffectFindingIds,
  };
}
