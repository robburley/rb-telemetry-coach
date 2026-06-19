import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CoachingFinding } from "../../src";
import { CoachPanel } from "../../src/ui/CoachPanel";

describe("CoachPanel", () => {
  it("renders unavailable report guidance only in the boxed message", () => {
    const message =
      "The coach can analyze exactly two active laps. Hide laps in Garage 61 until exactly two active laps remain.";
    const markup = renderToStaticMarkup(
      <CoachPanel
        analysisTitle="Comparison"
        carName="Formula Vee"
        trackName="Oulton Park"
        visibleLimit={5}
        report={{
          status: "unavailable",
          analysisId: "analysis",
          findings: [],
          reason: "active_lap_count",
        }}
        isAnalyzing={false}
        onAnalyze={() => undefined}
        onShowMore={() => undefined}
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
        visibleLimit={5}
        report={{
          status: "complete",
          analysisId: "analysis",
          findings: [],
        }}
        isAnalyzing={false}
        onAnalyze={() => undefined}
        onShowMore={() => undefined}
      />,
    );

    expect(markup).toContain('class="support-link"');
    expect(markup).toContain('href="https://buymeacoffee.com/burleydev"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
    expect(markup).toContain("Support BurleyDev on Buy Me a Coffee");
  });

  it("renders expanded evidence and linked finding context", () => {
    const markup = renderToStaticMarkup(
      <CoachPanel
        analysisTitle="Comparison"
        carName="Formula Vee"
        trackName="Oulton Park"
        visibleLimit={5}
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
        onShowMore={() => undefined}
      />,
    );

    expect(markup).toContain("Exit speed");
    expect(markup).toContain("Full throttle");
    expect(markup).toContain("Linked findings");
    expect(markup).toContain("Possible cause");
    expect(markup).toContain("Match the reference exit gear more closely");
    expect(markup).toContain("Possible effect");
    expect(markup).toContain("Unwind the wheel sooner");
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
