import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  Garage61TelemetryDecodeError,
  decodeGarage61TelemetryBinary,
  garage61KnownChannelDefinitions,
  parseGarage61TdfDataUrlFixture,
} from "../../../src";

const fixtureDir = join(process.cwd(), "example-data");
const referenceLapId = "01KVBPW12Z5WJY1W33G47N95KW";
const targetLapId = "01KVBPNG1EVNB3D9310P6X2J1K";

async function readTdfFixture(lapId: string): Promise<Uint8Array> {
  return readTdfFixtureByName(`api-internal-laps-${lapId}-tdf.txt`);
}

async function readTdfFixtureByName(fixtureName: string): Promise<Uint8Array> {
  const text = await readFile(join(fixtureDir, fixtureName), "utf8");
  return parseGarage61TdfDataUrlFixture(text, fixtureName);
}

async function readReferenceGolden(): Promise<{
  meta: {
    sampleCount: number;
    rawDataStart: number;
    rawDataEnd: number;
    fileSizeBytes: number;
  };
  channels: Record<string, number[]>;
}> {
  const text = await readFile(
    join(fixtureDir, `api-internal-laps-${referenceLapId}-tdf.json`),
    "utf8",
  );
  return JSON.parse(text);
}

describe("parseGarage61TdfDataUrlFixture", () => {
  it("parses copied Chrome data URL fixtures into bytes", async () => {
    const bytes = await readTdfFixture(referenceLapId);

    expect([...bytes.subarray(0, 4)]).toEqual([0xf0, 0x9f, 0x8f, 0x8e]);
    expect(bytes.byteLength).toBeGreaterThan(400_000);
  });

  it("parses copied Firefox raw base64 fixtures into bytes", async () => {
    const [chrome, firefox] = await Promise.all([
      readTdfFixtureByName(`api-internal-laps-${referenceLapId}-tdf.txt`),
      readTdfFixtureByName(`firefox-api-internal-laps-${referenceLapId}-tdf.txt`),
    ]);

    expect(firefox).toEqual(chrome);
  });

  it("fails loudly when the text payload is not base64", () => {
    expect(() => parseGarage61TdfDataUrlFixture("not-a-data-url")).toThrow(
      /base64 payload is malformed/,
    );
  });
});

