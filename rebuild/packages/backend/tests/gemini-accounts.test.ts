import type { FunctionArgs } from "convex/server";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { geminiConfigs, geminiKeys } from "../convex/lib/provider";
import { aiRoutes, generateWithQuotaFallback } from "../convex/lib/aiRouting";
import type { AiRequest } from "../convex/lib/ai";

const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const reply = (text: string) => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }] });
const request: AiRequest = { systemInstruction: "Synthetic", messages: [{ role: "user", parts: [{ kind: "text", text: "hi" }] }], maxOutputTokens: 10, maxReplyChars: 100, output: { kind: "text" } };
type Call = { model: string; key: string };
function stubGemini(handler: (call: Call) => Response) {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const call = { model: /models\/([^:]+):/u.exec(String(url))?.[1] ?? "", key: new Headers(init?.headers).get("x-goog-api-key") ?? "" };
    calls.push(call);
    return handler(call);
  }));
  return calls;
}
const ENV = { GEMINI_API_KEY: "key-a", GEMINI_API_KEYS: "key-b, key-c,key-a", GEMINI_MODEL: "gemini-lite-1", GEMINI_FALLBACK_MODELS: "gemini-lite-2" };

describe("several Gemini accounts and models", () => {
  it("lists every key once and every model on every key, starting at a rotating account", () => {
    expect(geminiKeys(ENV)).toEqual(["key-a", "key-b", "key-c"]);
    const routes = geminiConfigs(ENV, () => 0.5);
    if (!Array.isArray(routes)) throw new Error("expected routes");
    expect(routes.map(route => `${route.model}/${route.apiKey}`)).toEqual([
      "gemini-lite-1/key-b", "gemini-lite-1/key-c", "gemini-lite-1/key-a",
      "gemini-lite-2/key-b", "gemini-lite-2/key-c", "gemini-lite-2/key-a",
    ]);
    // Without extra settings it is exactly the old single route.
    const single = geminiConfigs({ GEMINI_API_KEY: "only" });
    expect(Array.isArray(single) && single.map(route => route.model)).toEqual(["gemini-3.6-flash"]);
  });
  it("with GEMINI_KEY_ORDER=in_order, always tries the main key first and the others only as backups", () => {
    for (const roll of [0, 0.5, 0.99]) {
      const routes = geminiConfigs({ ...ENV, GEMINI_KEY_ORDER: "in_order" }, () => roll);
      if (!Array.isArray(routes)) throw new Error("expected routes");
      expect(routes.map(route => `${route.model}/${route.apiKey}`)).toEqual([
        "gemini-lite-1/key-a", "gemini-lite-1/key-b", "gemini-lite-1/key-c",
        "gemini-lite-2/key-a", "gemini-lite-2/key-b", "gemini-lite-2/key-c",
      ]);
    }
    expect(geminiConfigs({ ...ENV, GEMINI_KEY_ORDER: "backwards" })).toEqual({ kind: "unavailable", reason: "invalid_config" });
  });
  it("fails closed on a bad extra key or model", () => {
    expect(geminiConfigs({ ...ENV, GEMINI_API_KEYS: "good,bad key" })).toEqual({ kind: "unavailable", reason: "invalid_config" });
    expect(geminiConfigs({ ...ENV, GEMINI_FALLBACK_MODELS: "../evil" })).toEqual({ kind: "unavailable", reason: "invalid_config" });
    expect(aiRoutes({ ...ENV, GEMINI_ATTEMPT_TIMEOUT_MS: "5" }, false)).toEqual({ kind: "unavailable", reason: "invalid_config" });
  });
  it("moves to the next account when one is out of quota", async () => {
    const calls = stubGemini(call => call.key === "key-a" ? new Response(null, { status: 429 }) : reply("from " + call.key));
    const routes = aiRoutes({ ...ENV, GEMINI_API_KEYS: "key-b" }, false);
    if (routes.kind !== "configured") throw new Error("expected routes");
    const result = await generateWithQuotaFallback(routes.providers, request, { signal: new AbortController().signal, onMetadata: () => {} }, async () => {});
    expect(result.result).toEqual({ kind: "reply", text: `from key-b` });
    expect(calls.at(-1)).toEqual({ model: "gemini-lite-1", key: "key-b" });
  });
  it("skips an overloaded model on the other accounts and uses the fallback model", async () => {
    const calls = stubGemini(call => call.model === "gemini-lite-1" ? new Response(null, { status: 503 }) : reply("fallback answer"));
    const routes = aiRoutes(ENV, false);
    if (routes.kind !== "configured") throw new Error("expected routes");
    const result = await generateWithQuotaFallback(routes.providers, request, { signal: new AbortController().signal, onMetadata: () => {} }, async () => {});
    expect(result.result).toEqual({ kind: "reply", text: "fallback answer" });
    expect(result.provider.model).toBe("gemini-lite-2");
    // One 503 for the busy model, not one per account.
    expect(calls.map(call => call.model)).toEqual(["gemini-lite-1", "gemini-lite-2"]);
  });
  it("gives up after a slow attempt only when no route is left", async () => {
    stubGemini(() => new Response(null, { status: 500 }));
    const routes = aiRoutes({ GEMINI_API_KEY: "key-a", GEMINI_API_KEYS: "key-b", GEMINI_MODEL: "gemini-lite-1" }, false);
    if (routes.kind !== "configured") throw new Error("expected routes");
    const result = await generateWithQuotaFallback(routes.providers, request, { signal: new AbortController().signal, onMetadata: () => {} }, async () => {});
    expect(result.result).toEqual({ kind: "unavailable", reason: "provider_failed" });
  });
  it("case chat retries on another account and records each attempt", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity({ subject: "accounts-owner" });
    await user.mutation(api.accounts.ensure, { displayName: "Synthetic owner", role: "user", locale: "en" });
    const caseId = await user.mutation(api.cases.create, { title: "Synthetic case", text: "Synthetic facts for account rotation.", context: [], locale: "en" });
    vi.stubEnv("GEMINI_API_KEY", "key-a");
    vi.stubEnv("GEMINI_API_KEYS", "key-b");
    vi.stubEnv("GEMINI_MODEL", "gemini-lite-1");
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "gemini-lite-2");
    const calls = stubGemini(call => call.model === "gemini-lite-1" ? new Response(null, { status: 503 }) : call.key === "key-a" ? new Response(null, { status: 429 }) : reply("Answer from the backup account"));
    const contextKey = (await user.query(api.chat.listMine, { caseId })).contextKey;
    const args = { caseId, contextKey, message: "Synthetic question", documentIds: [], consent: true, requestId: "rotate-1" } satisfies FunctionArgs<typeof api.chat.send>;
    expect(await user.action(api.chat.send, args)).toEqual({ kind: "available" });
    expect((await user.query(api.chat.listMine, { caseId })).turns[0]?.result).toEqual({ kind: "reply", text: "Answer from the backup account" });
    expect(calls.at(-1)).toEqual({ model: "gemini-lite-2", key: "key-b" });
    const audits = await t.run(ctx => ctx.db.query("chatConsents").collect());
    expect(audits.length).toBe(calls.length);
    expect(new Set(audits.map(row => row.recipientOrigin))).toEqual(new Set(["https://generativelanguage.googleapis.com"]));
    // A replayed request still never dispatches twice.
    expect(await user.action(api.chat.send, args)).toEqual({ kind: "available" });
    expect(await t.run(ctx => ctx.db.query("chatConsents").collect())).toHaveLength(audits.length);
  });
  it("voice uses Gemini only with AI_PROVIDER=gemini, never the DGX server", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("GEMINI_API_KEY", "key-a");
    vi.stubEnv("GEMINI_MODEL", "gemini-lite-1");
    vi.stubEnv("DGX_API_KEY", "dgx_test_only");
    vi.stubEnv("AI_PROVIDER", "gemini");
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      urls.push(String(url));
      return reply(JSON.stringify({ transcript: "", reply: "यह कब हुआ?", domain: "property", urgency: "high", city: "", summary: "", suggestLawyer: false, lawQuery: "" }));
    }));
    const result = await t.action(api.voice.send, { guestToken: "guest-token-eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", locale: "hi", requestId: "gemini-only-1", consent: true, input: { kind: "text", text: "मकान मालिक ने मुझे घर से निकाल दिया" } });
    expect(result.kind).toBe("available");
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every(url => url.startsWith("https://generativelanguage.googleapis.com/"))).toBe(true);
  });
});
