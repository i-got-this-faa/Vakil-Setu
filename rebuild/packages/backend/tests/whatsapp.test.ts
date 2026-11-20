import { convexTest } from "convex-test";
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { isEmergency, parseWebhook } from "../convex/lib/whatsapp";

const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

const WA = "919800000001";
const payload = (message: Record<string, unknown>) => ({ object: "whatsapp_business_account", entry: [{ changes: [{ value: { messages: [{ from: WA, ...message }] } }] }] });
const text = (id: string, body: string) => payload({ id, type: "text", text: { body } });
const button = (id: string, buttonId: string) => payload({ id, type: "interactive", interactive: { type: "list_reply", list_reply: { id: buttonId, title: "x" } } });

function setup() {
  vi.useFakeTimers();
  vi.stubEnv("WHATSAPP_APP_SECRET", "app-secret");
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "verify-me");
  vi.stubEnv("WHATSAPP_TOKEN", "token-marker");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456");
  vi.stubEnv("GEMINI_API_KEY", "");
  const sent: { to: string; type: string; body: string; rows?: string[] }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    if (String(url).startsWith("https://graph.facebook.com/")) {
      const b = JSON.parse(String(init.body));
      sent.push({ to: b.to, type: b.type, body: b.text?.body ?? b.interactive.body.text, ...(b.interactive ? { rows: (b.interactive.action.sections?.[0].rows ?? b.interactive.action.buttons.map((x: { reply: { id: string } }) => x.reply)).map((r: { id: string }) => r.id) } : {}) });
      return new Response("{}", { status: 200 });
    }
    return new Response("{}", { status: 500 });
  }));
  const t = convexTest(schema, modules);
  const post = async (body: unknown, secret = "app-secret") => {
    const raw = JSON.stringify(body);
    const signature = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
    const response = await t.fetch("/whatsapp/webhook", { method: "POST", body: raw, headers: { "x-hub-signature-256": signature } });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    return response;
  };
  return { t, sent, post };
}

describe("whatsapp webhook", () => {
  it("answers the verification challenge only with the right token", async () => {
    const { t } = setup();
    const ok = await t.fetch("/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42", { method: "GET" });
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("42");
    expect((await t.fetch("/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42", { method: "GET" })).status).toBe(403);
  });

  it("rejects unsigned or wrongly signed posts", async () => {
    const { t, post, sent } = setup();
    expect((await t.fetch("/whatsapp/webhook", { method: "POST", body: JSON.stringify(text("m1", "hi")) })).status).toBe(401);
    expect((await post(text("m1", "hi"), "other-secret")).status).toBe(401);
    expect(sent).toEqual([]);
  });

  it("onboards with a language list, records consent, and dedupes retries", async () => {
    const { post, sent, t } = setup();
    expect((await post(text("m1", "I need help with my landlord"))).status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: WA, type: "interactive" });
    expect(sent[0]!.rows).toHaveLength(10);
    expect(sent[0]!.rows).toContain("lang_ta");
    expect(sent[0]!.body).not.toContain("Gemini");
    await post(text("m1", "I need help with my landlord"));
    expect(sent).toHaveLength(1);
    await post(button("m2", "lang_en"));
    expect(sent[1]!.body).toContain("describe your legal problem");
    const row = await t.run(ctx => ctx.db.query("whatsappContacts").first());
    expect(row).toMatchObject({ waId: WA, locale: "en" });
    expect(row?.consentedAt).toBeTypeOf("number");
  });

  it("accepts any listed language and reopens the list on \"menu\"", async () => {
    const { post, sent, t } = setup();
    await post(button("m1", "lang_ta"));
    expect(sent[0]!.body).toContain("நன்றி");
    expect((await t.run(ctx => ctx.db.query("whatsappContacts").first()))?.locale).toBe("ta");
    await post(text("m2", "Menu"));
    expect(sent[1]!.type).toBe("interactive");
    await post(button("m3", "lang_xx"));
    expect(sent).toHaveLength(3);
    expect(sent[2]!.type).toBe("text"); // unknown option: plain "type your question" reply
  });

  it("sends emergency helplines before consent and without an AI call", async () => {
    const { post, sent } = setup();
    await post(text("m1", "my husband is beating me, domestic violence"));
    expect(sent[0]!.body).toContain("112");
    expect(sent[0]!.body).toContain("15100");
  });

  it("falls back to a safe message when AI is not configured", async () => {
    const { post, sent } = setup();
    await post(button("m1", "lang_hi"));
    await post(text("m2", "मकान मालिक डिपॉजिट नहीं लौटा रहा"));
    expect(sent.at(-1)!.body).toContain("15100");
  });
});

describe("whatsapp parsing", () => {
  it("ignores non-WhatsApp payloads and status-only updates", () => {
    expect(parseWebhook({ object: "page" })).toBeNull();
    expect(parseWebhook({ object: "whatsapp_business_account", entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toEqual([]);
    expect(parseWebhook(payload({ id: "m", type: "audio", audio: {} }))).toEqual([{ messageId: "m", waId: WA, kind: "unsupported" }]);
  });
  it("detects emergencies in English and Hindi", () => {
    expect(isEmergency("Police illegally detained my brother")).toBe(true);
    expect(isEmergency("मुझे जान से मारने की धमकी")).toBe(true);
    expect(isEmergency("landlord kept my deposit")).toBe(false);
  });
});
