import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALES } from "@vakil/domain";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

async function fixture(locale: (typeof LOCALES)[number]) {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject: "ai-capability-owner" });
  await user.mutation(api.accounts.ensure, { role: "user", displayName: "Synthetic owner", locale });
  const caseId = await user.mutation(api.cases.create, { title: "Synthetic intake", text: "Synthetic document preparation question.", locale, context: [] });
  vi.stubEnv("GEMINI_API_KEY", "secret-test-marker");
  vi.stubEnv("AI_CHAT_LOCALES", undefined);
  const contextKey = (await user.query(api.chat.listMine, { caseId })).contextKey;
  const chatArgs = { caseId, message: "What should I collect?", contextKey, requestId: "synthetic-request", documentIds: [], consent: true as const };
  const triageArgs = { caseId, expectedVersion: 0, expectedContextRevision: 0, consent: true } as const;
  return { t, user, caseId, chatArgs, triageArgs };
}

describe("server AI capability policy", () => {
  it("publishes only the exact public configuration contract, even without identity", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("GEMINI_API_KEY", "secret-test-marker");
    vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");
    vi.stubEnv("AI_CHAT_LOCALES", undefined);
    expect(await t.query(api.chat.capabilities, {})).toEqual({ configured: true, locales: ["en", "hi", "pa"], provider: "gemini_native", evidence: "observed_runtime_only_not_quality_validated" });
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await t.query(api.chat.capabilities, {})).toMatchObject({ configured: false, reason: "not_configured" });
    vi.stubEnv("GEMINI_API_KEY", "secret-test-marker");
    vi.stubEnv("GEMINI_MODEL", "../invalid");
    expect(await t.query(api.chat.capabilities, {})).toMatchObject({ configured: false, reason: "invalid_config" });
  });

  it.each(LOCALES.filter(locale => !["en", "hi", "pa"].includes(locale)))("blocks default %s chat and triage before consent audit or outbound request", async locale => {
    const f = await fixture(locale);
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await f.user.action(api.chat.send, f.chatArgs)).toEqual({ kind: "unavailable", reason: "unsupported_language" });
    expect(await f.user.action(api.triage.analyze, f.triageArgs)).toEqual({ kind: "unavailable", reason: "unsupported_language" });
    expect((await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0]?.result).toEqual({ kind: "unavailable", reason: "unsupported_language" });
    expect(fetch).not.toHaveBeenCalled();
    expect(await f.t.run(ctx => ctx.db.query("chatConsents").collect())).toEqual([]);
    expect(await f.t.run(ctx => ctx.db.query("aiConsents").collect())).toEqual([]);
  });

  it.each(LOCALES)("permits explicitly configured %s at both actual action boundaries", async locale => {
    const f = await fixture(locale);
    vi.stubEnv("AI_CHAT_LOCALES", locale);
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(String(init?.body)).toContain(locale);
      return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: String(init?.body).includes("APPLICATION_JSON") ? JSON.stringify({ locale, domain: "unknown", urgency: "unknown", summary: "Synthetic-only draft.", actions: [] }) : "Synthetic-only reply." }] } }] });
    });
    vi.stubGlobal("fetch", fetch);
    expect(await f.user.action(api.chat.send, f.chatArgs)).toEqual({ kind: "available" });
    expect(await f.user.action(api.triage.analyze, f.triageArgs)).toMatchObject({ kind: "available" });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await f.user.query(api.chat.capabilities, {})).toMatchObject({ locales: [locale], evidence: "operator_allowlist_not_quality_validated" });
  });

  it.each(["", "en,typo", "*"])("fails closed for a disabling or invalid locale configuration '%s'", async setting => {
    const f = await fixture("en");
    vi.stubEnv("AI_CHAT_LOCALES", setting);
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await f.user.query(api.chat.capabilities, {})).locales).toEqual([]);
    expect(await f.user.action(api.chat.send, f.chatArgs)).toEqual({ kind: "unavailable", reason: "unsupported_language" });
    expect(await f.user.action(api.triage.analyze, f.triageArgs)).toEqual({ kind: "unavailable", reason: "unsupported_language" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps unsupported-language failures consistent even when the provider is unconfigured", async () => {
    const f = await fixture("ta");
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await f.user.action(api.chat.send, f.chatArgs)).toEqual({ kind: "unavailable", reason: "unsupported_language" });
    expect(await f.user.action(api.triage.analyze, f.triageArgs)).toEqual({ kind: "unavailable", reason: "unsupported_language" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("discards completed chat and triage when the language permission is revoked during dispatch", async () => {
    const f = await fixture("en");
    vi.stubGlobal("fetch", vi.fn(async () => {
      vi.stubEnv("AI_CHAT_LOCALES", "hi");
      return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Synthetic-only reply." }] } }] });
    }));
    expect(await f.user.action(api.chat.send, f.chatArgs)).toEqual({ kind: "unavailable", reason: "unsupported_language" });
    vi.stubEnv("AI_CHAT_LOCALES", "en");
    vi.stubGlobal("fetch", vi.fn(async () => {
      vi.stubEnv("AI_CHAT_LOCALES", "hi");
      return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ locale: "en", domain: "unknown", urgency: "unknown", summary: "Synthetic-only draft.", actions: [] }) }] } }] });
    }));
    expect(await f.user.action(api.triage.analyze, f.triageArgs)).toEqual({ kind: "unavailable", reason: "unsupported_language" });
    expect((await f.user.query(api.cases.getMine, { caseId: f.caseId })).summaries).toEqual([]);
  });
});
