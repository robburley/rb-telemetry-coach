import type { AnalysisMetadata, LapTelemetry } from "../domain/types";
import {
  decodeGarage61TelemetryBinary,
  type Garage61AnalysisFixture,
  type Garage61CapturedResponse,
  type Garage61TrackFixture,
  normaliseGarage61Analysis,
  normaliseGarage61Telemetry,
} from "../garage61";
import type { TelemetryProvider } from "./TelemetryProvider";

interface CapturedAnalysisSession {
  id: string;
  lapIds: Set<string>;
  analysisFixture: Garage61AnalysisFixture;
  trackFixture?: Garage61TrackFixture;
}

interface PendingTdfCapture {
  lapId: string;
  routeAnalysisId?: string;
  body: ArrayBuffer;
  capturedAtMs: number;
}

export interface Garage61PageNetworkProviderOptions {
  now?: () => number;
  pendingTdfTtlMs?: number;
}

const DEFAULT_PENDING_TDF_TTL_MS = 45_000;

export class Garage61PageNetworkProvider implements TelemetryProvider {
  private readonly now: () => number;
  private readonly pendingTdfTtlMs: number;
  private session?: CapturedAnalysisSession;
  private readonly capturedTracks = new Map<string, Garage61TrackFixture>();
  private readonly pendingTdf = new Map<string, PendingTdfCapture>();
  private readonly attachedTdf = new Map<string, ArrayBuffer>();
  private readonly telemetryCache = new Map<string, LapTelemetry>();

  constructor(options: Garage61PageNetworkProviderOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.pendingTdfTtlMs = options.pendingTdfTtlMs ?? DEFAULT_PENDING_TDF_TTL_MS;
  }

  ingestCapturedResponse(response: Garage61CapturedResponse): void {
    this.pruneExpiredPendingTdf();

    if (response.kind === "analysis") {
      this.ingestAnalysis(response.body as Garage61AnalysisFixture);
      return;
    }

    if (response.kind === "track") {
      this.ingestTrack(response.body as Garage61TrackFixture);
      return;
    }

    if (response.kind === "lap-tdf") {
      this.ingestLapTdf(response);
    }
  }

  async getAnalysis(id: string): Promise<AnalysisMetadata> {
    if (!this.session || this.session.id !== id) {
      throw new Error(`Garage 61 page session has no captured analysis ${id}`);
    }

    if (!this.session.trackFixture) {
      throw new Error(`Garage 61 page session has no captured track for analysis ${id}`);
    }

    return normaliseGarage61Analysis(this.session.analysisFixture, {
      track: this.session.trackFixture,
    });
  }

  async getLapTelemetry(lapId: string): Promise<LapTelemetry> {
    const cached = this.telemetryCache.get(lapId);
    if (cached) {
      return cached;
    }

    const bytes = this.attachedTdf.get(lapId);
    if (!bytes) {
      throw new Error(`Garage 61 page session has no captured telemetry for lap ${lapId}`);
    }

    const decoded = decodeGarage61TelemetryBinary(bytes);
    const telemetry = normaliseGarage61Telemetry(decoded, {
      lapId,
      provider: "garage61-page-network",
    });
    this.telemetryCache.set(lapId, telemetry);
    return telemetry;
  }

  getPendingTdfCount(): number {
    this.pruneExpiredPendingTdf();
    return this.pendingTdf.size;
  }

  hasCapturedLapTelemetry(lapId: string): boolean {
    return this.attachedTdf.has(lapId) || this.telemetryCache.has(lapId);
  }

  private ingestAnalysis(analysisFixture: Garage61AnalysisFixture): void {
    const nextLapIds = new Set(
      analysisFixture.laps.flatMap((group) => group.laps?.map((lap) => lap.id) ?? []),
    );

    if (nextLapIds.size === 0) {
      throw new Error(`Garage 61 analysis ${analysisFixture.id} does not contain laps`);
    }

    const isSessionChange =
      this.session === undefined ||
      this.session.id !== analysisFixture.id ||
      !sameSet(this.session.lapIds, nextLapIds);

    const previousTrack = isSessionChange ? undefined : this.session?.trackFixture;

    if (isSessionChange) {
      this.attachedTdf.clear();
      this.telemetryCache.clear();
    }

    this.session = {
      id: analysisFixture.id,
      lapIds: nextLapIds,
      analysisFixture,
      trackFixture: previousTrack,
    };

    this.attachMatchingTrack();
    this.attachMatchingPendingTdf();
  }

  private ingestTrack(trackFixture: Garage61TrackFixture): void {
    this.capturedTracks.set(String(trackFixture.id), trackFixture);

    if (!this.session) {
      return;
    }

    this.attachMatchingTrack();
  }

  private attachMatchingTrack(): void {
    if (!this.session) {
      return;
    }

    const trackIds = this.session.analysisFixture.tracks?.map(String) ?? [];
    for (const trackId of trackIds) {
      const track = this.capturedTracks.get(trackId);
      if (track) {
        this.session.trackFixture = track;
        return;
      }
    }
  }

  private ingestLapTdf(response: Extract<Garage61CapturedResponse, { kind: "lap-tdf" }>): void {
    const capture: PendingTdfCapture = {
      lapId: response.lapId,
      routeAnalysisId: response.routeAnalysisId,
      body: response.body.slice(0),
      capturedAtMs: response.capturedAtMs,
    };

    this.pendingTdf.set(response.lapId, capture);
    this.attachMatchingPendingTdf();
  }

  private attachMatchingPendingTdf(): void {
    if (!this.session) {
      return;
    }

    for (const [lapId, pending] of this.pendingTdf) {
      if (!this.pendingCaptureMatchesSession(pending)) {
        continue;
      }

      this.attachedTdf.set(lapId, pending.body);
      this.telemetryCache.delete(lapId);
      this.pendingTdf.delete(lapId);
    }
  }

  private pendingCaptureMatchesSession(pending: PendingTdfCapture): boolean {
    if (!this.session?.lapIds.has(pending.lapId)) {
      return false;
    }

    return (
      pending.routeAnalysisId === undefined ||
      pending.routeAnalysisId === this.session.id
    );
  }

  private pruneExpiredPendingTdf(): void {
    const cutoff = this.now() - this.pendingTdfTtlMs;
    for (const [lapId, pending] of this.pendingTdf) {
      if (pending.capturedAtMs < cutoff) {
        this.pendingTdf.delete(lapId);
      }
    }
  }
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}
