import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { SPEECH_LIMITS, looksLikeMp3, speechCapabilities, speechConfig, synthesizeElevenLabs } from "../convex/lib/speech";

const modules = import.meta.glob("../convex/**/*.ts");
const VOICE = "testVoice0123456789";
const KEY = "test-only-noncredential";
const REPLY = "Prepare your documents and consult a qualified advocate.";
// ID3-tagged bytes: a minimal stand-in for an MP3 stream (no real provider audio is used in tests).
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xfb, 0x90]);
const audioResponse = (bytes: Uint8Array = MP3) => new Response(new Uint8Array(bytes).buffer as ArrayBuffer, { status: 200, headers: { "Content-Type": "audio/mpeg" } });

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

async function fixture(locale: "en" | "pa" = "en") {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject: "speech-owner" });
  const stranger = t.withIdentity({ subject: "speech-stranger" });
  const accountId = await user.mutation(api.accounts.ensure, { role: "user", displayName: "Speech owner", locale: "en" });
  await stranger.mutation(api.accounts.ensure, { role: "user", displayName: "Speech stranger", locale: "en" });
  const caseId = await user.mutation(api.cases.create, { title: "Speech intake", text: "Private property question.", locale, context: [] });
  const legalCase = await t.run(ctx => ctx.db.get(caseId));
  if (!legalCase) throw new Error("fixture case missing");
  const turnId = await insertTurn(t, caseId, accountId, { kind: "reply", text: REPLY });
  return { t, user, stranger, accountId, caseId, turnId };
}

async function insertTurn(t: ReturnType<typeof convexTest>, caseId: Id<"cases">, ownerId: Id<"accounts">, result: { kind: "reply"; text: string } | { kind: "pending" } | { kind: "unavailable"; reason: string }, requestId = `request-${Math.random()}`) {
  return await t.run(ctx => ctx.db.insert("chatTurns", {
    caseId, ownerId, requestId, text: "Question from the user.", createdAt: Date.now(), expiresAt: Date.now() + 60_000,
    documentIds: [], documentNames: [], contextRevision: 0, summaryVersion: 0, result,
  }));
}

const count = (t: ReturnType<typeof convexTest>, table: "speechConsents" | "speechAttempts") => t.run(ctx => ctx.db.query(table).collect()).then(rows => rows.length);

describe("server speech configuration", () => {
  it("reports missing keys and invalid voice IDs without exposing secrets", () => {
    expect(speechConfig({})).toEqual({ kind: "unavailable", reason: "not_configured" });
    expect(speechConfig({ ELEVENLABS_API_KEY: KEY })).toEqual({ kind: "unavailable", reason: "not_configured" });
    expect(speechConfig({ ELEVENLABS_API_KEY: KEY, ELEVENLABS_VOICE_ID: "../evil" })).toEqual({ kind: "unavailable", reason: "invalid_config" });
    expect(speechConfig({ ELEVENLABS_API_KEY: "has space", ELEVENLABS_VOICE_ID: VOICE })).toEqual({ kind: "unavailable", reason: "invalid_config" });
    const capabilities = speechCapabilities({ ELEVENLABS_API_KEY: KEY, ELEVENLABS_VOICE_ID: VOICE });
    expect(capabilities).toMatchObject({ configured: true, provider: "elevenlabs", model: "eleven_multilingual_v2", languages: ["en", "hi"] });
    expect(JSON.stringify(capabilities)).not.toContain(KEY);
    expect(JSON.stringify(capabilities)).not.toContain(VOICE);
    expect(capabilities.languages).not.toContain("pa");
  });

  it("publishes only public capability metadata through the query", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("ELEVENLABS_API_KEY", KEY);
    vi.stubEnv("ELEVENLABS_VOICE_ID", VOICE);
    const published = await t.query(api.speech.capabilities, {});
    expect(published).toMatchObject({ configured: true, languages: ["en", "hi"], provider: "elevenlabs" });
    expect(JSON.stringify(published)).not.toContain(KEY);
    expect(JSON.stringify(published)).not.toContain(VOICE);
  });

  it("recognises MP3 frames and rejects JSON or HTML bodies", () => {
    expect(looksLikeMp3(MP3)).toBe(true);
    expect(looksLikeMp3(new Uint8Array([0xff, 0xfb, 0x90]))).toBe(true);
    expect(looksLikeMp3(new TextEncoder().encode('{"detail":"nope"}'))).toBe(false);
    expect(looksLikeMp3(new TextEncoder().encode("<html>"))).toBe(false);
  });
});

