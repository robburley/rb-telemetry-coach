import { parseGarage61ZoomParam, type Garage61ZoomParseResult } from "./parseGarage61ZoomParam";

const ANALYSIS_ROUTE_NAMES = new Set(["analysis", "analyses"]);
const GARAGE61_ID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export interface Garage61AnalysisUrlState {
  url: string;
  analysisId?: string;
  zoomRaw?: string;
  zoom: Garage61ZoomParseResult;
}

export function parseGarage61AnalysisUrl(input: string | URL): Garage61AnalysisUrlState {
  const url = typeof input === "string" ? new URL(input, "https://garage61.net") : input;
  const zoomRaw = findZoomParam(url);

  return {
    url: url.href,
    analysisId: findAnalysisId(url),
    zoomRaw,
    zoom: parseGarage61ZoomParam(zoomRaw),
  };
}

function findAnalysisId(url: URL): string | undefined {
  const segments = url.pathname.split("/").filter(Boolean);

  for (let index = 0; index < segments.length - 1; index += 1) {
    if (ANALYSIS_ROUTE_NAMES.has(segments[index].toLowerCase())) {
      const nextSegment = segments[index + 1].toLowerCase();
      const candidateSegment =
        nextSegment === "laps" && segments[index + 2]
          ? segments[index + 2]
          : segments[index + 1];
      const candidate = candidateSegment.split(";")[0];
      if (GARAGE61_ID_PATTERN.test(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

function findZoomParam(url: URL): string | undefined {
  const queryZoom = url.searchParams.get("z");

  if (queryZoom !== null) {
    return queryZoom;
  }

  const match = /(?:[?&;#])z=([^&;#]+)/.exec(url.href);
  return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : undefined;
}
