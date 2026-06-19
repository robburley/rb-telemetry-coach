import { describe, expect, it } from "vitest";
import { classifyGarage61ResponseUrl } from "../../../src";

describe("classifyGarage61ResponseUrl", () => {
  it("identifies analysis metadata URLs", () => {
    expect(
      classifyGarage61ResponseUrl(
        "https://garage61.net/api/internal/analyses/01KVBECPC8BM15DJ7X80X1RGCT",
      ),
    ).toMatchObject({
      kind: "analysis",
      analysisId: "01KVBECPC8BM15DJ7X80X1RGCT",
    });
  });

  it("identifies track metadata URLs", () => {
    expect(classifyGarage61ResponseUrl("/api/internal/tracks/67")).toMatchObject({
      kind: "track",
      trackId: "67",
    });
  });

  it("does not treat track binary endpoints as track metadata", () => {
    expect(classifyGarage61ResponseUrl("/api/internal/tracks/324/tdf").kind).toBe(
      "unknown",
    );
  });

  it("identifies lap TDF URLs", () => {
    expect(
      classifyGarage61ResponseUrl(
        "/api/internal/laps/01KVBPW12Z5WJY1W33G47N95KW/tdf?download=1",
      ),
    ).toMatchObject({
      kind: "lap-tdf",
      lapId: "01KVBPW12Z5WJY1W33G47N95KW",
    });
  });

  it("ignores unrelated URLs", () => {
    expect(classifyGarage61ResponseUrl("/api/internal/users/me").kind).toBe("unknown");
  });
});
