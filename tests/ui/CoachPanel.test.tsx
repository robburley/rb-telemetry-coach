import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
});
