import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VOICE_LIMITS } from "@legal-setu/domain";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { EMPTY_PROFILE, parseGroundedResult, parseVoiceResult, voiceAllowedLanguages } from "../convex/lib/voice";

const modules = import.meta.glob("../convex/**/*.ts");
const GUEST = "guest-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_GUEST = "guest-token-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const audio = () => new Uint8Array([0xff, 0xf1, 0x50, 0x80, 1, 2, 3, 4]).buffer;
const answer = (overrides: Record<string, unknown> = {}) => ({
  transcript: "मकान मालिक ने मुझे घर से निकाल दिया", reply: "यह कब हुआ?", domain: "property", urgency: "high",
  city: "Ludhiana", summary: "मकान मालिक ने किरायेदार को घर से निकाला।", suggestLawyer: false, ...overrides,
});
const gemini = (body: unknown) => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(body) }] } }] }));

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

function setup() {
  const t = convexTest(schema, modules);
  vi.stubEnv("GEMINI_API_KEY", "test-only-noncredential");
  vi.stubEnv("GEMINI_MODEL", "gemini-test-model");
  const fetchMock = vi.fn(async () => gemini(answer()));
  vi.stubGlobal("fetch", fetchMock);
  return { t, fetchMock };
}
let request = 0;
const guestTurn = (conversationId?: Id<"conversations">, token = GUEST) => ({
  ...(conversationId ? { conversationId } : {}), guestToken: token, locale: "hi" as const, requestId: `r-${++request}`,
  input: { kind: "audio" as const, mimeType: "audio/aac" as const, data: audio() }, consent: true as const,
});

