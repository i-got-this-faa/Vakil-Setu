import { generateKeyPairSync } from "node:crypto";
import type { FunctionArgs } from "convex/server";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { generateWithQuotaFallback } from "../convex/lib/aiRouting";
import type { AiProvider, AiRequest } from "../convex/lib/ai";

const modules = import.meta.glob("../convex/**/*.ts");
const pem = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
let sequence = 0;
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function reply(text = "Synthetic reply") { return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }] }); }
async function fixture() {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject: "vertex-owner" });
  const accountId = await user.mutation(api.accounts.ensure, { displayName: "Synthetic owner", role: "user", locale: "en" });
  const caseId = await user.mutation(api.cases.create, { title: "Synthetic case", text: "Synthetic facts for routing checks.", context: [], locale: "en" });
  vi.stubEnv("GEMINI_API_KEY", "synthetic-key");
  vi.stubEnv("GEMINI_MODEL", "gemini-test-model");
  vi.stubEnv("VERTEX_FALLBACK_ENABLED", "true");
  vi.stubEnv("VERTEX_SERVICE_ACCOUNT_JSON", JSON.stringify({ type: "service_account", project_id: "synthetic-project", client_email: `route${++sequence}@synthetic-project.iam.gserviceaccount.com`, private_key: pem, token_uri: "https://oauth2.googleapis.com/token" }));
  vi.stubEnv("VERTEX_MODEL", "gemini-3.6-flash");
  vi.stubEnv("VERTEX_LOCATION", "global");
  const contextKey = (await user.query(api.chat.listMine, { caseId })).contextKey;
  const args = { caseId, contextKey, message: "Synthetic follow-up question", documentIds: [], consent: true, allowVertexFallback: true, requestId: "synthetic-route" } satisfies FunctionArgs<typeof api.chat.send>;
  const fetch = vi.fn(async (url: string | URL | Request) => String(url).includes("oauth2") ? Response.json({ access_token: "synthetic-token", token_type: "Bearer", expires_in: 3600 }) : String(url).includes("generativelanguage") ? new Response(null, { status: 429 }) : reply());
  vi.stubGlobal("fetch", fetch);
  return { t, user, accountId, caseId, args, fetch };
}