describe("decodeGarage61TelemetryBinary", () => {
  it("decodes both Chrome raw TDF fixtures successfully", async () => {
    const [reference, target] = await Promise.all([
      readTdfFixture(referenceLapId),
      readTdfFixture(targetLapId),
    ]);

    const decodedReference = decodeGarage61TelemetryBinary(reference);
    const decodedTarget = decodeGarage61TelemetryBinary(target);

    expect(decodedReference.meta).toMatchObject({
      magic: "🏎",
      sampleCount: 6500,
      sampleRateOrStep: 60,
      rawDataStart: 379,
      rawDataEnd: reference.byteLength,
      fileSizeBytes: reference.byteLength,
    });
    expect(decodedTarget.meta.sampleCount).toBe(6562);
    expect(decodedTarget.meta.rawDataEnd).toBe(target.byteLength);
  });

  it("decodes Firefox raw base64 TDF response bodies successfully", async () => {
    const [referenceText, targetText] = await Promise.all([
      readFile(
        join(fixtureDir, `firefox-api-internal-laps-${referenceLapId}-tdf.txt`),
        "utf8",
      ),
      readFile(
        join(fixtureDir, `firefox-api-internal-laps-${targetLapId}-tdf.txt`),
        "utf8",
      ),
    ]);

    const decodedReference = decodeGarage61TelemetryBinary(
      new TextEncoder().encode(referenceText),
    );
    const decodedTarget = decodeGarage61TelemetryBinary(
      new TextEncoder().encode(targetText),
    );

    expect(decodedReference.meta).toMatchObject({
      sampleCount: 6500,
      rawDataStart: 379,
    });
    expect(decodedTarget.meta.sampleCount).toBe(6562);
  });

  it("decodes known channels and preserves unknown channels", async () => {
    const decoded = decodeGarage61TelemetryBinary(
      await readTdfFixture(referenceLapId),
    );
    const channelByName = new Map(
      decoded.channels.map((channel) => [channel.name, channel]),
    );

    for (const definition of garage61KnownChannelDefinitions) {
      expect(channelByName.get(definition.name)).toMatchObject({
        id: definition.id,
        dtype: definition.dtype,
        sampleCount: 6500,
      });
    }

    expect(decoded.unknownChannels.map((channel) => channel.id)).toEqual([
      9, 10, 12, 13, 28, 29, 30, 20,
    ]);
    expect(channelByName.get("channel_10_unknown_u8")?.values).toBeInstanceOf(
      Uint8Array,
    );
    expect(channelByName.get("channel_20_unknown_i32")?.values).toBeInstanceOf(
      Int32Array,
    );
  });

  it("matches the pre-decoded reference golden fixture", async () => {
    const [bytes, golden] = await Promise.all([
      readTdfFixture(referenceLapId),
      readReferenceGolden(),
    ]);
    const decoded = decodeGarage61TelemetryBinary(bytes);

    expect(decoded.meta.sampleCount).toBe(golden.meta.sampleCount);
    expect(decoded.meta.rawDataStart).toBe(golden.meta.rawDataStart);
    expect(decoded.meta.rawDataEnd).toBe(golden.meta.rawDataEnd);
    expect(decoded.meta.fileSizeBytes).toBe(golden.meta.fileSizeBytes);

    const channelByName = new Map(
      decoded.channels.map((channel) => [channel.name, channel]),
    );
    for (const [name, goldenValues] of Object.entries(golden.channels)) {
      const channel = channelByName.get(name);
      expect(channel, name).toBeDefined();
      expect(channel?.sampleCount).toBe(goldenValues.length);

      const values = channel!.values;
      for (const index of sampleIndexes(goldenValues.length)) {
        expect(values[index], `${name}[${index}]`).toBeCloseTo(
          goldenValues[index]!,
          channel!.dtype === "float64" ? 10 : 5,
        );
      }
    }
  });

  it("throws structured errors for invalid magic and truncated payloads", async () => {
    const bytes = await readTdfFixture(referenceLapId);
    const invalidMagic = bytes.slice();
    invalidMagic[0] = 0;

    expect(() => decodeGarage61TelemetryBinary(invalidMagic)).toThrow(
      Garage61TelemetryDecodeError,
    );
    expectDecodeErrorCode(invalidMagic, "invalid_magic");

    expectDecodeErrorCode(bytes.subarray(0, 40), "unexpected_eof");
  });

  it("throws structured errors for malformed descriptors and payload boundaries", async () => {
    const bytes = await readTdfFixture(referenceLapId);

    const unsupportedHeader = bytes.slice();
    unsupportedHeader[6] = 0xff;
    expectDecodeErrorCode(unsupportedHeader, "unsupported_descriptor");

    const channelLengthMismatch = bytes.slice();
    channelLengthMismatch[41] = 0x91;
    expectDecodeErrorCode(channelLengthMismatch, "channel_length_mismatch");

    const unsupportedDtype = bytes.slice();
    const channel10ByteLengthOffset = indexOfBytes(unsupportedDtype, [
      0x08, 0x0a, 0x45, 0x00, 0x00, 0x80, 0x3f, 0x48, 0xe4, 0x32, 0x50,
    ]);
    unsupportedDtype[channel10ByteLengthOffset + 11] = 0xc8;
    unsupportedDtype[channel10ByteLengthOffset + 12] = 0x65;
    expectDecodeErrorCode(unsupportedDtype, "unsupported_dtype");

    const withTrailingByte = new Uint8Array(bytes.byteLength + 1);
    withTrailingByte.set(bytes);
    expectDecodeErrorCode(withTrailingByte, "trailing_bytes");
  });
});

function sampleIndexes(length: number): number[] {
  return [0, 1, 2, Math.floor(length / 2), length - 3, length - 2, length - 1];
}

function expectDecodeErrorCode(
  bytes: Uint8Array,
  code: InstanceType<typeof Garage61TelemetryDecodeError>["code"],
): void {
  try {
    decodeGarage61TelemetryBinary(bytes);
  } catch (error) {
    expect(error).toBeInstanceOf(Garage61TelemetryDecodeError);
    expect((error as Garage61TelemetryDecodeError).code).toBe(code);
    return;
  }

  throw new Error(`Expected decode error ${code}`);
}

function indexOfBytes(bytes: Uint8Array, pattern: number[]): number {
  for (let index = 0; index <= bytes.byteLength - pattern.length; index += 1) {
    if (pattern.every((byte, patternIndex) => bytes[index + patternIndex] === byte)) {
      return index;
    }
  }

  throw new Error(`Pattern not found: ${pattern.join(",")}`);
}
