import type {
  DecodedChannelValues,
  DecodedGarage61Channel,
  DecodedGarage61Telemetry,
  TelemetryDtype,
} from "../../domain/telemetryTypes";
import { garage61KnownChannelById } from "./garage61ChannelDefinitions";
import type { Garage61TelemetryDecodeErrorCode } from "./types";

const MAGIC_BYTES = [0xf0, 0x9f, 0x8f, 0x8e];
const MAGIC_TEXT = "🏎";
const GARAGE61_TDF_DATA_URL_PREFIX = "data:application/octet-stream;base64,";
const HEADER_MIN_LENGTH = 18;
const DESCRIPTOR_LENGTH_OFFSET = 16;
const EXPECTED_FORMAT_BYTES = [0x64, 0x66, 0x04];

export type { Garage61TelemetryDecodeErrorCode } from "./types";

export class Garage61TelemetryDecodeError extends Error {
  constructor(
    public readonly code: Garage61TelemetryDecodeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "Garage61TelemetryDecodeError";
  }
}

interface ChannelDescriptor {
  id: number;
  min?: number;
  max?: number;
  sampleCount: number;
  byteLength: number;
}

interface VarintResult {
  value: number;
  offset: number;
}

export function decodeGarage61TelemetryBinary(
  input: ArrayBuffer | ArrayBufferView,
): DecodedGarage61Telemetry {
  const bytes = normaliseGarage61TelemetryPayload(input);

  if (bytes.byteLength < HEADER_MIN_LENGTH) {
    throwDecodeError("unexpected_eof", "TDF payload is too short for a header");
  }

  validateHeader(bytes);

  const descriptorLength = readVarint(bytes, DESCRIPTOR_LENGTH_OFFSET);
  const descriptorStart = descriptorLength.offset;
  const descriptorEnd = descriptorStart + descriptorLength.value;
  if (descriptorEnd > bytes.byteLength) {
    throwDecodeError(
      "unexpected_eof",
      "Descriptor block extends beyond the payload",
    );
  }

  const subBytes = bytes.subarray(descriptorStart, descriptorEnd);
  const descriptorBlock = parseDescriptorBlock(subBytes);

  let rawOffset = descriptorEnd;
  const channels: DecodedGarage61Channel[] = [];
  const unknownChannels: DecodedGarage61Channel[] = [];

  for (const descriptor of descriptorBlock.channels) {
    const dtype = resolveDtype(descriptor);
    const bytesPerSample = byteLengthForDtype(dtype);
    const expectedByteLength = descriptor.sampleCount * bytesPerSample;

    if (descriptor.byteLength !== expectedByteLength) {
      throwDecodeError(
        "channel_length_mismatch",
        `Channel ${descriptor.id} declares ${descriptor.byteLength} bytes, expected ${expectedByteLength}`,
      );
    }

    const channelEnd = rawOffset + descriptor.byteLength;
    if (channelEnd > bytes.byteLength) {
      throwDecodeError(
        "unexpected_eof",
        `Channel ${descriptor.id} payload extends beyond the file`,
      );
    }

    const values = decodeValues(bytes, rawOffset, descriptor.sampleCount, dtype);
    const decoded = makeDecodedChannel(descriptor, dtype, values, rawOffset);
    channels.push(decoded);

    if (!garage61KnownChannelById.has(descriptor.id)) {
      unknownChannels.push(decoded);
    }

    rawOffset = channelEnd;
  }

  if (rawOffset !== bytes.byteLength) {
    throwDecodeError(
      "trailing_bytes",
      `TDF payload has ${bytes.byteLength - rawOffset} trailing bytes`,
    );
  }

  return {
    meta: {
      magic: MAGIC_TEXT,
      sampleCount: descriptorBlock.sampleCount,
      sampleRateOrStep: descriptorBlock.sampleRateOrStep,
      rawDataStart: descriptorEnd,
      rawDataEnd: rawOffset,
      fileSizeBytes: bytes.byteLength,
    },
    channels,
    unknownChannels,
  };
}

export function normaliseGarage61TelemetryPayload(
  input: ArrayBuffer | ArrayBufferView | string,
): Uint8Array {
  if (typeof input === "string") {
    return decodeTextPayload(input);
  }

  const bytes = toUint8Array(input);
  if (hasMagicBytes(bytes)) {
    return bytes;
  }

  const text = decodeUtf8Text(bytes);
  if (!text) {
    return bytes;
  }

  return decodeTextPayload(text, bytes);
}

function toUint8Array(input: ArrayBuffer | ArrayBufferView): Uint8Array {
// ArrayBufferView path: Uint8Array, DataView, etc.
  if (ArrayBuffer.isView(input)) {
    const view = input as ArrayBufferView;
    const source = new Uint8Array(
      view.buffer,
      view.byteOffset,
      view.byteLength
    );

    const local = new Uint8Array(source.byteLength);

    for (let i = 0; i < source.byteLength; i++) {
      local[i] = source[i];
    }

    return local;
  }

  // ArrayBuffer path.
  const source = new Uint8Array(input);
  const local = new Uint8Array(source.byteLength);

  for (let i = 0; i < source.byteLength; i++) {
    local[i] = source[i];
  }

  return local;
}

function hasMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.byteLength < MAGIC_BYTES.length) {
    return false;
  }

  return MAGIC_BYTES.every((byte, index) => bytes[index] === byte);
}

function decodeTextPayload(text: string, fallback?: Uint8Array): Uint8Array {
  const trimmed = text.trim();
  const payload = trimmed.startsWith(GARAGE61_TDF_DATA_URL_PREFIX)
    ? trimmed.slice(GARAGE61_TDF_DATA_URL_PREFIX.length)
    : trimmed;

  if (!payload) {
    throw new Error("TDF base64 payload is empty");
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(payload) || payload.length % 4 !== 0) {
    if (fallback) {
      return fallback;
    }

    throw new Error("TDF base64 payload is malformed");
  }

  return decodeBase64(payload);
}

function decodeUtf8Text(bytes: Uint8Array): string | undefined {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

function decodeBase64(payload: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(payload, "base64"));
  }

  const binary = globalThis.atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function validateHeader(bytes: Uint8Array): void {
  for (let index = 0; index < MAGIC_BYTES.length; index += 1) {
    if (bytes[index] !== MAGIC_BYTES[index]) {
      throwDecodeError("invalid_magic", "TDF payload has invalid magic bytes");
    }
  }

  for (let index = 0; index < EXPECTED_FORMAT_BYTES.length; index += 1) {
    if (bytes[MAGIC_BYTES.length + index] !== EXPECTED_FORMAT_BYTES[index]) {
      throwDecodeError(
        "unsupported_descriptor",
        "TDF payload uses an unsupported header format",
      );
    }
  }
}

function parseDescriptorBlock(bytes: Uint8Array): {
  sampleRateOrStep?: number;
  sampleCount: number;
  channels: ChannelDescriptor[];
} {
  let offset = 0;
  let sampleRateOrStep: number | undefined;
  let sampleCount: number | undefined;
  const channels: ChannelDescriptor[] = [];

  while (offset < bytes.byteLength) {
    const tag = readVarint(bytes, offset);
    offset = tag.offset;
    const field = tag.value >> 3;
    const wireType = tag.value & 0x07;

    if (field === 1 && wireType === 0) {
      const result = readVarint(bytes, offset);
      sampleRateOrStep = result.value;
      offset = result.offset;
    } else if (field === 2 && wireType === 0) {
      const result = readVarint(bytes, offset);
      sampleCount = result.value;
      offset = result.offset;
    } else if (field === 3 && wireType === 2) {
      const length = readVarint(bytes, offset);
      offset = length.offset;
      const end = offset + length.value;
      if (end > bytes.byteLength) {
        throwDecodeError(
          "unexpected_eof",
          "Channel descriptor extends beyond descriptor block",
        );
      }
      channels.push(parseChannelDescriptor(bytes.subarray(offset, end)));
      offset = end;
    } else {
      offset = skipWireValue(bytes, offset, wireType);
    }
  }

  if (sampleCount === undefined || channels.length === 0) {
    throwDecodeError(
      "unsupported_descriptor",
      "Descriptor block is missing sample count or channels",
    );
  }

  for (const channel of channels) {
    if (channel.sampleCount !== sampleCount) {
      throwDecodeError(
        "channel_length_mismatch",
        `Channel ${channel.id} sample count ${channel.sampleCount} does not match file sample count ${sampleCount}`,
      );
    }
  }

  return { sampleRateOrStep, sampleCount, channels };
}

function parseChannelDescriptor(bytes: Uint8Array): ChannelDescriptor {
  let offset = 0;
  let id: number | undefined;
  let min: number | undefined;
  let max: number | undefined;
  let sampleCount: number | undefined;
  let byteLength: number | undefined;

  while (offset < bytes.byteLength) {
    const tag = readVarint(bytes, offset);
    offset = tag.offset;
    const field = tag.value >> 3;
    const wireType = tag.value & 0x07;

    if (field === 1 && wireType === 0) {
      const result = readVarint(bytes, offset);
      id = result.value;
      offset = result.offset;
    } else if (field === 7 && wireType === 5) {
      min = readFloat32(bytes, offset);
      offset += 4;
    } else if (field === 8 && wireType === 5) {
      max = readFloat32(bytes, offset);
      offset += 4;
    } else if (field === 9 && wireType === 0) {
      const result = readVarint(bytes, offset);
      sampleCount = result.value;
      offset = result.offset;
    } else if (field === 10 && wireType === 0) {
      const result = readVarint(bytes, offset);
      byteLength = result.value;
      offset = result.offset;
    } else {
      offset = skipWireValue(bytes, offset, wireType);
    }
  }

  if (
    id === undefined ||
    sampleCount === undefined ||
    byteLength === undefined
  ) {
    throwDecodeError(
      "unsupported_descriptor",
      "Channel descriptor is missing id, sample count, or byte length",
    );
  }

  return { id, min, max, sampleCount, byteLength };
}

