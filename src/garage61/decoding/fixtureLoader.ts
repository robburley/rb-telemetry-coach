const GARAGE61_TDF_DATA_URL_PREFIX = "data:application/octet-stream;base64,";

export function parseGarage61TdfDataUrlFixture(
  text: string,
  fixtureName = "Garage 61 TDF fixture",
): Uint8Array {
  const trimmed = text.trim();

  if (!trimmed.startsWith(GARAGE61_TDF_DATA_URL_PREFIX)) {
    throw new Error(
      `${fixtureName}: missing required ${GARAGE61_TDF_DATA_URL_PREFIX} prefix`,
    );
  }

  const payload = trimmed.slice(GARAGE61_TDF_DATA_URL_PREFIX.length);
  if (!payload) {
    throw new Error(`${fixtureName}: base64 payload is empty`);
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(payload) || payload.length % 4 !== 0) {
    throw new Error(`${fixtureName}: base64 payload is malformed`);
  }

  const bytes = decodeBase64(payload);
  if (encodeBase64(bytes) !== payload) {
    throw new Error(`${fixtureName}: base64 payload is not canonical`);
  }

  return bytes;
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

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return globalThis.btoa(binary);
}
