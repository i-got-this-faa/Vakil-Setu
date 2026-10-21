import { generateKeyPairSync, verify } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AiRequest, AiTransportMetadata } from "../convex/lib/ai";
import { nativeVertexProvider } from "../convex/lib/aiVertex";
import { vertexConfig, VERTEX_TOKEN_URL } from "../convex/lib/vertexConfig";

// Ephemeral synthetic credentials only; no environment, disk keys, or real network.
const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = rsa.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const serviceAccount = { type: "service_account", project_id: "synthetic-project", client_email: "test@synthetic-project.iam.gserviceaccount.com", private_key: pem, token_uri: VERTEX_TOKEN_URL };
const request: AiRequest = { systemInstruction: "Synthetic system", messages: [
  { role: "user", parts: [{ kind: "text", text: "private-case-marker" }, { kind: "file", mimeType: "application/pdf", dataBase64: "c3ludGhldGlj" }] },
  { role: "assistant", parts: [{ kind: "text", text: "Previous answer" }] },
  { role: "user", parts: [{ kind: "text", text: "Follow up" }] },
], output: { kind: "text" }, maxOutputTokens: 512, maxReplyChars: 8000 };
let sequence = 0;
function config(overrides: Record<string, string | undefined> = {}) {
  const result = vertexConfig({ VERTEX_FALLBACK_ENABLED: "true", VERTEX_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...serviceAccount, client_email: `test${++sequence}@synthetic-project.iam.gserviceaccount.com` }), ...overrides });
  if (result.kind !== "configured") throw new Error("Invalid synthetic config");
  return result;
}
function token(expiresIn = 3600) { return Response.json({ access_token: "synthetic-access-token", token_type: "Bearer", expires_in: expiresIn }); }
function reply(text = "Synthetic answer") { return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ thought: true, text: "private reasoning" }, { text }] } }] }); }
function options(signal = new AbortController().signal, metadata: AiTransportMetadata[] = []) { return { signal, onMetadata: (value: AiTransportMetadata) => metadata.push(value) }; }
function mockResponses(responses: Response[]) {
  const fetcher = vi.fn(async () => { const response = responses.shift(); if (!response) throw new Error("Unexpected fetch"); return response; });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("pure Vertex credential boundary", () => {
  it("requires explicit activation and JSON credentials; applies fixed defaults", () => {
    expect(vertexConfig({})).toEqual({ kind: "unavailable", reason: "not_configured" });
    expect(vertexConfig({ VERTEX_SERVICE_ACCOUNT_JSON: JSON.stringify(serviceAccount) })).toEqual({ kind: "unavailable", reason: "not_configured" });
    expect(vertexConfig({ VERTEX_FALLBACK_ENABLED: "TRUE", VERTEX_SERVICE_ACCOUNT_JSON: JSON.stringify(serviceAccount) })).toEqual({ kind: "unavailable", reason: "not_configured" });
    const valid = config();
    expect(valid).toMatchObject({ kind: "configured", model: "gemini-3.6-flash", location: "global", projectId: "synthetic-project", url: "https://aiplatform.googleapis.com/v1/projects/synthetic-project/locations/global/publishers/google/models/gemini-3.6-flash:generateContent" });
    expect(config({ VERTEX_LOCATION: "us-central1" }).url).toContain("https://us-central1-aiplatform.googleapis.com/v1/projects/synthetic-project/locations/us-central1/");
    expect(config({ VERTEX_LOCATION: "global", VERTEX_MODEL: "gemini-2.5-pro" }).url).toBe("https://aiplatform.googleapis.com/v1/projects/synthetic-project/locations/global/publishers/google/models/gemini-2.5-pro:generateContent");
  });
  it.each(["null", "[]", "{}", "{", "file:///secret.json", "x".repeat(65_537), JSON.stringify("service_account")])("rejects untrusted credential JSON %#", raw => {
    expect(vertexConfig({ VERTEX_FALLBACK_ENABLED: "true", VERTEX_SERVICE_ACCOUNT_JSON: raw })).toEqual({ kind: "unavailable", reason: "invalid_config" });
  });
  it.each([
    { type: "authorized_user" }, { project_id: "../escape" }, { client_email: "person@example.com" }, { private_key: "invalid" },
    { private_key: "-----BEGIN PRIVATE KEY-----\nYWJj\n-----END PRIVATE KEY-----" },
    { token_uri: "https://attacker.example/token" }, { token_uri: "file:///token" }, { token_uri: "https://oauth2.googleapis.com/token?leak=1" },
    { token_uri: "https://oauth2.googleapis.com.attacker.example/token" }, { token_uri: null },
  ])("rejects malformed fields and arbitrary OAuth destinations %#", patch => {
    const result = vertexConfig({ VERTEX_FALLBACK_ENABLED: "true", VERTEX_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...serviceAccount, ...patch }) });
    expect(result).toEqual({ kind: "unavailable", reason: "invalid_config" });
    expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
  });
  it.each([{ VERTEX_LOCATION: "https://attacker.example" }, { VERTEX_LOCATION: "../global" }, { VERTEX_LOCATION: "" }, { VERTEX_MODEL: "../model" }, { VERTEX_MODEL: "" }])("rejects endpoint injection %#", overrides => {
    expect(vertexConfig({ VERTEX_FALLBACK_ENABLED: "true", VERTEX_SERVICE_ACCOUNT_JSON: JSON.stringify(serviceAccount), ...overrides })).toEqual({ kind: "unavailable", reason: "invalid_config" });
  });
  it("rejects an EC private key at the pure boundary", () => {
    const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    expect(vertexConfig({ VERTEX_FALLBACK_ENABLED: "true", VERTEX_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...serviceAccount, private_key: ec.privateKey.export({ type: "pkcs8", format: "pem" }) }) })).toEqual({ kind: "unavailable", reason: "invalid_config" });
  });
});

