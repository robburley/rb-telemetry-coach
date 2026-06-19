import {
  type AnalysisMetadata,
  type AnalysisReport,
  type ComparisonLapRoles,
  type DistanceSlice,
  type LapTelemetry,
} from "../domain/types";
import {
  decodeGarage61TelemetryBinary,
  parseGarage61TdfDataUrlFixture,
} from "../garage61/decoding";
import {
  type Garage61AnalysisFixture,
  normaliseGarage61Analysis,
} from "../garage61/metadata/normaliseGarage61Analysis";
import {
  type Garage61TrackFixture,
} from "../garage61/metadata/normaliseGarage61Track";
import { normaliseGarage61Telemetry } from "../garage61/normalise";
import { parseGarage61ZoomParam } from "../garage61/url";
import { generateAnalysisReport } from "../analysis/report";
import { resolveComparisonLaps } from "../analysis/resolveComparisonLaps";
import { validateDistanceSlice } from "../analysis/slicing";
import analysisFixture from "../../example-data/api-internal-analyses-01KVBECPC8BM15DJ7X80X1RGCT.json";
import targetTdfRaw from "../../example-data/api-internal-laps-01KVBPNG1EVNB3D9310P6X2J1K-tdf.txt?raw";
import referenceTdfRaw from "../../example-data/api-internal-laps-01KVBPW12Z5WJY1W33G47N95KW-tdf.txt?raw";
import trackFixture from "../../example-data/api-internal-tracks-67.json";

export const exampleAnalysisId = "01KVBECPC8BM15DJ7X80X1RGCT";
export const defaultZoomInput = "354-1200";

const tdfFixtures = new Map<string, { name: string; raw: string }>([
  [
    "01KVBPW12Z5WJY1W33G47N95KW",
    {
      name: "api-internal-laps-01KVBPW12Z5WJY1W33G47N95KW-tdf.txt",
      raw: referenceTdfRaw,
    },
  ],
  [
    "01KVBPNG1EVNB3D9310P6X2J1K",
    {
      name: "api-internal-laps-01KVBPNG1EVNB3D9310P6X2J1K-tdf.txt",
      raw: targetTdfRaw,
    },
  ],
]);

let scenarioCache: ExampleScenario | undefined;

export interface ExampleScenario {
  analysis: AnalysisMetadata;
  roles: ComparisonLapRoles;
  reference: LapTelemetry;
  target: LapTelemetry;
}

export interface AnalyzeZoomResult {
  report: AnalysisReport;
  slice?: DistanceSlice;
}

export function loadExampleScenario(): ExampleScenario {
  if (scenarioCache) {
    return scenarioCache;
  }

  const analysis = normaliseGarage61Analysis(
    analysisFixture as Garage61AnalysisFixture,
    { track: trackFixture as unknown as Garage61TrackFixture },
  );
  const roles = resolveComparisonLaps(analysis);

  scenarioCache = {
    analysis,
    roles,
    reference: decodeLapFixture(roles.referenceLapId),
    target: decodeLapFixture(roles.targetLapId),
  };
  return scenarioCache;
}

export function analyzeExampleZoomInput(rawZoom: string): AnalyzeZoomResult {
  const scenario = loadExampleScenario();
  const parsed = parseGarage61ZoomParam(rawZoom);

  if (parsed.status !== "slice") {
    return {
      report: {
        status: parsed.status,
        reason: parsed.reason,
        analysisId: scenario.analysis.id,
        referenceLapId: scenario.roles.referenceLapId,
        targetLapId: scenario.roles.targetLapId,
        findings: [],
      },
    };
  }

  const validation = validateDistanceSlice(parsed.slice);
  if (validation.status !== "valid") {
    return {
      slice: parsed.slice,
      report: {
        status: validation.status,
        reason: validation.reason,
        analysisId: scenario.analysis.id,
        referenceLapId: scenario.roles.referenceLapId,
        targetLapId: scenario.roles.targetLapId,
        slice: parsed.slice,
        findings: [],
      },
    };
  }

  return {
    slice: parsed.slice,
    report: generateAnalysisReport({
      analysis: scenario.analysis,
      roles: scenario.roles,
      reference: scenario.reference,
      target: scenario.target,
      slice: parsed.slice,
    }),
  };
}

function decodeLapFixture(lapId: string): LapTelemetry {
  const fixture = tdfFixtures.get(lapId);
  if (!fixture) {
    throw new Error(`Missing example TDF fixture for lap ${lapId}`);
  }

  const bytes = parseGarage61TdfDataUrlFixture(fixture.raw, fixture.name);
  const decoded = decodeGarage61TelemetryBinary(bytes);
  return normaliseGarage61Telemetry(decoded, {
    lapId,
    provider: "garage61-example-browser",
  });
}
