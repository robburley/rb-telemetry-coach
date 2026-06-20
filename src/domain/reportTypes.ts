import type { LapDistancePct } from "./units";

export interface DistanceSlice {
  startDistancePct: LapDistancePct;
  endDistancePct: LapDistancePct;
  source?: DistanceSliceSource;
}

export interface DistanceSliceSource {
  kind: "garage61-url-z" | "manual";
  raw?: string;
  startTick?: number | null;
  endTick?: number | null;
}

export interface AnalysisReport {
  status: AnalysisReportStatus;
  analysisId: string;
  referenceLapId?: string;
  targetLapId?: string;
  slice?: DistanceSlice;
  findings: CoachingFinding[];
  allRuleResults?: RuleResult[];
  reason?: string;
}

export type AnalysisReportStatus =
  | "complete"
  | "needs_slice"
  | "unsupported"
  | "unavailable";

export interface CoachingFinding {
  id: string;
  priority: number;
  title: string;
  why: string;
  practiceCue: string;
  category: FindingCategory;
  severity: FindingSeverity;
  confidence: number;
  evidence: EvidenceItem[];
  relatedFindingIds?: string[];
  possibleCauseFindingIds?: string[];
  possibleEffectFindingIds?: string[];
}

export type FindingCategory =
  | "braking"
  | "throttle"
  | "steering"
  | "line"
  | "gearing"
  | "rotation"
  | "stability";

export type FindingSeverity = "low" | "medium" | "high";

export interface EvidenceItem {
  label: string;
  value: string;
  kind: "delta" | "comparison" | "absolute";
  importance?: "primary" | "secondary";
  raw?: Record<string, number | string | boolean>;
}

export interface RuleResult {
  ruleId: string;
  passed: boolean;
  finding?: CoachingFinding;
}
