import { afterEach, describe, expect, it, vi } from "vitest";
import { AiDeadlineError, logAiDiagnostic, withAiDeadline } from "../convex/lib/ai";
import type { AiRequest, AiTransportMetadata } from "../convex/lib/ai";
import { geminiRequestBody, geminiThinkingConfig, nativeGeminiProvider } from "../convex/lib/aiGemini";
import { geminiConfig } from "../convex/lib/provider";

const request: AiRequest = { systemInstruction: "Test system", messages: [{ role: "user", parts: [{ kind: "text", text: "private-case-marker" }, { kind: "file", mimeType: "application/pdf", dataBase64: "c3ludGhldGlj" }] }, { role: "assistant", parts: [{ kind: "text", text: "Previous answer" }] }], output: { kind: "text" }, maxOutputTokens: 1024, maxReplyChars: 8000 };
function provider() {
  const config = geminiConfig({ GEMINI_API_KEY: "private-key-marker" });
  if (config.kind !== "configured") throw new Error("Invalid test config");
  return nativeGeminiProvider(config);
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("typed native Gemini adapter", () => {
  it("keeps native wire mapping, thinking support and bounded output inside the adapter", () => {
    expect(geminiRequestBody("gemini-3.6-flash", request)).toMatchObject({ contents: [{ role: "user", parts: [{ text: "private-case-marker" }, { inlineData: { mimeType: "application/pdf", data: "c3ludGhldGlj" } }] }, { role: "model" }], generationConfig: { maxOutputTokens: 1024, candidateCount: 1, thinkingConfig: { thinkingLevel: "MINIMAL", includeThoughts: false } } });
    expect(geminiThinkingConfig("gemini-3.8-flash")).toEqual({ thinkingConfig: { thinkingLevel: "LOW", includeThoughts: false } });
    expect(geminiThinkingConfig("gemini-4-argon")).toEqual({ thinkingConfig: { thinkingLevel: "LOW", includeThoughts: false } });
    expect(geminiThinkingConfig("gemini-2.5-flash")).toEqual({});
    expect(geminiThinkingConfig("gemini-3-unknown-override")).toEqual({});
    expect(geminiRequestBody("gemini-3.6-flash", { ...request, output: { kind: "json", schema: { type: "object" } } })).toMatchObject({ generationConfig: { responseFormat: { text: { mimeType: "APPLICATION_JSON", schema: { type: "object" } } } } });
  });
  it.each([
    [new Response("{", { status: 200 }), "malformed", 200],
    [new Response("external private error body", { status: 503 }), "provider_failed", 503],
    [new Response("external private error body", { status: 429 }), "rate_limited", 429],
    [Response.json({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "partial" }] } }] }), "truncated", 200],
    [Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "reasoning", thought: true }] } }] }), "malformed", 200],
    [Response.json({ candidates: [{ finishReason: "SAFETY", content: { parts: [{ text: "private partial" }] } }] }), "blocked", 200],
    [new Response("x".repeat(65537)), "response_too_large", 200],
  ])("rejects unsafe or unsuccessful native results %#", async (response, reason, status) => {
    const metadata: AiTransportMetadata[] = [];
    vi.stubGlobal("fetch", vi.fn(async () => response));
    expect(await withAiDeadline(1000, signal => provider().generate(request, { signal, onMetadata: value => metadata.push(value) }))).toEqual({ kind: "unavailable", reason });
    expect(metadata.at(-1)).toMatchObject({ httpStatus: status, latencyMs: expect.any(Number) });
    const serialized = JSON.stringify(metadata);
    for (const privateValue of ["private-key-marker", "private-case-marker", "private partial", "reasoning", "external private error body"]) expect(serialized).not.toContain(privateValue);
  });
  it("reports a network rejection as a transport failure with no provider body or exception", async () => {
    const metadata: AiTransportMetadata[] = [];
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("private-error-marker"); }));
    expect(await withAiDeadline(1000, signal => provider().generate(request, { signal, onMetadata: value => metadata.push(value) }))).toEqual({ kind: "unavailable", reason: "provider_failed" });
    expect(metadata.at(-1)).toMatchObject({ httpStatus: null, headersMs: null, firstByteMs: null });
    expect(JSON.stringify(metadata)).not.toContain("private-error-marker");
  });
  it("settles its deadline even if fetch ignores abort, then discards a late STOP response", async () => {
    vi.useFakeTimers();
    let release = (_response: Response) => {};
    const pending = new Promise<Response>(resolve => { release = resolve; });
    let dispatchedSignal: AbortSignal | null = null;
    vi.stubGlobal("fetch", vi.fn(async (_input: string, options: RequestInit) => { dispatchedSignal = options.signal ?? null; return await pending; }));
    const sending = withAiDeadline(1000, signal => provider().generate(request, { signal, onMetadata: () => {} }));
    const assertion = expect(sending).rejects.toBeInstanceOf(AiDeadlineError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(dispatchedSignal).toHaveProperty("aborted", true);
    release(Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Late private answer" }] } }] }));
    await Promise.resolve();
  });
  it("bounds a stalled body after HTTP 200 and retains the status for diagnostics", async () => {
    vi.useFakeTimers();
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode("{")); } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream)));
    const metadata: AiTransportMetadata[] = [];
    const sending = withAiDeadline(1000, signal => provider().generate(request, { signal, onMetadata: value => metadata.push(value) }));
    const assertion = expect(sending).rejects.toBeInstanceOf(AiDeadlineError);
    await vi.advanceTimersByTimeAsync(1000); await assertion;
    expect(metadata.at(-1)).toMatchObject({ httpStatus: 200, headersMs: 0, firstByteMs: 0 });
  });
  it("emits only structured fixed operation/status/timing metadata", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const diagnostic = { operation: "chat", phase: "provider", reason: "timeout", latencyMs: 60_000, transport: null } as const;
    logAiDiagnostic(diagnostic);
    expect(info).toHaveBeenCalledExactlyOnceWith("ai_provider_diagnostic", diagnostic);
    info.mockClear();
    const unexpected = { ...diagnostic, reason: "private-transcript-marker", transcript: "private-transcript-marker", transport: { httpStatus: 503, headersMs: 2, firstByteMs: null, latencyMs: 2, private: "private-marker" } };
    logAiDiagnostic(unexpected);
    expect(JSON.stringify(info.mock.calls)).not.toContain("private");
    expect(info).toHaveBeenCalledWith("ai_provider_diagnostic", { ...diagnostic, reason: "provider_failed", transport: { httpStatus: 503, headersMs: 2, firstByteMs: null, latencyMs: 2 } });
  });
});