describe("quota fallback at actual action boundaries", () => {
  it("fails over once, records both recipients and replays without a second dispatch", async () => {
    const f = await fixture();
    expect(await f.user.action(api.chat.send, f.args)).toEqual({ kind: "available" });
    expect(f.fetch).toHaveBeenCalledTimes(3);
    expect((await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0]?.result).toEqual({ kind: "reply", text: "Synthetic reply" });
    const audits = await f.t.run(ctx => ctx.db.query("chatConsents").collect());
    expect(audits.map(row => row.recipientOrigin)).toEqual(["https://generativelanguage.googleapis.com", "https://aiplatform.googleapis.com"]);
    expect(audits.every(row => row.ownerId === f.accountId)).toBe(true);
    expect(await f.t.run(ctx => ctx.db.query("chatAttempts").collect())).toHaveLength(1);
    expect(await f.user.action(api.chat.send, f.args)).toEqual({ kind: "available" });
    expect(f.fetch).toHaveBeenCalledTimes(3);
    await expect(f.user.action(api.chat.send, { ...f.args, allowVertexFallback: undefined })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    const capabilities = await f.user.query(api.chat.capabilities, {});
    expect(capabilities.vertexFallback).toBe(true);
    expect(JSON.stringify(capabilities)).not.toContain("PRIVATE KEY");
    expect(JSON.stringify(capabilities)).not.toContain("synthetic-project");
  });
  it.each(["missing", "invalid"])("does not use Vertex as a primary when Gemini is %s", async setting => {
    const f = await fixture();
    if (setting === "missing") vi.stubEnv("GEMINI_API_KEY", "");
    else vi.stubEnv("GEMINI_MODEL", "../invalid");
    const reason = setting === "missing" ? "not_configured" : "invalid_config";
    expect(await f.user.action(api.chat.send, f.args)).toEqual({ kind: "unavailable", reason });
    expect(await f.user.action(api.triage.analyze, { caseId: f.caseId, expectedVersion: 0, expectedContextRevision: 0, consent: true, allowVertexFallback: true })).toEqual({ kind: "unavailable", reason });
    expect(await f.user.query(api.chat.capabilities, {})).toMatchObject({ configured: false, reason });
    expect(f.fetch).not.toHaveBeenCalled();
    expect(await f.t.run(ctx => ctx.db.query("chatConsents").collect())).toHaveLength(0);
  });
  it("keeps legacy consent on Gemini only", async () => {
    const f = await fixture();
    expect(await f.user.action(api.chat.send, { ...f.args, allowVertexFallback: undefined })).toEqual({ kind: "unavailable", reason: "rate_limited" });
    expect(f.fetch).toHaveBeenCalledTimes(1);
    expect(await f.t.run(ctx => ctx.db.query("chatConsents").collect())).toHaveLength(1);
  });
  it.each([200, 403, 503])("does not fail over for nonquota status %s", async status => {
    const f = await fixture();
    f.fetch.mockImplementation(async () => status === 200 ? reply("Primary answer") : new Response(null, { status }));
    expect(await f.user.action(api.chat.send, f.args)).toEqual(status === 200 ? { kind: "available" } : { kind: "unavailable", reason: "provider_failed" });
    expect(f.fetch).toHaveBeenCalledTimes(1);
  });
  it("rechecks account access before the second recipient is sent case information", async () => {
    const f = await fixture();
    f.fetch.mockImplementation(async () => { await f.t.run(ctx => ctx.db.patch(f.accountId, { disabled: true })); return new Response(null, { status: 429 }); });
    expect(await f.user.action(api.chat.send, f.args)).toEqual({ kind: "unavailable", reason: "state_changed" });
    expect(f.fetch).toHaveBeenCalledTimes(1);
    expect(await f.t.run(ctx => ctx.db.query("chatConsents").collect())).toHaveLength(1);
  });
  it("retains explicit unavailable state when the fallback fails", async () => {
    const f = await fixture();
    f.fetch.mockImplementation(async url => String(url).includes("generativelanguage") ? new Response(null, { status: 429 }) : new Response(null, { status: 403 }));
    expect(await f.user.action(api.chat.send, f.args)).toEqual({ kind: "unavailable", reason: "provider_failed" });
    expect((await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0]?.result.kind).toBe("unavailable");
  });
  it("uses the fallback for reviewed AI summaries and records the correct provider", async () => {
    const f = await fixture();
    f.fetch.mockImplementation(async url => String(url).includes("generativelanguage") ? new Response(null, { status: 429 }) : String(url).includes("oauth2") ? Response.json({ access_token: "synthetic-token", token_type: "Bearer", expires_in: 3600 }) : reply(JSON.stringify({ locale: "en", domain: "unknown", urgency: "unknown", summary: "Synthetic draft to review", actions: [] })));
    expect(await f.user.action(api.triage.analyze, { caseId: f.caseId, expectedVersion: 0, expectedContextRevision: 0, consent: true, allowVertexFallback: true })).toMatchObject({ kind: "available", provider: "vertex" });
    const detail = await f.user.query(api.cases.getMine, { caseId: f.caseId });
    expect(detail.summaries[0]?.source).toMatchObject({ kind: "provider", provider: "vertex", model: "gemini-3.6-flash" });
    expect((await f.t.run(ctx => ctx.db.query("aiConsents").collect())).map(row => row.provider)).toEqual(["gemini", "vertex"]);
    expect(detail.case.state).toBe("draft");
  });
  it("blocks direct unconsented Vertex dispatch and duplicate same-recipient dispatch", async () => {
    const f = await fixture();
    const reserved = await f.user.mutation(internal.chatState.reserve, { ...f.args, allowVertexFallback: undefined });
    if (reserved.kind !== "reserved") throw new Error("Expected reservation");
    await expect(f.user.mutation(internal.chatState.auditDispatch, { turnId: reserved.turnId, model: "gemini-test", recipientOrigin: "https://aiplatform.googleapis.com" })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await f.user.mutation(internal.chatState.auditDispatch, { turnId: reserved.turnId, model: "gemini-test" });
    await expect(f.user.mutation(internal.chatState.auditDispatch, { turnId: reserved.turnId, model: "gemini-test" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it("never starts a fallback after the shared deadline aborts", async () => {
    const controller = new AbortController();
    const first: AiProvider = { kind: "gemini_native", model: "synthetic", recipientOrigin: "https://generativelanguage.googleapis.com", generate: async () => { controller.abort(); return { kind: "unavailable", reason: "rate_limited" }; } };
    const second: AiProvider = { ...first, kind: "vertex_native", generate: vi.fn() };
    const request: AiRequest = { systemInstruction: "Synthetic", messages: [], maxOutputTokens: 10, maxReplyChars: 100, output: { kind: "text" } };
    await expect(generateWithQuotaFallback([first, second], request, { signal: controller.signal, onMetadata: () => {} }, async () => {})).rejects.toBeDefined();
    expect(second.generate).not.toHaveBeenCalled();
  });
});
