type ExpoCrypto = Pick<typeof import("expo-crypto"), "getRandomValues">;

let nativeCrypto: ExpoCrypto | null | undefined;

function secureRandomBytes(count: number): Uint8Array | null {
  const bytes = new Uint8Array(count);
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(bytes);
  if (nativeCrypto === undefined) {
    try {
      // Some Expo Go builds throw on import because they lack the native module.
      const expoCrypto: ExpoCrypto = require("expo-crypto");
      expoCrypto.getRandomValues(bytes);
      nativeCrypto = expoCrypto;
      return bytes;
    } catch {
      nativeCrypto = null;
    }
  }
  return nativeCrypto?.getRandomValues(bytes) ?? null;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function secureRandomHex(count: number): string | null {
  const bytes = secureRandomBytes(count);
  return bytes ? toHex(bytes) : null;
}

/** Generates request IDs and test account names. Use secureRandomHex for secrets. */
export function randomUUID(): string {
  const bytes = secureRandomBytes(16) ?? Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = toHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
