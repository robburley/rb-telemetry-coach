import { compareTelemetry } from "./compareTelemetry";
import { sortAndLinkFindings, runDeterministicRules } from "./rules";
import { validateDistanceSlice } from "./slicing";
import { defaultAnalysisConfig } from "./config";
import type { AnalysisConfig } from "./configTypes";
import type { ComparisonContext } from "../domain/comparisonContextTypes";
import type { AnalysisReport } from "../domain/reportTypes";

export function generateAnalysisReport(
  context: ComparisonContext,
  config: AnalysisConfig = defaultAnalysisConfig,
): AnalysisReport {
  const sliceValidation = validateDistanceSlice(context.slice, config.slicing);
  if (sliceValidation.status !== "valid") {
    return {
      status: sliceValidation.status,
      analysisId: context.analysis.id,
      referenceLapId: context.roles.referenceLapId,
      targetLapId: context.roles.targetLapId,
      slice: context.slice,
      findings: [],
      reason: sliceValidation.reason,
    };
  }

  const comparison = compareTelemetry(context, config);
  const allRuleResults = runDeterministicRules(comparison);
  const findings = sortAndLinkFindings(
    allRuleResults.flatMap((result) => (result.finding ? [result.finding] : [])),
  );

  return {
    status: "complete",
    analysisId: context.analysis.id,
    referenceLapId: context.roles.referenceLapId,
    targetLapId: context.roles.targetLapId,
    slice: context.slice,
    findings,
    allRuleResults,
  };
}
