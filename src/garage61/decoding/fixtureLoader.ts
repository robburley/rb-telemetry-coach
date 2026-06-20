import { normaliseGarage61TelemetryPayload } from "./decodeGarage61TelemetryBinary";

export function parseGarage61TdfDataUrlFixture(
  text: string,
  fixtureName = "Garage 61 TDF fixture",
): Uint8Array {
  try {
    return normaliseGarage61TelemetryPayload(text);
  } catch (error) {
    throw new Error(
      `${fixtureName}: ${
        error instanceof Error ? error.message : "TDF payload is malformed"
      }`,
    );
  }
}
