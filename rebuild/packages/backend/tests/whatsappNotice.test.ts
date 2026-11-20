import { convexTest } from "convex-test";
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { buildPdf, toPdfText } from "../convex/lib/noticePdf";
import { citedSections, isNoticeRequest } from "../convex/lib/notices";

const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

const WA = "919800000001";
const payload = (message: Record<string, unknown>) => ({ object: "whatsapp_business_account", entry: [{ changes: [{ value: { messages: [{ from: WA, ...message }] } }] }] });
const text = (id: string, body: string) => payload({ id, type: "text", text: { body } });
const button = (id: string, buttonId: string) => payload({ id, type: "interactive", interactive: { type: "list_reply", list_reply: { id: buttonId, title: "x" } } });

type Sent = { type: string; body: string; ids?: string[] };
function setup() {
  vi.useFakeTimers();
  vi.stubEnv("WHATSAPP_APP_SECRET", "app-secret");
  vi.stubEnv("WHATSAPP_TOKEN", "token-marker");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456");
  vi.stubEnv("GEMINI_API_KEY", "");
  const sent: Sent[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    if (String(url).startsWith("https://graph.facebook.com/")) {
      const b = JSON.parse(String(init.body));
      const action = b.interactive?.action;
      sent.push({ type: b.type, body: b.text?.body ?? b.interactive.body.text, ...(action ? { ids: action.sections ? action.sections[0].rows.map((r: { id: string }) => r.id) : action.buttons.map((x: { reply: { id: string } }) => x.reply.id) } : {}) });
      return new Response("{}", { status: 200 });
    }
    return new Response("{}", { status: 500 });
  }));
  const t = convexTest(schema, modules);
  const post = async (body: unknown) => {
    const raw = JSON.stringify(body);
    const signature = "sha256=" + createHmac("sha256", "app-secret").update(raw).digest("hex");
    await t.fetch("/whatsapp/webhook", { method: "POST", body: raw, headers: { "x-hub-signature-256": signature } });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  };
  const draft = async () => (await t.run(ctx => ctx.db.query("whatsappContacts").first()))?.draft;
  return { t, sent, post, draft };
}

const confirmed = { sender_name: "Asha Verma", sender_address: "12 MG Road, Pune", recipient_name: "R. Mehta", recipient_address: "4 FC Road, Pune", property_address: "12 MG Road, Pune", tenancy_period: "1 Jan 2025 to 31 Oct 2026", deposit_amount: "Rs. 50,000", facts: "Deposit not returned after vacating", demand: "Refund Rs. 50,000 within 15 days of receipt of this notice" };

describe("whatsapp draft notices", () => {
  it("offers notice types, starts a draft and cancels it", async () => {
    const { post, sent, draft } = setup();
    await post(button("m1", "lang_en"));
    await post(text("m2", "notice"));
    expect(sent[1]!.ids).toEqual(["notice_deposit", "notice_consumer", "notice_salary", "notice_money"]);
    await post(button("m3", "notice_deposit"));
    expect(sent[2]!.body).toContain("your name and address");
    expect(await draft()).toMatchObject({ kind: "deposit", status: "collecting" });
    await post(text("m4", "cancel"));
    expect(sent[3]!.body).toContain("cancelled");
    expect(await draft()).toBeUndefined();
  });

  it("answers safely when facts cannot be extracted, and ignores a premature Create", async () => {
    const { post, sent, draft } = setup();
    await post(button("m1", "lang_hi"));
    await post(button("m2", "notice_salary"));
    await post(text("m3", "मेरा नाम राम है"));
    expect(sent.at(-1)!.body).toContain("15100");
    await post(button("m4", "notice_create"));
    expect(sent.at(-1)!.ids).toContain("notice_salary"); // Not confirmed yet: menu again, nothing generated.
    expect(await draft()).toMatchObject({ status: "collecting" });
  });

  it("reopens a confirmed draft for retry when drafting fails", async () => {
    const { post, sent, t, draft } = setup();
    await post(button("m1", "lang_en"));
    await t.run(async ctx => { const row = (await ctx.db.query("whatsappContacts").first())!; await ctx.db.patch(row._id, { draft: { kind: "deposit", status: "confirming", fields: confirmed, revision: 3, startedAt: Date.now() } }); });
    await post(button("m2", "notice_create"));
    expect(sent[1]!.body).toContain("Preparing your draft notice");
    expect(sent.at(-2)!.body).toContain("15100");
    expect(sent.at(-1)!.ids).toEqual(["notice_create", "notice_cancel"]);
    expect(await draft()).toMatchObject({ status: "confirming", fields: confirmed });
  });

  it("clears an unfinished draft when the user opens the menu", async () => {
    const { post, draft } = setup();
    await post(button("m1", "lang_en"));
    await post(button("m2", "notice_money"));
    await post(text("m3", "menu"));
    expect(await draft()).toBeUndefined();
  });

  it("recognises notice requests and cited sections", () => {
    expect(isNoticeRequest("Notice")).toBe(true);
    expect(isNoticeRequest("I need a legal notice")).toBe(true);
    expect(isNoticeRequest("नोटिस")).toBe(true);
    expect(isNoticeRequest("I got a notice from my landlord about rent")).toBe(false);
    expect([...citedSections("under section 2(10), s. 138 and u/s 73 for Rs. 500")]).toEqual(["2", "138", "73"]);
  });
});

describe("notice pdf", () => {
  it("writes a valid multi-page ASCII PDF with the draft banner", () => {
    const line = "Payment of ₹50,000 (fifty thousand) is due \\ (with interest) — “now”. ".repeat(3);
    const bytes = buildPdf([{ text: "LEGAL NOTICE", font: "B", size: 15, align: "center" }, ...Array.from({ length: 40 }, (_, i) => ({ text: `${i + 1}. ${line}` }))], { title: "Draft", banner: "DRAFT - REVIEW BEFORE SENDING", footer: "Legal-Setu" });
    const pdf = new TextDecoder().decode(bytes);
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf).toContain("(DRAFT - REVIEW BEFORE SENDING)");
    expect(pdf).toContain("Rs. 50,000 \\(fifty thousand\\) is due \\\\ \\(with");
    expect(Number(/\/Count (\d+)/u.exec(pdf)![1])).toBeGreaterThan(1);
    // Every xref offset must point at the start of its object.
    const xref = Number(/startxref\n(\d+)/u.exec(pdf)![1]);
    const offsets = pdf.slice(xref).split("\n").filter(l => / 00000 n $/u.test(l)).map(l => Number(l.slice(0, 10)));
    expect(offsets.length).toBeGreaterThan(5);
    offsets.forEach((offset, i) => expect(pdf.startsWith(`${i + 1} 0 obj`, offset)).toBe(true));
    expect(/[^\n\x20-\x7e]/u.test(pdf)).toBe(false);
  });

  it("drops characters the standard fonts cannot show", () => {
    expect(toPdfText("Café — राम ₹10")).toBe("Cafe -  Rs. 10");
  });
});
