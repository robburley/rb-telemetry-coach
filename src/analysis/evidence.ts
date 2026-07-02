import type { DistanceSlice, EvidenceItem } from "../domain/reportTypes";

export function formatDistanceDelta(deltaM: number | undefined): string {
  if (deltaM === undefined) {
    return "unavailable";
  }
  const direction = deltaM >= 0 ? "later" : "earlier";
  return `${formatNumber(Math.abs(deltaM), 1)} m ${direction}`;
}

export function formatDistanceAt(distancePct: number, lapLengthM?: number): string {
  if (lapLengthM !== undefined) {
    return `${formatNumber(distancePct * lapLengthM, 1)} m`;
  }
  return `${formatNumber(distancePct * 100, 2)}% lap`;
}

export function formatSpeedDelta(deltaKmh: number): string {
  const direction = deltaKmh >= 0 ? "faster" : "slower";
  return `${formatNumber(Math.abs(deltaKmh), 1)} km/h ${direction}`;
}

export function formatPedalDelta(delta: number): string {
  const direction = delta >= 0 ? "more" : "less";
  return `${formatNumber(Math.abs(delta) * 100, 0)}% ${direction}`;
}

export function formatPedalPointDelta(delta: number): string {
  const direction = delta >= 0 ? "higher" : "lower";
  return `${formatNumber(Math.abs(delta) * 100, 0)} pp ${direction}`;
}

export function formatDistanceDuration(distanceM: number | undefined): string {
  if (distanceM === undefined) {
    return "unavailable";
  }
  return `${formatNumber(Math.max(0, distanceM), 1)} m`;
}

export function formatDurationDelta(deltaM: number | undefined): string {
  if (deltaM === undefined) {
    return "unavailable";
  }
  if (deltaM === 0) {
    return "same length as reference";
  }
  const direction = deltaM > 0 ? "longer" : "shorter";
  return `${formatNumber(Math.abs(deltaM), 1)} m ${direction} than reference`;
}

export function formatLateralOffset(offsetM: number | undefined): string {
  if (offsetM === undefined) {
    return "unavailable";
  }
  const side = offsetM >= 0 ? "left" : "right";
  return `${formatNumber(Math.abs(offsetM), 2)} m ${side}`;
}

export function formatDegreesDelta(deltaDeg: number): string {
  const direction = deltaDeg >= 0 ? "more" : "less";
  return `${formatNumber(Math.abs(deltaDeg), 1)} deg ${direction}`;
}

export function formatHeadingDelta(deltaDeg: number): string {
  const direction = deltaDeg >= 0 ? "more rotation" : "less rotation";
  return `${formatNumber(Math.abs(deltaDeg), 1)} deg ${direction}`;
}

export function makeEvidence(
  label: string,
  value: string,
  kind: EvidenceItem["kind"] = "comparison",
  importance: EvidenceItem["importance"] = "primary",
  raw?: EvidenceItem["raw"],
): EvidenceItem {
  return { label, value, kind, importance, raw };
}

export function describeSlice(slice: DistanceSlice, lapLengthM?: number): string {
  return `${formatDistanceAt(slice.startDistancePct, lapLengthM)} to ${formatDistanceAt(
    slice.endDistancePct,
    lapLengthM,
  )}`;
}

function formatNumber(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.0$/, "");
}
