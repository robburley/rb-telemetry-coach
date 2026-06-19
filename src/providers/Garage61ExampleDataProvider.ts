import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  decodeGarage61TelemetryBinary,
  type Garage61AnalysisFixture,
  type Garage61TrackFixture,
  normaliseGarage61Analysis,
  normaliseGarage61Telemetry,
  parseGarage61TdfDataUrlFixture,
} from "../garage61";
import type { AnalysisMetadata, LapTelemetry } from "../domain/types";
import type { TelemetryProvider } from "./TelemetryProvider";

export interface Garage61ExampleDataProviderOptions {
  fixtureDir?: string;
}

export class Garage61ExampleDataProvider implements TelemetryProvider {
  private readonly fixtureDir: string;
  private readonly telemetryCache = new Map<string, LapTelemetry>();

  constructor(options: Garage61ExampleDataProviderOptions = {}) {
    this.fixtureDir = options.fixtureDir ?? join(process.cwd(), "example-data");
  }

  async getAnalysis(id: string): Promise<AnalysisMetadata> {
    const analysisFixture = await this.readJsonFixture<Garage61AnalysisFixture>(
      endpointFixtureName(["api", "internal", "analyses", id], "json"),
    );
    const trackId = analysisFixture.tracks?.[0];
    if (trackId === undefined) {
      throw new Error(`Garage 61 analysis ${id} is missing a track id`);
    }

    const trackFixture = await this.readJsonFixture<Garage61TrackFixture>(
      endpointFixtureName(["api", "internal", "tracks", String(trackId)], "json"),
    );

    return normaliseGarage61Analysis(analysisFixture, {
      track: trackFixture,
    });
  }

  async getLapTelemetry(lapId: string): Promise<LapTelemetry> {
    const cached = this.telemetryCache.get(lapId);
    if (cached) {
      return cached;
    }

    const fixtureName = endpointFixtureName(
      ["api", "internal", "laps", lapId, "tdf"],
      "txt",
    );
    const rawFixture = await this.readTextFixture(fixtureName);
    const bytes = parseGarage61TdfDataUrlFixture(rawFixture, fixtureName);
    const decoded = decodeGarage61TelemetryBinary(bytes);
    const telemetry = normaliseGarage61Telemetry(decoded, {
      lapId,
      provider: "garage61-example",
    });

    this.telemetryCache.set(lapId, telemetry);
    return telemetry;
  }

  private async readJsonFixture<T>(fixtureName: string): Promise<T> {
    try {
      return JSON.parse(await this.readTextFixture(fixtureName)) as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`${fixtureName}: JSON fixture is malformed`);
      }
      throw error;
    }
  }

  private async readTextFixture(fixtureName: string): Promise<string> {
    try {
      return await readFile(join(this.fixtureDir, fixtureName), "utf8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        throw new Error(`${fixtureName}: fixture not found`);
      }
      throw error;
    }
  }
}

export function endpointFixtureName(parts: string[], extension: string): string {
  return `${parts.join("-")}.${extension}`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