describe("persisted-reply speech synthesis", () => {
  it("resolves text on the server, uses the fixed HTTPS endpoint without redirects, and records consent before dispatch", async () => {
    const f = await fixture();
    vi.stubEnv("ELEVENLABS_API_KEY", KEY);
    vi.stubEnv("ELEVENLABS_VOICE_ID", VOICE);
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => audioResponse());
    vi.stubGlobal("fetch", fetchMock);
    const result = await f.user.action(api.speech.synthesize, { turnId: f.turnId, consent: true });
    expect(result).toMatchObject({ kind: "audio", mimeType: "audio/mpeg" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`);
    expect(init?.redirect).toBe("error");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["xi-api-key"]).toBe(KEY);
    expect(JSON.parse(String(init?.body))).toEqual({ text: REPLY, model_id: "eleven_multilingual_v2" });
    const consents = await f.t.run(ctx => ctx.db.query("speechConsents").collect());
    expect(consents).toHaveLength(1);
    expect(consents[0]).toMatchObject({ ownerId: f.accountId, turnId: f.turnId, provider: "elevenlabs", model: "eleven_multilingual_v2", recipientOrigin: "https://api.elevenlabs.io" });
    expect(await count(f.t, "speechAttempts")).toBe(1);
  });

  it("does not let another account synthesize someone else's reply, and never dispatches or audits", async () => {
    const f = await fixture();
    vi.stubEnv("ELEVENLABS_API_KEY", KEY);
    vi.stubEnv("ELEVENLABS_VOICE_ID", VOICE);
    const fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal("fetch", fetchMock);
    await expect(f.stranger.action(api.speech.synthesize, { turnId: f.turnId, consent: true })).rejects.toThrow("Case not found.");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await count(f.t, "speechConsents")).toBe(0);
    expect(await count(f.t, "speechAttempts")).toBe(0);
  });

  it("refuses without an explicit literal consent flag before any work happens", async () => {
    const f = await fixture();
    vi.stubEnv("ELEVENLABS_API_KEY", KEY);
    vi.stubEnv("ELEVENLABS_VOICE_ID", VOICE);
    const fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal("fetch", fetchMock);
    // @ts-expect-error Consent must be the literal true; false or omitted must never dispatch.
    await expect(f.user.action(api.speech.synthesize, { turnId: f.turnId, consent: false })).rejects.toThrow("Expected `true`");
    // @ts-expect-error Consent is required.
    await expect(f.user.action(api.speech.synthesize, { turnId: f.turnId })).rejects.toThrow("consent");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await count(f.t, "speechConsents")).toBe(0);
  });

  it("returns not_configured without reading the turn or dispatching when the API key is missing", async () => {
    const f = await fixture();
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    vi.stubEnv("ELEVENLABS_VOICE_ID", VOICE);
    const fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal("fetch", fetchMock);
    expect(await f.user.action(api.speech.synthesize, { turnId: f.turnId, consent: true })).toEqual({ kind: "unavailable", reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await count(f.t, "speechConsents")).toBe(0);
  });

  it("returns not_configured when the voice ID is missing", async () => {
    const f = await fixture();
    vi.stubEnv("ELEVENLABS_API_KEY", KEY);
    vi.stubEnv("ELEVENLABS_VOICE_ID", "");
    const fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal("fetch", fetchMock);
    expect(await f.user.action(api.speech.synthesize, { turnId: f.turnId, consent: true })).toEqual({ kind: "unavailable", reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks Punjabi cases with unsupported_language, because the multilingual model does not list Punjabi", async () => {
    const f = await fixture("pa");
    vi.stubEnv("ELEVENLABS_API_KEY", KEY);
    vi.stubEnv("ELEVENLABS_VOICE_ID", VOICE);
    const fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal("fetch", fetchMock);
    expect(await f.user.action(api.speech.synthesize, { turnId: f.turnId, consent: true })).toEqual({ kind: "unavailable", reason: "unsupported_language" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await count(f.t, "speechConsents")).toBe(0);
  });

  it("refuses turns that have no persisted reply (pending or unavailable) without dispatch", async () => {
    const f = await fixture();
    vi.stubEnv("ELEVENLABS_API_KEY", KEY);
    vi.stubEnv("ELEVENLABS_VOICE_ID", VOICE);
    const fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal("fetch", fetchMock);
    const pending = await insertTurn(f.t, f.caseId, f.accountId, { kind: "pending" }, "pending-turn");
    const failed = await insertTurn(f.t, f.caseId, f.accountId, { kind: "unavailable", reason: "timeout" }, "failed-turn");
    expect(await f.user.action(api.speech.synthesize, { turnId: pending, consent: true })).toEqual({ kind: "unavailable", reason: "no_reply" });
    expect(await f.user.action(api.speech.synthesize, { turnId: failed, consent: true })).toEqual({ kind: "unavailable", reason: "no_reply" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await count(f.t, "speechConsents")).toBe(0);
  });

  it("maps provider failures to fixed reasons, never echoes the provider body, and keeps the consent audit", async () => {
    const f = await fixture();
    vi.stubEnv("ELEVENLABS_API_KEY", KEY);
    vi.stubEnv("ELEVENLABS_VOICE_ID", VOICE);
    const cases: Array<[string, () => Response | Promise<Response>, string]> = [
      ["unauthorised", () => new Response(`{"detail":"invalid key ${KEY}"}`, { status: 401 }), "provider_failed"],
      ["rate limited", () => new Response("slow down", { status: 429 }), "rate_limited"],
      ["server error", () => new Response("boom", { status: 500 }), "provider_failed"],
      ["json on 200", () => new Response('{"detail":"not audio"}', { status: 200 }), "malformed"],
      ["declared oversize", () => new Response(MP3, { status: 200, headers: { "content-length": String(SPEECH_LIMITS.audioBytes + 1) } }), "response_too_large"],
    ];
    for (const [, response, reason] of cases) {
      vi.stubGlobal("fetch", vi.fn(async () => response()));
      const turn = await insertTurn(f.t, f.caseId, f.accountId, { kind: "reply", text: REPLY }, `turn-${reason}-${Math.random()}`);
      const result = await f.user.action(api.speech.synthesize, { turnId: turn, consent: true });
      expect(result).toEqual({ kind: "unavailable", reason });
      expect(JSON.stringify(result)).not.toContain(KEY);
    }
    // Consent is audited before dispatch, so every failed attempt also has an audit row.
    expect(await count(f.t, "speechConsents")).toBe(cases.length);
  });

  it("treats a network or redirect refusal as provider_failed and an oversized stream as response_too_large", async () => {
    const f = await fixture();
    vi.stubEnv("ELEVENLABS_API_KEY", KEY);
    vi.stubEnv("ELEVENLABS_VOICE_ID", VOICE);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("redirect mode is set to error"); }));
    expect(await f.user.action(api.speech.synthesize, { turnId: f.turnId, consent: true })).toEqual({ kind: "unavailable", reason: "provider_failed" });
    const turn = await insertTurn(f.t, f.caseId, f.accountId, { kind: "reply", text: REPLY }, "stream-oversize");
    const big = new Uint8Array(SPEECH_LIMITS.audioBytes + 10); big.set(MP3, 0);
    vi.stubGlobal("fetch", vi.fn(async () => audioResponse(big)));
    expect(await f.user.action(api.speech.synthesize, { turnId: turn, consent: true })).toEqual({ kind: "unavailable", reason: "response_too_large" });
  });

  it("blocks a second request for the same reply inside the in-flight window and enforces the hourly account limit", async () => {
    const f = await fixture();
    vi.stubEnv("ELEVENLABS_API_KEY", KEY);
    vi.stubEnv("ELEVENLABS_VOICE_ID", VOICE);
    const fetchMock = vi.fn(async () => audioResponse()); vi.stubGlobal("fetch", fetchMock);
    expect(await f.user.action(api.speech.synthesize, { turnId: f.turnId, consent: true })).toMatchObject({ kind: "audio" });
    await expect(f.user.action(api.speech.synthesize, { turnId: f.turnId, consent: true })).rejects.toThrow("already being prepared");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await count(f.t, "speechConsents")).toBe(1);

    const other = await insertTurn(f.t, f.caseId, f.accountId, { kind: "reply", text: REPLY }, "limit-turn");
    await f.t.run(async ctx => {
      for (let i = 0; i < SPEECH_LIMITS.requestsPerHour - 1; i++) await ctx.db.insert("speechAttempts", { accountId: f.accountId, turnId: f.turnId, at: Date.now() - 1000 });
    });
    await expect(f.user.action(api.speech.synthesize, { turnId: other, consent: true })).rejects.toThrow("30 replies per hour");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts a provider call that never settles, returning timeout instead of hanging", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
    vi.stubGlobal("fetch", fetchMock);
    const pending = synthesizeElevenLabs({ kind: "configured", apiKey: KEY, voiceId: VOICE }, REPLY, controller.signal);
    controller.abort();
    expect(await pending).toEqual({ kind: "unavailable", reason: "timeout" });
  });
});
