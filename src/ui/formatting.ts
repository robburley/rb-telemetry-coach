import type {
  AnalysisReport,
  DistanceSlice,
  FindingSeverity,
  LapSummary,
} from "../domain/types";

export function formatLapTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "unknown";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, "0")}`;
}

export function formatSlice(slice: DistanceSlice | undefined): string {
  if (!slice) {
    return "No slice selected";
  }

  const start = (slice.startDistancePct * 100).toFixed(2);
  const end = (slice.endDistancePct * 100).toFixed(2);
  return `${start}% to ${end}%`;
}

export function formatLapSummary(lap: LapSummary | undefined): string {
  if (!lap) {
    return "Unknown lap";
  }

  const lapNumber = lap.lapNumber === undefined ? "Lap" : `Lap ${lap.lapNumber}`;
  return `${lapNumber} · ${lap.driver.name} · ${formatLapTime(lap.lapTimeSec)}`;
}

export function reportStatusMessage(report: AnalysisReport): string {
  if (report.status === "complete") {
    return report.findings.length === 0
      ? "No clear coaching finding in this slice."
      : `${report.findings.length} finding${report.findings.length === 1 ? "" : "s"}`;
  }

  if (report.reason === "slice_too_large") {
    return "Select a shorter slice, up to 15% of the lap.";
  }
  if (report.reason === "slice_too_short") {
    return "Select a longer slice, at least 0.5% of the lap.";
  }
  if (report.reason === "wrapped_slice") {
    return "Wrapped start/finish slices are not supported yet.";
  }
  if (report.reason === "full_lap" || report.reason === "missing_slice") {
    return "Select a corner or short sector slice before analyzing.";
  }

  return "This slice cannot be analyzed yet.";
}

export function severityLabel(severity: FindingSeverity): string {
  if (severity === "high") {
    return "High severity";
  }
  if (severity === "medium") {
    return "Medium severity";
  }
  return "Low severity";
}
