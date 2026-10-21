// Pure server configuration: safe to import from Convex's default runtime.
// Never expose the configured branch (which contains credentials) to clients.
export const VERTEX_TOKEN_URL = "https://oauth2.googleapis.com/token";

type VertexConfig = { kind: "unavailable"; reason: "not_configured" | "invalid_config" } | {
  kind: "configured"; model: string; location: string; projectId: string; url: string;
  clientEmail: string; privateKey: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Validate the PKCS#8 RSA envelope without Node APIs; signing validates the key itself.
function isRsaPem(value: string): boolean {
  const match = /^-----BEGIN PRIVATE KEY-----\r?\n([A-Za-z0-9+/=\r\n]+)\r?\n-----END PRIVATE KEY-----\s*$/u.exec(value);
  if (!match?.[1] || value.length > 16_384) return false;
  try {
    const bytes = Uint8Array.from(atob(match[1].replace(/\s/gu, "")), char => char.charCodeAt(0));
    let offset = 0;
    const read = (tag: number) => {
      if (bytes[offset++] !== tag) throw new Error("Invalid key");
      let length = bytes[offset++];
      if (length === undefined) throw new Error("Invalid key");
      if (length > 127) {
        const count = length & 127;
        if (count === 0 || count > 3) throw new Error("Invalid key");
        length = 0;
        for (let i = 0; i < count; i++) {
          const byte = bytes[offset++];
          if (byte === undefined) throw new Error("Invalid key");
          length = length * 256 + byte;
        }
      }
      if (offset + length > bytes.length) throw new Error("Invalid key");
      return length;
    };
    if (read(0x30) !== bytes.length - offset || read(0x02) !== 1 || bytes[offset++] !== 0) return false;
    const algorithmLength = read(0x30);
    const algorithmEnd = offset + algorithmLength;
    if (read(0x06) !== 9) return false;
    for (const byte of [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]) if (bytes[offset++] !== byte) return false;
    if (offset < algorithmEnd && read(0x05) !== 0) return false;
    if (offset !== algorithmEnd || read(0x04) !== bytes.length - offset) return false;
    if (read(0x30) !== bytes.length - offset) return false;
    for (let i = 0; i < 9; i++) {
      const size = read(0x02);
      if (size === 0 || (i === 1 && size < 256)) return false;
      offset += size;
    }
    return offset === bytes.length;
  } catch { return false; }
}

export function vertexConfig(env: Record<string, string | undefined>): VertexConfig {
  if (env.VERTEX_FALLBACK_ENABLED !== "true" || !env.VERTEX_SERVICE_ACCOUNT_JSON?.trim()) return { kind: "unavailable", reason: "not_configured" };
  try {
    if (env.VERTEX_SERVICE_ACCOUNT_JSON.length > 65_536) return { kind: "unavailable", reason: "invalid_config" };
    const value: unknown = JSON.parse(env.VERTEX_SERVICE_ACCOUNT_JSON);
    const location = env.VERTEX_LOCATION?.trim() ?? "global";
    const model = env.VERTEX_MODEL?.trim() ?? "gemini-3.6-flash";
    if (!isRecord(value) || value.type !== "service_account" || typeof value.project_id !== "string" || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u.test(value.project_id)
      || typeof value.client_email !== "string" || value.client_email.length > 254 || !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.gserviceaccount\.com$/u.test(value.client_email)
      || typeof value.private_key !== "string" || !isRsaPem(value.private_key) || value.token_uri !== VERTEX_TOKEN_URL
      || location.length > 64 || (location !== "global" && !/^[a-z]+(?:-[a-z]+)+[0-9]+$/u.test(location))
      || model.length > 100 || !/^gemini-[A-Za-z0-9._-]+$/u.test(model)) return { kind: "unavailable", reason: "invalid_config" };
    const origin = location === "global" ? "https://aiplatform.googleapis.com" : `https://${location}-aiplatform.googleapis.com`;
    return { kind: "configured", model, location, projectId: value.project_id, clientEmail: value.client_email, privateKey: value.private_key,
      url: `${origin}/v1/projects/${value.project_id}/locations/${location}/publishers/google/models/${model}:generateContent` };
  } catch { return { kind: "unavailable", reason: "invalid_config" }; }
}