describe("voice conversation", () => {
  it("lets a guest talk by voice: audio goes to Gemini, transcript and reply are stored, the problem profile updates", async () => {
    const { t, fetchMock } = setup();
    const result = await t.action(api.voice.send, guestTurn());
    expect(result.kind).toBe("available");
    if (result.kind !== "available") return;
    const conversationId = result.conversationId as Id<"conversations">;
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.contents.at(-1).parts[1].inlineData).toEqual({ mimeType: "audio/aac", data: Buffer.from(audio()).toString("base64") });
    expect(body.systemInstruction.parts[0].text).toContain("Hindi");
    const view = await t.query(api.conversations.get, { conversationId, guestToken: GUEST });
    expect(view?.turns).toHaveLength(1);
    expect(view?.turns[0]).toMatchObject({ transcript: answer().transcript, reply: { kind: "reply", text: "यह कब हुआ?" } });
    expect(view?.profile).toMatchObject({ domain: "property", urgency: "high", city: "Ludhiana" });
    expect(view?.guestTurnsLeft).toBe(VOICE_LIMITS.guestTurns - 1);
    const turn = await t.run(async ctx => await ctx.db.query("conversationTurns").first());
    expect(turn?.dispatch).toMatchObject({ model: "gemini-test-model", recipientOrigin: "https://generativelanguage.googleapis.com" });
    expect(await t.run(async ctx => (await ctx.db.query("guestSessions").first())?.tokenHash)).not.toContain("guest-token");
  });

  it("keeps the conversation going with history, and replays a repeated request without a second AI call", async () => {
    const { t, fetchMock } = setup();
    const first = await t.action(api.voice.send, guestTurn());
    if (first.kind !== "available") throw new Error("expected reply");
    const conversationId = first.conversationId as Id<"conversations">;
    fetchMock.mockImplementation(async () => gemini(answer({ transcript: "पिछले हफ्ते", reply: "क्या आपके पास किराए का कोई कागज़ है?", city: "", domain: "unknown" })));
    const second = guestTurn(conversationId);
    await t.action(api.voice.send, second);
    const body = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(body.contents).toHaveLength(3);
    expect(body.contents[0].parts[0].text).toBe(answer().transcript);
    const view = await t.query(api.conversations.get, { conversationId, guestToken: GUEST });
    expect(view?.profile).toMatchObject({ domain: "property", city: "Ludhiana" });
    expect(await t.action(api.voice.send, second)).toMatchObject({ kind: "available" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops guests after the free turns, without charging failed answers", async () => {
    const { t, fetchMock } = setup();
    fetchMock.mockImplementationOnce(async () => new Response("{}", { status: 500 }));
    const failed = await t.action(api.voice.send, guestTurn());
    expect(failed).toMatchObject({ kind: "unavailable", reason: "provider_failed" });
    const conversationId = failed.conversationId as Id<"conversations">;
    for (let i = 0; i < VOICE_LIMITS.guestTurns; i++) expect((await t.action(api.voice.send, guestTurn(conversationId))).kind).toBe("available");
    expect(await t.action(api.voice.send, guestTurn(conversationId))).toMatchObject({ kind: "unavailable", reason: "guest_limit" });
    expect((await t.query(api.conversations.get, { conversationId, guestToken: GUEST }))?.guestTurnsLeft).toBe(0);
  });

  it("keeps conversations private to their owner", async () => {
    const { t } = setup();
    const result = await t.action(api.voice.send, guestTurn());
    const conversationId = result.conversationId as Id<"conversations">;
    expect(await t.query(api.conversations.get, { conversationId, guestToken: OTHER_GUEST })).toBeNull();
    expect(await t.query(api.conversations.get, { conversationId })).toBeNull();
    await expect(t.action(api.voice.send, guestTurn(conversationId, OTHER_GUEST))).rejects.toThrow(/not found/i);
    const stranger = t.withIdentity({ subject: "stranger" });
    await stranger.mutation(api.accounts.ensure, { role: "user", displayName: "Stranger", locale: "en" });
    expect(await stranger.query(api.conversations.get, { conversationId })).toBeNull();
    await expect(stranger.mutation(api.conversations.prepareCase, { conversationId })).rejects.toThrow(/not found/i);
  });

  it("moves a guest conversation to the account after sign-in and retires the guest token", async () => {
    const { t } = setup();
    const result = await t.action(api.voice.send, guestTurn());
    const conversationId = result.conversationId as Id<"conversations">;
    const user = t.withIdentity({ subject: "phone-user" });
    await user.mutation(api.accounts.ensure, { role: "user", displayName: "Asha", locale: "hi" });
    expect(await user.mutation(api.conversations.claimGuest, { guestToken: GUEST })).toEqual({ claimed: 1 });
    expect(await t.query(api.conversations.get, { conversationId, guestToken: GUEST })).toBeNull();
    await expect(t.action(api.voice.send, guestTurn(conversationId))).rejects.toThrow(/sign in/i);
    const mine = await user.query(api.conversations.get, { conversationId });
    expect(mine).toMatchObject({ isGuest: false, guestTurnsLeft: null });
    expect(await user.query(api.conversations.latest, {})).toMatchObject({ _id: conversationId });
    // Signed-in people keep talking past the guest limit.
    expect((await user.action(api.voice.send, { conversationId, locale: "hi", requestId: "signed-in-1", input: { kind: "text", text: "मेरे पास किराया रसीद है" }, consent: true })).kind).toBe("available");
    const other = t.withIdentity({ subject: "someone-else" });
    await other.mutation(api.accounts.ensure, { role: "user", displayName: "Other", locale: "en" });
    await expect(other.mutation(api.conversations.claimGuest, { guestToken: GUEST })).rejects.toThrow(/another account/i);
  });

  it("turns the conversation into a case with a summary for booking, versioning it only when the talk changed", async () => {
    const { t } = setup();
    const user = t.withIdentity({ subject: "booker" });
    await user.mutation(api.accounts.ensure, { role: "user", displayName: "Ravi", locale: "hi" });
    const first = await user.action(api.voice.send, { locale: "hi", requestId: "b-1", input: { kind: "text", text: "मकान मालिक ने निकाल दिया" }, consent: true });
    const conversationId = first.conversationId as Id<"conversations">;
    const prepared = await user.mutation(api.conversations.prepareCase, { conversationId });
    expect(prepared.summaryVersion).toBe(1);
    expect(prepared.summary).toMatchObject({ locale: "hi", domain: "property", text: answer().summary });
    const legalCase = await user.query(api.cases.getMine, { caseId: prepared.caseId });
    expect(legalCase).toBeTruthy();
    expect(await user.mutation(api.conversations.prepareCase, { conversationId })).toMatchObject({ caseId: prepared.caseId, summaryVersion: 1 });
    await user.action(api.voice.send, { conversationId, locale: "hi", requestId: "b-2", input: { kind: "text", text: "कल हुआ" }, consent: true });
    expect(await user.mutation(api.conversations.prepareCase, { conversationId })).toMatchObject({ caseId: prepared.caseId, summaryVersion: 2 });
  });

  it("refuses booking preparation before anything was said, and respects the operator language list", async () => {
    const { t } = setup();
    const user = t.withIdentity({ subject: "quiet" });
    await user.mutation(api.accounts.ensure, { role: "user", displayName: "Quiet", locale: "hi" });
    const conversationId = await user.mutation(api.conversations.startNew, { locale: "hi", consent: true });
    await expect(user.mutation(api.conversations.prepareCase, { conversationId })).rejects.toThrow(/tell us/i);
    vi.stubEnv("AI_VOICE_LOCALES", "en,hi");
    expect(await t.action(api.voice.send, { ...guestTurn(), locale: "ta" })).toMatchObject({ kind: "unavailable", reason: "unsupported_language" });
    expect((await t.query(api.conversations.capabilities, {})).locales).toEqual(["hi", "en"]);
  });

  it("rejects oversized audio before reserving anything", async () => {
    const { t, fetchMock } = setup();
    const big = new Uint8Array(VOICE_LIMITS.audioBytes + 1).buffer;
    expect(await t.action(api.voice.send, { ...guestTurn(), input: { kind: "audio", mimeType: "audio/aac", data: big } })).toEqual({ kind: "unavailable", reason: "audio_too_large" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await t.run(async ctx => await ctx.db.query("guestSessions").first())).toBeNull();
  });

  it("stores a polite failure instead of a broken reply when the model output is malformed", async () => {
    const { t, fetchMock } = setup();
    fetchMock.mockImplementation(async () => gemini({ reply: "" }));
    const result = await t.action(api.voice.send, guestTurn());
    expect(result).toMatchObject({ kind: "unavailable", reason: "malformed" });
    const view = await t.query(api.conversations.get, { conversationId: result.conversationId as Id<"conversations">, guestToken: GUEST });
    expect(view?.turns[0]?.reply).toEqual({ kind: "unavailable", reason: "malformed" });
  });
});

describe("voice helpers", () => {
  it("parses strictly and keeps earlier facts when the model is unsure", () => {
    const previous = { ...EMPTY_PROFILE, domain: "family" as const, city: "Patna", summary: "Earlier facts." };
    expect(parseVoiceResult(answer({ domain: "unknown", city: "", summary: "", urgency: "bogus" }), previous)).toMatchObject({ profile: { domain: "family", city: "Patna", summary: "Earlier facts.", urgency: "unknown" } });
    expect(parseVoiceResult({ ...answer(), suggestLawyer: "yes" }, previous)).toBeNull();
    expect(parseVoiceResult(answer({ reply: "  " }), previous)).toBeNull();
    expect(parseVoiceResult(answer({ suggestLawyer: false }), { ...previous, suggestLawyer: true })?.profile.suggestLawyer).toBe(true);
    expect(parseVoiceResult(answer(), previous, "typed words")?.transcript).toBe("typed words");
  });

  it("looks up the law for a legal question and answers again from the excerpts, keeping the cited source", async () => {
    const { t, fetchMock } = setup();
    const dataset = "a".repeat(64);
    const source = { title: "Bharatiya Nyaya Sanhita, 2023", url: "https://www.ncrb.mha.gov.in/uploads/SankalanPortal/ChaptersBNS.html#318", documentType: "statute" as const, act: "BNS", sectionNumber: 318, sectionTitle: "Cheating" };
    await t.run(async ctx => {
      await ctx.db.insert("legalPassages", { dataset, passageId: "s318", text: "**318.** Whoever cheats shall be punished with imprisonment.", textHash: "b".repeat(64), searchText: "Cheating dishonestly inducing delivery of property punished", source });
      await ctx.db.insert("legalDatasets", { key: "current", dataset, count: 1 });
    });
    fetchMock
      .mockImplementationOnce(async () => gemini(answer({ reply: "पहला जवाब", lawQuery: "cheating dishonestly inducing delivery of property" })))
      .mockImplementationOnce(async () => gemini({ reply: "भारतीय न्याय संहिता की धारा 318 के अनुसार धोखा देना अपराध है।", usedSources: [1, 7] }));
    const result = await t.action(api.voice.send, guestTurn());
    if (result.kind !== "available") throw new Error("expected reply");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(second.systemInstruction.parts[0].text).toContain("BNS section 318 (Cheating)");
    expect(JSON.stringify(second.contents)).not.toContain("inlineData");
    const view = await t.query(api.conversations.get, { conversationId: result.conversationId as Id<"conversations">, guestToken: GUEST });
    expect(view?.turns[0]?.reply).toEqual({ kind: "reply", text: "भारतीय न्याय संहिता की धारा 318 के अनुसार धोखा देना अपराध है।", sources: [{ ...source, quote: "318. Whoever cheats shall be punished with imprisonment." }] });
  });

  it("skips the law lookup while still asking about the facts", async () => {
    const { t, fetchMock } = setup();
    fetchMock.mockImplementation(async () => gemini(answer({ lawQuery: "" })));
    const result = await t.action(api.voice.send, guestTurn());
    expect(result.kind).toBe("available");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("only keeps citations that point at a real excerpt", () => {
    const passages = [{ text: "x", source: { title: "T", url: "https://www.ncrb.mha.gov.in/a", documentType: "statute" as const } }];
    expect(parseGroundedResult({ reply: "ok", usedSources: [0, 1, 1, 2, 1.5] }, passages)?.sources).toHaveLength(1);
    expect(parseGroundedResult({ reply: "", usedSources: [] }, passages)).toBeNull();
    const section = { title: "BNS", url: "https://www.ncrb.mha.gov.in/b#318", documentType: "statute" as const, act: "BNS", sectionNumber: 318, sectionTitle: "Cheating. (Change)" };
    const twice = parseGroundedResult({ reply: "ok", usedSources: [1, 2] }, [{ text: "a", source: section }, { text: "b", source: section }]);
    expect(twice?.sources.map(source => source.sectionTitle)).toEqual(["Cheating"]);
    expect(parseGroundedResult({ reply: "ok" }, passages)).toBeNull();
  });

  it("reads a shared document: stores it with the turn, sends it to Gemini, and shows its name back", async () => {
    const { t, fetchMock } = setup();
    fetchMock.mockImplementation(async () => gemini(answer({ transcript: "अदालत का नोटिस, 12 मार्च की सुनवाई", reply: "यह अदालत का नोटिस है। आपको 12 मार्च को अदालत जाना है।", lawQuery: "" })));
    const pdf = new TextEncoder().encode("%PDF-1.4 test").buffer;
    const result = await t.action(api.voice.send, { guestToken: GUEST, locale: "hi", requestId: "doc-1", consent: true, input: { kind: "document", mimeType: "application/pdf", data: pdf, fileName: "notice.pdf" } });
    if (result.kind !== "available") throw new Error("expected reply");
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.contents.at(-1).parts[1].inlineData).toEqual({ mimeType: "application/pdf", data: Buffer.from(pdf).toString("base64") });
    expect(body.contents.at(-1).parts[0].text).toContain("notice.pdf");
    const view = await t.query(api.conversations.get, { conversationId: result.conversationId as Id<"conversations">, guestToken: GUEST });
    expect(view?.turns[0]).toMatchObject({ inputKind: "document", attachment: { fileName: "notice.pdf", contentType: "application/pdf" }, transcript: "अदालत का नोटिस, 12 मार्च की सुनवाई" });
    expect(JSON.stringify(view)).not.toContain("storageId");
    const stored = await t.run(async ctx => (await ctx.db.query("conversationTurns").first())?.attachment);
    expect(await t.run(async ctx => (await ctx.storage.get(stored!.storageId)) !== null)).toBe(true);
  });

  it("rejects a file that is not really the declared document type, without storing it", async () => {
    const { t, fetchMock } = setup();
    const result = await t.action(api.voice.send, { guestToken: GUEST, locale: "hi", requestId: "doc-2", consent: true, input: { kind: "document", mimeType: "image/png", data: new TextEncoder().encode("not a png").buffer, fileName: "x.png" } });
    expect(result).toEqual({ kind: "unavailable", reason: "document_invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await t.run(async ctx => await ctx.db.query("conversationTurns").first())).toBeNull();
  });

  it("answers Dogri speakers: Gemini replies in Hindi, Bhashini turns the reply into Dogri", async () => {
    const { t, fetchMock } = setup();
    vi.stubEnv("BHASHINI_API_KEY", "test-key");
    fetchMock.mockImplementation((async (...call: unknown[]) => String(call[0]).includes("bhashini")
      ? new Response(JSON.stringify({ pipelineResponse: [{ taskType: "translation", output: [{ source: "यह कब हुआ?", target: "एह् कदूं होआ?" }] }] }))
      : gemini(answer({ lawQuery: "" }))) as never);
    const result = await t.action(api.voice.send, { ...guestTurn(), locale: "doi" });
    if (result.kind !== "available") throw new Error("expected reply");
    const geminiBody = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(geminiBody.systemInstruction.parts[0].text).toContain("Hindi");
    const translation = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(translation.pipelineTasks[0].config.language).toEqual({ sourceLanguage: "hi", targetLanguage: "doi" });
    const view = await t.query(api.conversations.get, { conversationId: result.conversationId as Id<"conversations">, guestToken: GUEST });
    expect(view?.turns[0]?.reply).toEqual({ kind: "reply", text: "एह् कदूं होआ?" });
  });

  it("fails closed on unknown operator language codes", () => {
    expect(voiceAllowedLanguages({})).toHaveLength(13);
    expect(voiceAllowedLanguages({ AI_VOICE_LOCALES: "hi,xx" })).toEqual([]);
    expect(voiceAllowedLanguages({ AI_VOICE_LOCALES: "ta, hi" })).toEqual(["hi", "ta"]);
  });
});
