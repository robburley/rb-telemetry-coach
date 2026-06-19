import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CoachPanel } from "../../src/ui/CoachPanel";

describe("CoachPanel", () => {
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