describe("Vertex OAuth and native generation", () => {
  it("signs a verifiable RS256 JWT, uses the fixed OAuth grant, maps multimodal history, and caches across provider instances", async () => {
    const configured = config();
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, init }); return url === VERTEX_TOKEN_URL ? token() : reply(); }));
    const metadata: AiTransportMetadata[] = [];
    expect(await nativeVertexProvider(configured).generate(request, options(undefined, metadata))).toEqual({ kind: "reply", text: "Synthetic answer" });
    expect(await nativeVertexProvider({ ...configured }).generate(request, options())).toMatchObject({ kind: "reply" });
    expect(calls.map(call => call.url)).toEqual([VERTEX_TOKEN_URL, configured.url, configured.url]);
    const auth = calls[0]; const generation = calls[1];
    expect(auth?.init.redirect).toBe("error");
    const form = new URLSearchParams(String(auth?.init.body));
    expect(form.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    const [header, claims, signature] = (form.get("assertion") ?? "").split(".");
    if (!header || !claims || !signature) throw new Error("Missing signed JWT");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    const decoded: unknown = JSON.parse(Buffer.from(claims, "base64url").toString());
    expect(decoded).toMatchObject({ iss: configured.clientEmail, aud: VERTEX_TOKEN_URL, scope: "https://www.googleapis.com/auth/cloud-platform", iat: expect.any(Number), exp: expect.any(Number) });
    if (typeof decoded !== "object" || decoded === null || !("iat" in decoded) || !("exp" in decoded) || typeof decoded.iat !== "number" || typeof decoded.exp !== "number") throw new Error("Missing JWT timestamps");
    expect(decoded.exp - decoded.iat).toBe(3600);
    expect(verify("RSA-SHA256", Buffer.from(`${header}.${claims}`), rsa.publicKey, Buffer.from(signature, "base64url"))).toBe(true);
    expect(generation?.init).toMatchObject({ method: "POST", redirect: "error", headers: { Authorization: "Bearer synthetic-access-token", "Content-Type": "application/json" } });
    expect(JSON.parse(String(generation?.init.body))).toEqual({ systemInstruction: { parts: [{ text: request.systemInstruction }] }, contents: [
      { role: "user", parts: [{ text: "private-case-marker" }, { inlineData: { mimeType: "application/pdf", data: "c3ludGhldGlj" } }] },
      { role: "model", parts: [{ text: "Previous answer" }] }, { role: "user", parts: [{ text: "Follow up" }] },
    ], generationConfig: { candidateCount: 1, maxOutputTokens: 512, thinkingConfig: { thinkingLevel: "MINIMAL", includeThoughts: false } } });
    expect(metadata.at(-1)).toMatchObject({ httpStatus: 200, firstByteMs: expect.any(Number), latencyMs: expect.any(Number) });
    for (const secret of [pem, configured.clientEmail, "synthetic-access-token", "private-case-marker", "private reasoning"]) expect(JSON.stringify(metadata)).not.toContain(secret);
  });
  it("sends Vertex JSON Schema and rejects malformed generated JSON", async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => { if (url === VERTEX_TOKEN_URL) return token(); bodies.push(JSON.parse(String(init.body))); return bodies.length === 1 ? reply('{"summary":"Synthetic"}') : reply("not JSON"); }));
    const provider = nativeVertexProvider(config());
    const schema = { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] };
    const json: AiRequest = { ...request, output: { kind: "json", schema } };
    expect(await provider.generate(json, options())).toEqual({ kind: "reply", text: '{"summary":"Synthetic"}' });
    expect(await provider.generate(json, options())).toEqual({ kind: "unavailable", reason: "malformed" });
    expect(bodies[0]).toMatchObject({ generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema } });
    expect(JSON.stringify(bodies)).not.toContain("responseFormat");
  });
  it("refreshes before expiry and isolates changed credentials", async () => {
    vi.useFakeTimers();
    const configured = config();
    let authCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { if (url === VERTEX_TOKEN_URL) { authCalls++; return token(); } return reply(); }));
    await nativeVertexProvider(configured).generate(request, options());
    await vi.advanceTimersByTimeAsync(3_539_000);
    await nativeVertexProvider(configured).generate(request, options());
    expect(authCalls).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    await nativeVertexProvider(configured).generate(request, options());
    expect(authCalls).toBe(2);
    await nativeVertexProvider({ ...configured, clientEmail: "changed@synthetic-project.iam.gserviceaccount.com" }).generate(request, options());
    expect(authCalls).toBe(3);
    const rotated = generateKeyPairSync("rsa", { modulusLength: 2048 });
    await nativeVertexProvider({ ...configured, privateKey: rotated.privateKey.export({ type: "pkcs8", format: "pem" }).toString() }).generate(request, options());
    expect(authCalls).toBe(4);
  });
  it.each([401, 403, 429, 500, 503])("maps HTTP %i in auth and generation without retry", async status => {
    let fetcher = mockResponses([new Response("private error body", { status })]);
    const expected = { kind: "unavailable", reason: status === 429 ? "rate_limited" : "provider_failed" };
    expect(await nativeVertexProvider(config()).generate(request, options())).toEqual(expected);
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher = mockResponses([token(), new Response("private error body", { status })]);
    expect(await nativeVertexProvider(config()).generate(request, options())).toEqual(expected);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    [{}, "malformed"], [{ access_token: "bad\r\nheader", token_type: "Bearer", expires_in: 3600 }, "malformed"],
    [{ access_token: "synthetic", token_type: "Basic", expires_in: 3600 }, "malformed"],
    [{ access_token: "synthetic", token_type: "Bearer", expires_in: -1 }, "malformed"],
    [{ access_token: "synthetic", token_type: "Bearer", expires_in: "3600" }, "malformed"],
    [{ access_token: "synthetic", token_type: "Bearer", expires_in: 3601 }, "malformed"],
  ])("rejects malformed OAuth success bodies %#", async (value, reason) => {
    const fetcher = mockResponses([Response.json(value)]);
    expect(await nativeVertexProvider(config()).generate(request, options())).toEqual({ kind: "unavailable", reason });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([
    [() => new Response("{"), "malformed"], [() => new Response("x".repeat(65_537)), "response_too_large"],
    [() => Response.json({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "partial" }] } }] }), "truncated"],
    [() => Response.json({ candidates: [{ finishReason: "SAFETY", content: { parts: [{ text: "partial" }] } }] }), "blocked"],
    [() => Response.json({ promptFeedback: { blockReason: "SAFETY" } }), "blocked"],
    [() => Response.json({ candidates: [{ content: { parts: [{ text: "missing STOP" }] } }] }), "malformed"],
    [() => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "thought only", thought: true }] } }] }), "malformed"],
    [() => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ inlineData: {} }] } }] }), "malformed"],
    [() => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "one" }] } }, { finishReason: "STOP" }] }), "malformed"],
    [() => reply("x".repeat(8001)), "truncated"],
  ])("rejects unsuccessful or unsafe generation results %#", async (response, reason) => {
    mockResponses([token(), response()]);
    expect(await nativeVertexProvider(config()).generate(request, options())).toEqual({ kind: "unavailable", reason });
  });
  it("bounds OAuth bodies and refuses to cache malformed auth responses", async () => {
    const provider = nativeVertexProvider(config());
    const fetcher = mockResponses([new Response("x".repeat(65_537)), token(), reply()]);
    expect(await provider.generate(request, options())).toEqual({ kind: "unavailable", reason: "response_too_large" });
    expect(await provider.generate(request, options())).toMatchObject({ kind: "reply" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("returns timeout before dispatch when already aborted", async () => {
    const fetcher = mockResponses([]); const controller = new AbortController(); controller.abort();
    expect(await nativeVertexProvider(config()).generate(request, options(controller.signal))).toEqual({ kind: "unavailable", reason: "timeout" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["auth", "generation"])("settles abort during %s even when fetch ignores it", async phase => {
    const controller = new AbortController();
    let started = () => {};
    const dispatched = new Promise<void>(resolve => { started = resolve; });
    let release = (_response: Response) => {};
    const pending = new Promise<Response>(resolve => { release = resolve; });
    let fetchSignal: AbortSignal | null | undefined;
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (phase === "generation" && url === VERTEX_TOKEN_URL) return token();
      fetchSignal = init.signal; started(); return pending;
    });
    vi.stubGlobal("fetch", fetcher);
    const configured = config();
    const sending = nativeVertexProvider(configured).generate(request, options(controller.signal));
    await dispatched; controller.abort();
    expect(await sending).toEqual({ kind: "unavailable", reason: "timeout" });
    expect(fetchSignal).toHaveProperty("aborted", true);
    release(phase === "auth" ? token() : reply("late answer"));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetcher).toHaveBeenCalledTimes(phase === "auth" ? 1 : 2);
    if (phase === "auth") {
      const fresh = mockResponses([token(), reply()]);
      expect(await nativeVertexProvider(configured).generate(request, options())).toMatchObject({ kind: "reply" });
      expect(fresh).toHaveBeenCalledTimes(2);
    }
  });
  it("bounds OAuth headers at ten seconds independently of the caller deadline", async () => {
    vi.useFakeTimers();
    let fetchSignal: AbortSignal | null | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => { fetchSignal = init.signal; return await new Promise<Response>(() => {}); }));
    const sending = nativeVertexProvider(config()).generate(request, options());
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await sending).toEqual({ kind: "unavailable", reason: "timeout" });
    expect(fetchSignal).toHaveProperty("aborted", true);
  });
  it.each(["auth", "generation"])("cancels a stalled %s response body", async phase => {
    const controller = new AbortController();
    let bodyStarted = () => {};
    const started = new Promise<void>(resolve => { bodyStarted = resolve; });
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ pull() { bodyStarted(); }, cancel }, { highWaterMark: 0 });
    mockResponses(phase === "auth" ? [new Response(stream)] : [token(), new Response(stream)]);
    const sending = nativeVertexProvider(config()).generate(request, options(controller.signal));
    await started; await Promise.resolve(); await Promise.resolve(); controller.abort();
    expect(await sending).toEqual({ kind: "unavailable", reason: "timeout" });
    expect(cancel).toHaveBeenCalled();
  });
  it("sanitizes network errors and emits no logs or private diagnostics", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const metadata: AiTransportMetadata[] = [];
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("private-error-marker"); }));
    expect(await nativeVertexProvider(config()).generate(request, options(undefined, metadata))).toEqual({ kind: "unavailable", reason: "provider_failed" });
    expect(metadata.at(-1)).toMatchObject({ httpStatus: null, latencyMs: expect.any(Number) });
    expect(JSON.stringify(metadata)).not.toContain("private");
    expect(info).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
  });
});