function resolveDtype(descriptor: ChannelDescriptor): TelemetryDtype {
  const known = garage61KnownChannelById.get(descriptor.id);
  if (known) {
    return known.dtype;
  }

  const bytesPerSample = descriptor.byteLength / descriptor.sampleCount;
  if (!Number.isInteger(bytesPerSample)) {
    throwDecodeError(
      "unsupported_dtype",
      `Channel ${descriptor.id} has a non-integral byte width`,
    );
  }

  if (bytesPerSample === 1) {
    return "uint8";
  }

  if (bytesPerSample === 8) {
    return "float64";
  }

  if (bytesPerSample === 4) {
    if (descriptor.id === 20) {
      return "int32";
    }

    return "float32";
  }

  throwDecodeError(
    "unsupported_dtype",
    `Channel ${descriptor.id} uses unsupported ${bytesPerSample}-byte samples`,
  );
}

function byteLengthForDtype(dtype: TelemetryDtype): number {
  if (dtype === "uint8") {
    return 1;
  }

  if (dtype === "float64") {
    return 8;
  }

  return 4;
}

function decodeValues(
  bytes: Uint8Array,
  rawOffset: number,
  sampleCount: number,
  dtype: TelemetryDtype,
): DecodedChannelValues {
  const view = new DataView(bytes.buffer, bytes.byteOffset + rawOffset);

  if (dtype === "float32") {
    const values = new Float32Array(sampleCount);
    for (let index = 0; index < sampleCount; index += 1) {
      values[index] = view.getFloat32(index * 4, true);
    }
    return values;
  }

  if (dtype === "float64") {
    const values = new Float64Array(sampleCount);
    for (let index = 0; index < sampleCount; index += 1) {
      values[index] = view.getFloat64(index * 8, true);
    }
    return values;
  }

  if (dtype === "int32") {
    const values = new Int32Array(sampleCount);
    for (let index = 0; index < sampleCount; index += 1) {
      values[index] = view.getInt32(index * 4, true);
    }
    return values;
  }

  return bytes.slice(rawOffset, rawOffset + sampleCount);
}

function makeDecodedChannel(
  descriptor: ChannelDescriptor,
  dtype: TelemetryDtype,
  values: DecodedChannelValues,
  rawOffset: number,
): DecodedGarage61Channel {
  const known = garage61KnownChannelById.get(descriptor.id);
  const name = known?.name ?? makeUnknownChannelName(descriptor.id, dtype);
  const range = calculateRange(values);

  return {
    id: descriptor.id,
    name,
    dtype,
    values,
    sampleCount: descriptor.sampleCount,
    byteLength: descriptor.byteLength,
    rawOffset,
    decodedMin: range.min,
    decodedMax: range.max,
  };
}

function makeUnknownChannelName(id: number, dtype: TelemetryDtype): string {
  if (dtype === "uint8") {
    return `channel_${id}_unknown_u8`;
  }

  if (dtype === "int32") {
    return `channel_${id}_unknown_i32`;
  }

  return `channel_${id}_unknown`;
}

function calculateRange(values: DecodedChannelValues): {
  min: number;
  max: number;
} {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const value of values) {
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }

  return { min, max };
}

function readVarint(bytes: Uint8Array, offset: number): VarintResult {
  let value = 0;
  let shift = 0;

  for (let index = offset; index < bytes.byteLength; index += 1) {
    const byte = bytes[index]!;
    value += (byte & 0x7f) * 2 ** shift;

    if ((byte & 0x80) === 0) {
      return { value, offset: index + 1 };
    }

    shift += 7;
    if (shift > 35) {
      throwDecodeError("unsupported_descriptor", "Varint is too large");
    }
  }

  throwDecodeError("unexpected_eof", "Unexpected EOF while reading varint");
}

function skipWireValue(
  bytes: Uint8Array,
  offset: number,
  wireType: number,
): number {
  if (wireType === 0) {
    return readVarint(bytes, offset).offset;
  }

  if (wireType === 1) {
    return checkedOffset(bytes, offset, 8);
  }

  if (wireType === 2) {
    const length = readVarint(bytes, offset);
    return checkedOffset(bytes, length.offset, length.value);
  }

  if (wireType === 5) {
    return checkedOffset(bytes, offset, 4);
  }

  throwDecodeError(
    "unsupported_descriptor",
    `Unsupported protobuf wire type ${wireType}`,
  );
}

function checkedOffset(bytes: Uint8Array, offset: number, length: number): number {
  const next = offset + length;
  if (next > bytes.byteLength) {
    throwDecodeError("unexpected_eof", "Unexpected EOF while skipping value");
  }
  return next;
}

function readFloat32(bytes: Uint8Array, offset: number): number {
  if (offset + 4 > bytes.byteLength) {
    throwDecodeError("unexpected_eof", "Unexpected EOF while reading float32");
  }

  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getFloat32(
    0,
    true,
  );
}

function throwDecodeError(
  code: Garage61TelemetryDecodeErrorCode,
  message: string,
): never {
  throw new Garage61TelemetryDecodeError(code, message);
}
