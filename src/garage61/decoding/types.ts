import type { TelemetryDtype } from "../../domain/telemetryTypes";

export type Garage61TelemetryDecodeErrorCode =
  | "invalid_magic"
  | "unsupported_descriptor"
  | "channel_length_mismatch"
  | "unexpected_eof"
  | "trailing_bytes"
  | "unsupported_dtype";

export interface Garage61KnownChannelDefinition {
  id: number;
  name: string;
  dtype: TelemetryDtype;
}
