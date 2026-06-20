import type {
  AnalysisReport,
  DistanceSlice,
  FindingSeverity,
} from "../domain/reportTypes";
import type {
  LapSummary,
  TrackInfo,
} from "../domain/metadataTypes";

export function formatLapTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "unknown";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, "0")}`;
}

export function formatSignedDelta(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return "";
  }

  const sign = seconds >= 0 ? "+" : "-";
  return `(${sign}${Math.abs(seconds).toFixed(3)}s)`;
}

export function formatSlice(slice: DistanceSlice | undefined): string {
  if (!slice) {
    return "";
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
  return `${lapNumber} - ${lap.driver.name} - ${formatLapTime(lap.lapTimeSec)}`;
}

export function formatLapIdentity(lap: LapSummary | undefined): string {
  if (!lap) {
    return "Unknown lap";
  }

  return `${lap.driver.name} - ${formatLapTime(lap.lapTimeSec)}`;
}

export function formatTrackTitle(track: TrackInfo | undefined, fallback = "Live Garage 61 analysis"): string {
  if (!track) {
    return fallback;
  }

  if (track.shortName) {
    return track.shortName;
  }

  return `${track.name}${track.variant ? ` - ${track.variant}` : ""}`;
}

export function reportStatusMessage(report: AnalysisReport): string {
  if (report.status === "complete") {
    return report.findings.length === 0
      ? "No clear coaching finding in this slice."
      : `${report.findings.length} finding${report.findings.length === 1 ? "" : "s"}`;
  }

  if (report.reason === "slice_too_large") {
    return "Zoom to a shorter slice, up to 15% of the lap.";
  }
  if (report.reason === "slice_too_short") {
    return "Zoom to a longer slice, at least 0.5% of the lap.";
  }
  if (report.reason === "wrapped_slice") {
    return "Wrapped start/finish slices are not supported yet.";
  }
  if (report.reason === "full_lap" || report.reason === "missing_slice") {
    return "Zoom to a corner or short sector before analyzing.";
  }
  if (report.reason === "active_lap_count") {
    return "The coach can analyze exactly two active laps. Hide laps in Garage 61 until exactly two active laps remain.";
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
