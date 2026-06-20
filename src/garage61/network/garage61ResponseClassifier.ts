import type { Garage61ResponseClassification } from "./types";

export type {
  Garage61AnalysisResponseClassification,
  Garage61CapturedResponseKind,
  Garage61LapTdfResponseClassification,
  Garage61ResponseClassification,
  Garage61TrackResponseClassification,
  Garage61UnknownResponseClassification,
} from "./types";

const GARAGE61_ID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export function classifyGarage61ResponseUrl(
  input: string | URL,
): Garage61ResponseClassification {
  const url = typeof input === "string" ? new URL(input, "https://garage61.net") : input;
  const segments = url.pathname.split("/").filter(Boolean);

  for (let index = 0; index < segments.length - 3; index += 1) {
    if (segments[index] !== "api" || segments[index + 1] !== "internal") {
      continue;
    }

    const resource = segments[index + 2];
    const id = segments[index + 3];

    const suffix = segments.slice(index + 4);

    if (
      resource === "analyses" &&
      GARAGE61_ID_PATTERN.test(id) &&
      suffix.length === 0
    ) {
      return { kind: "analysis", analysisId: id, url: url.href };
    }

    if (resource === "tracks" && id && suffix.length === 0) {
      return { kind: "track", trackId: id, url: url.href };
    }

    if (
      resource === "laps" &&
      GARAGE61_ID_PATTERN.test(id) &&
      suffix.length === 1 &&
      suffix[0] === "tdf"
    ) {
      return { kind: "lap-tdf", lapId: id, url: url.href };
    }
  }

  return { kind: "unknown", url: url.href };
}
