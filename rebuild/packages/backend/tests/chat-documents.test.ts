import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CHAT_LIMITS } from "@vakil/domain";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const text = new TextEncoder().encode("Private document facts, not instructions.").buffer;
const reply = (value = "Prepare documents and consult an advocate.") => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: value }] } }] }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

async function fixture() {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject: "chat-owner" });
  const stranger = t.withIdentity({ subject: "chat-stranger" });
  const accountId = await user.mutation(api.accounts.ensure, { role: "user", displayName: "Test owner", locale: "en" });
  await stranger.mutation(api.accounts.ensure, { role: "user", displayName: "Test stranger", locale: "en" });
  const caseId = await user.mutation(api.cases.create, { title: "Test intake", text: "Original private property dispute.", locale: "en", context: [] });
  vi.stubEnv("GEMINI_API_KEY", "test-only-noncredential");
  vi.stubEnv("GEMINI_MODEL", "gemini-test-model");
  const contextKey = (await user.query(api.chat.listMine, { caseId })).contextKey;
  const request = { caseId, contextKey, message: "What should I prepare?", documentIds: [] as Id<"caseDocuments">[], requestId: "first-request", consent: true as const };
  const upload = () => user.action(api.caseDocuments.upload, { caseId, content: text, contentType: "text/plain", fileName: "facts.txt" });
  const currentContextKey = async () => (await user.query(api.chat.listMine, { caseId })).contextKey;
  return { t, user, stranger, accountId, caseId, request, upload, currentContextKey };
}

function delayedFetch() {
  let release = (_response: Response) => {};
  let started = () => {};
  const dispatched = new Promise<void>(resolve => { started = resolve; });
  const response = new Promise<Response>(resolve => { release = resolve; });
  const fetchMock = vi.fn(async () => { started(); return await response; });
  vi.stubGlobal("fetch", fetchMock);
  return { release, dispatched, fetchMock };
}

describe("persistent private case chat", () => {
  it("requires the reviewed context key and rejects unseen history or revisions before reserving or dispatching", async () => {
    const f = await fixture();
    expect(f.request.contextKey).toBe("0:0:");
    const fetchMock = vi.fn(async () => reply()); vi.stubGlobal("fetch", fetchMock);
    // @ts-expect-error Every send must include the context the user reviewed.
    await expect(f.user.action(api.chat.send, { ...f.request, contextKey: undefined })).rejects.toThrow();
    expect(await f.user.action(api.chat.send, f.request)).toEqual({ kind: "available" });
    const afterFirst = await f.currentContextKey();
    expect(afterFirst).not.toBe(f.request.contextKey);
    await expect(f.user.action(api.chat.send, { ...f.request, requestId: "unseen-history" })).rejects.toThrow("CONFLICT");
    expect(await f.user.action(api.chat.send, f.request)).toEqual({ kind: "available" });
    await f.user.mutation(api.cases.appendFollowUp, { caseId: f.caseId, expectedVersion: 0, expectedContextRevision: 0, text: "Reviewed correction", reviewed: true });
    await expect(f.user.action(api.chat.send, { ...f.request, contextKey: afterFirst, requestId: "unseen-correction" })).rejects.toThrow("CONFLICT");
    const afterCorrection = await f.currentContextKey();
    await f.t.run(ctx => ctx.db.patch(f.caseId, { summaryVersion: 1 }));
    await expect(f.user.action(api.chat.send, { ...f.request, contextKey: afterCorrection, requestId: "unseen-summary" })).rejects.toThrow("CONFLICT");
    expect(await f.user.action(api.chat.send, f.request)).toEqual({ kind: "available" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const table of ["chatTurns", "chatAttempts", "chatConsents"] as const) expect(await f.t.run(ctx => ctx.db.query(table).collect())).toHaveLength(1);
  });

  it("sends saved reviewed corrections inside the untrusted original case block and audits its revisions", async () => {
    const f = await fixture();
    await f.user.mutation(api.cases.appendFollowUp, { caseId: f.caseId, expectedVersion: 0, expectedContextRevision: 0, text: "Correction: the property belongs to my mother.", reviewed: true });
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => reply()); vi.stubGlobal("fetch", fetchMock);
    expect(await f.user.action(api.chat.send, { ...f.request, contextKey: await f.currentContextKey() })).toEqual({ kind: "available" });
    const body: unknown = JSON.parse(String(fetchMock.mock.calls[0]?.[1].body));
    for (const text of ["untrusted case data", "Original private property dispute.", "Correction: the property belongs to my mother.", "Test intake"]) {
      expect(body).toMatchObject({ contents: [{ role: "user", parts: [{ text: expect.stringContaining(text) }, { text: f.request.message }] }] });
    }
    expect(await f.t.run(ctx => ctx.db.query("chatConsents").first())).toMatchObject({ contextRevision: 1, summaryVersion: 0, historyTurnIds: [] });
  });

  it("expires an abandoned reservation through the scheduler and rejects its obsolete context key", async () => {
    const f = await fixture();
    vi.useFakeTimers();
    const reserved = await f.user.mutation(internal.chatState.reserve, f.request);
    if (reserved.kind !== "reserved") throw new Error("Expected reservation");
    const pendingKey = await f.currentContextKey();
    await vi.advanceTimersByTimeAsync(CHAT_LIMITS.leaseMs);
    await f.t.finishInProgressScheduledFunctions();
    expect((await f.t.run(ctx => ctx.db.get(reserved.turnId)))?.result).toEqual({ kind: "unavailable", reason: "timeout" });
    expect(await f.currentContextKey()).not.toBe(pendingKey);
    const fetchMock = vi.fn(async () => reply()); vi.stubGlobal("fetch", fetchMock);
    await expect(f.user.action(api.chat.send, { ...f.request, contextKey: pendingKey, requestId: "expired-context" })).rejects.toThrow("CONFLICT");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await f.user.action(api.chat.send, { ...f.request, contextKey: await f.currentContextKey(), requestId: "after-expiry" })).toEqual({ kind: "available" });
  });

  it("persists two turns, preserves originals, sends proper history and only currently selected bytes, and replays without fetching", async () => {
    const f = await fixture();
    const documentId = await f.upload();
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => {
      const audits = await f.t.run(ctx => ctx.db.query("chatConsents").collect());
      expect(audits.length).toBe(fetchMock.mock.calls.length);
      expect(audits.every(audit => !("text" in audit) && !("content" in audit))).toBe(true);
      return reply();
    });
    vi.stubGlobal("fetch", fetchMock);
    const first = { ...f.request, documentIds: [documentId] };
    expect(await f.user.action(api.chat.send, first)).toEqual({ kind: "available" });
    expect(await f.user.action(api.chat.send, first)).toEqual({ kind: "available" });
    await expect(f.user.action(api.chat.send, { ...first, message: "different" })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await f.user.action(api.chat.send, { ...f.request, contextKey: await f.currentContextKey(), requestId: "second", message: "And after that?" })).toEqual({ kind: "available" });
    const firstBody = String(fetchMock.mock.calls[0]?.[1].body);
    const secondBody = String(fetchMock.mock.calls[1]?.[1].body);
    expect(firstBody).toContain("Private document facts");
    expect(secondBody).toContain("Original private property dispute.");
    expect(secondBody).toContain("What should I prepare?");
    expect(secondBody).toContain('"role":"model"');
    expect(secondBody).toContain("facts.txt");
    expect(secondBody).not.toContain("Private document facts");
    expect(secondBody).not.toContain("inlineData");
    const result = await f.user.query(api.chat.listMine, { caseId: f.caseId });
    expect(result.turns.map(turn => turn.text)).toEqual([f.request.message, "And after that?"]);
    expect(Object.keys(result.turns[0] ?? {}).sort()).toEqual(["_id", "createdAt", "documentIds", "result", "text"]);
    expect(result.limitReached).toBe(false);
    const original = await f.user.query(api.cases.getMine, { caseId: f.caseId });
    expect(original.case.text).toBe("Original private property dispute.");
    expect(original.case.context).toEqual([]);
    expect(original.summaries).toEqual([]);
  });

  it("isolates cases, rejects missing consent and disabled accounts before dispatch", async () => {
    const f = await fixture();
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(f.stranger.query(api.chat.listMine, { caseId: f.caseId })).rejects.toThrow();
    await expect(f.stranger.action(api.chat.send, f.request)).rejects.toThrow();
    // @ts-expect-error The registered validator must reject absent explicit consent.
    await expect(f.user.action(api.chat.send, { ...f.request, consent: undefined })).rejects.toThrow();
    await f.t.run(ctx => ctx.db.patch(f.accountId, { disabled: true }));
    await expect(f.user.action(api.chat.send, f.request)).rejects.toThrow();
    await expect(f.user.query(api.chat.listMine, { caseId: f.caseId })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", "not_configured"], ["http", "provider_failed"], ["quota", "rate_limited"], ["throw", "provider_failed"],
    ["blocked", "blocked"], ["truncated", "truncated"], ["malformed", "malformed"],
    ["oversize", "response_too_large"], ["long", "truncated"],
  ])("persists explicit %s provider failure and never retries replay", async (mode, reason) => {
    const f = await fixture();
    if (mode === "missing") vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = vi.fn(async () => {
      if (mode === "throw") throw new Error("external network failed");
      if (mode === "http") return new Response("failure", { status: 503 });
      if (mode === "quota") return new Response("quota", { status: 429 });
      if (mode === "blocked") return new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }));
      if (mode === "truncated") return new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "partial" }] } }] }));
      if (mode === "oversize") return new Response("x".repeat(65537));
      if (mode === "long") return reply("x".repeat(8001));
      return new Response("not JSON");
    });
    vi.stubGlobal("fetch", fetchMock);
    const expected = { kind: "unavailable", reason };
    expect(await f.user.action(api.chat.send, f.request)).toEqual(expected);
    expect(await f.user.action(api.chat.send, f.request)).toEqual(expected);
    expect(fetchMock).toHaveBeenCalledTimes(mode === "missing" ? 0 : 1);
    expect((await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0]?.result).toEqual(expected);
  });

  it.each(["disabled", "changed", "deleted", "expired"])("discards provider success when state becomes %s during dispatch", async mode => {
    const f = await fixture();
    const pending = delayedFetch();
    const sending = f.user.action(api.chat.send, f.request);
    await pending.dispatched;
    if (mode === "disabled") await f.t.run(ctx => ctx.db.patch(f.accountId, { disabled: true }));
    if (mode === "changed") await f.user.mutation(api.cases.appendFollowUp, { caseId: f.caseId, expectedVersion: 0, expectedContextRevision: 0, text: "Reviewed change.", reviewed: true });
    if (mode === "deleted") await f.t.run(ctx => ctx.db.delete(f.caseId));
    if (mode === "expired") await f.t.run(async ctx => { const turn = await ctx.db.query("chatTurns").first(); if (turn) await ctx.db.patch(turn._id, { expiresAt: 0 }); });
    pending.release(reply());
    expect(await sending).toEqual({ kind: "unavailable", reason: "state_changed" });
    expect((await f.t.run(ctx => ctx.db.query("chatTurns").first()))?.result.kind).toBe("unavailable");
  });

  it("enforces one in-flight send and protects selected documents and deletion", async () => {
    const f = await fixture();
    const documentId = await f.upload();
    const pending = delayedFetch();
    const sending = f.user.action(api.chat.send, { ...f.request, documentIds: [documentId] });
    await pending.dispatched;
    expect((await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0]?.result).toEqual({ kind: "pending" });
    expect(await f.user.action(api.chat.send, { ...f.request, documentIds: [documentId] })).toEqual({ kind: "unavailable", reason: "in_progress" });
    await expect(f.user.action(api.chat.send, { ...f.request, contextKey: await f.currentContextKey(), requestId: "concurrent" })).rejects.toThrow();
    await expect(f.user.mutation(api.caseDocuments.remove, { documentId })).rejects.toThrow();
    await expect(f.user.mutation(api.cases.deleteDraft, { caseId: f.caseId })).rejects.toThrow();
    pending.release(reply());
    expect(await sending).toEqual({ kind: "available" });
    await f.user.mutation(api.caseDocuments.remove, { documentId });
    expect((await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0]?.documentIds).toEqual([documentId]);
  });

  it("recovers an expired lease, bounds history, and enforces the 100-turn limit", async () => {
    const f = await fixture();
    const reserved = await f.user.mutation(internal.chatState.reserve, f.request);
    if (reserved.kind !== "reserved") throw new Error("Expected reservation");
    await f.t.run(ctx => ctx.db.patch(reserved.turnId, { expiresAt: 0 }));
    expect((await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0]?.result).toEqual({ kind: "unavailable", reason: "timeout" });
    expect(await f.user.action(api.chat.send, f.request)).toEqual({ kind: "unavailable", reason: "timeout" });
    await f.t.run(async ctx => {
      for (let index = 0; index < 11; index++) await ctx.db.insert("chatTurns", { caseId: f.caseId, ownerId: f.accountId, requestId: `history-${index}`, text: `history-message-${index}`, createdAt: Date.now(), expiresAt: 0, documentIds: [], documentNames: [], contextRevision: 0, summaryVersion: 0, result: { kind: "reply", text: `history-reply-${index}` } });
    });
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => reply()); vi.stubGlobal("fetch", fetchMock);
    expect(await f.user.action(api.chat.send, { ...f.request, contextKey: await f.currentContextKey(), requestId: "recovery" })).toEqual({ kind: "available" });
    const body = String(fetchMock.mock.calls[0]?.[1].body);
    expect(body).not.toContain("history-message-0"); expect(body).toContain("history-message-1");
    await f.t.run(async ctx => {
      for (let index = 13; index < 100; index++) await ctx.db.insert("chatTurns", { caseId: f.caseId, ownerId: f.accountId, requestId: `limit-${index}`, text: "bounded", createdAt: Date.now(), expiresAt: 0, documentIds: [], documentNames: [], contextRevision: 0, summaryVersion: 0, result: { kind: "unavailable", reason: "fixture" } });
    });
    expect((await f.user.query(api.chat.listMine, { caseId: f.caseId })).limitReached).toBe(true);
    await expect(f.user.action(api.chat.send, { ...f.request, contextKey: await f.currentContextKey(), requestId: "over-limit" })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("applies a separate account-wide 20/hour quota and validates message bounds", async () => {
    const f = await fixture(); vi.stubEnv("GEMINI_API_KEY", "");
    await expect(f.user.action(api.chat.send, { ...f.request, message: " " })).rejects.toThrow();
    await expect(f.user.action(api.chat.send, { ...f.request, message: "x".repeat(4001) })).rejects.toThrow();
    for (let index = 0; index < 20; index++) await f.user.action(api.chat.send, { ...f.request, contextKey: await f.currentContextKey(), requestId: `quota-${index}` });
    await expect(f.user.action(api.chat.send, { ...f.request, contextKey: await f.currentContextKey(), requestId: "too-many" })).rejects.toThrow();
    expect(await f.t.run(ctx => ctx.db.query("aiAttempts").collect())).toEqual([]);
    expect((await f.t.run(ctx => ctx.db.query("chatAttempts").collect())).length).toBe(20);
  });

  it("accepts a reply after the former 30-second cutoff", async () => {
    const f = await fixture();
    vi.useFakeTimers();
    const pending = delayedFetch();
    const sending = f.user.action(api.chat.send, f.request);
    await pending.dispatched;
    await vi.advanceTimersByTimeAsync(35_000);
    pending.release(reply("A concise delayed answer."));
    expect(await sending).toEqual({ kind: "available" });
    expect((await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0]?.result).toEqual({ kind: "reply", text: "A concise delayed answer." });
  });

  it("aborts at the chat deadline and persists timeout before the reservation expires", async () => {
    const f = await fixture();
    vi.useFakeTimers();
    let started = () => {};
    const dispatched = new Promise<void>(resolve => { started = resolve; });
    vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      started();
    })));
    const sending = f.user.action(api.chat.send, f.request);
    await dispatched;
    await vi.advanceTimersByTimeAsync(30_000);
    expect((await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0]?.result.kind).toBe("pending");
    expect(CHAT_LIMITS.timeoutMs).toBeLessThan(CHAT_LIMITS.leaseMs);
    await vi.advanceTimersByTimeAsync(CHAT_LIMITS.timeoutMs - 30_000);
    expect(await sending).toEqual({ kind: "unavailable", reason: "timeout" });
    expect((await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0]?.result).toEqual({ kind: "unavailable", reason: "timeout" });
  });
});

describe("private case documents", () => {
  it("accepts supported signatures and UTF-8, sanitizes metadata, and enforces private read/remove", async () => {
    const f = await fixture();
    const samples = [
      { contentType: "application/pdf", bytes: [37, 80, 68, 70, 45, 49] },
      { contentType: "image/png", bytes: [137, 80, 78, 71, 13, 10, 26, 10] },
      { contentType: "image/jpeg", bytes: [255, 216, 255, 0] },
    ];
    for (const sample of samples) await f.user.action(api.caseDocuments.upload, { caseId: f.caseId, content: new Uint8Array(sample.bytes).buffer, contentType: sample.contentType, fileName: "test-document" });
    const documentId = await f.upload();
    const documents = await f.user.query(api.caseDocuments.listMine, { caseId: f.caseId });
    expect(documents).toHaveLength(4);
    expect(Object.keys(documents[0] ?? {}).sort()).toEqual(["_id", "contentType", "fileName", "size"]);
    expect(await f.user.action(api.caseDocuments.read, { documentId })).toEqual({ content: text, contentType: "text/plain", fileName: "facts.txt" });
    await expect(f.stranger.query(api.caseDocuments.listMine, { caseId: f.caseId })).rejects.toThrow();
    await expect(f.stranger.action(api.caseDocuments.read, { documentId })).rejects.toThrow();
    await expect(f.stranger.mutation(api.caseDocuments.remove, { documentId })).rejects.toThrow();
    await expect(f.stranger.action(api.caseDocuments.upload, { caseId: f.caseId, content: text, contentType: "text/plain", fileName: "x.txt" })).rejects.toThrow();
    const record = await f.t.run(ctx => ctx.db.get(documentId));
    await f.user.mutation(api.caseDocuments.remove, { documentId });
    expect(await f.t.run(async ctx => record ? await ctx.storage.get(record.storageId) : null)).toBeNull();
    await expect(f.user.action(api.caseDocuments.read, { documentId })).rejects.toThrow();
  });

  it("rejects spoofed types, malformed UTF-8, unsafe names and oversized files before storage", async () => {
    const f = await fixture();
    for (const args of [
      { content: text, contentType: "application/pdf", fileName: "fake.pdf" },
      { content: text, contentType: "text/html", fileName: "fake.html" },
      { content: new Uint8Array([255, 254, 0]).buffer, contentType: "text/plain", fileName: "bad.txt" },
      { content: text, contentType: "text/plain", fileName: "../facts.txt" },
      { content: new ArrayBuffer(CHAT_LIMITS.documentBytes + 1), contentType: "text/plain", fileName: "large.txt" },
    ]) await expect(f.user.action(api.caseDocuments.upload, { caseId: f.caseId, ...args })).rejects.toThrow();
    expect(await f.t.run(ctx => ctx.db.system.query("_storage").collect())).toEqual([]);
  });

  it("limits document counts and attachments, rejects cross-case docs and cleans all case data on deletion", async () => {
    const f = await fixture();
    const documentIds = [];
    for (let index = 0; index < 5; index++) documentIds.push(await f.upload());
    await expect(f.upload()).rejects.toThrow();
    await expect(f.user.action(api.chat.send, { ...f.request, documentIds })).rejects.toThrow();
    const first = documentIds[0]; if (!first) throw new Error("Missing document");
    await expect(f.user.action(api.chat.send, { ...f.request, documentIds: [first, first] })).rejects.toThrow();
    const anotherCase = await f.user.mutation(api.cases.create, { title: "Other", text: "Other original", locale: "en", context: [] });
    await expect(f.user.action(api.chat.send, { ...f.request, caseId: anotherCase, documentIds: [first] })).rejects.toThrow();
    vi.stubGlobal("fetch", vi.fn(async () => reply()));
    await f.user.action(api.chat.send, { ...f.request, documentIds: [first] });
    await f.user.mutation(api.cases.deleteDraft, { caseId: f.caseId });
    for (const table of ["caseDocuments", "chatTurns", "chatConsents"] as const) expect(await f.t.run(ctx => ctx.db.query(table).collect())).toEqual([]);
    expect(await f.t.run(ctx => ctx.db.system.query("_storage").collect())).toEqual([]);
    await expect(f.user.query(api.chat.listMine, { caseId: f.caseId })).rejects.toThrow();
  });

  it("cleans a stored blob when concurrent uploads lose the atomic five-document attachment race", async () => {
    const f = await fixture();
    for (let index = 0; index < 4; index++) await f.upload();
    const results = await Promise.allSettled([f.upload(), f.upload()]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    expect(await f.user.query(api.caseDocuments.listMine, { caseId: f.caseId })).toHaveLength(5);
    expect(await f.t.run(ctx => ctx.db.system.query("_storage").collect())).toHaveLength(5);
  });

  it("enforces the total 6 MiB attachment ceiling and sends PDF/image inline data only to the fixed endpoint", async () => {
    const f = await fixture();
    const large = new Uint8Array(CHAT_LIMITS.documentBytes).fill(65).buffer;
    const documentIds = [];
    for (let index = 0; index < 3; index++) documentIds.push(await f.user.action(api.caseDocuments.upload, { caseId: f.caseId, content: large, contentType: "text/plain", fileName: `large-${index}.txt` }));
    await expect(f.user.action(api.chat.send, { ...f.request, documentIds })).rejects.toThrow();
    const pdfBytes = new TextEncoder().encode("%PDF-1.7\nfixture").buffer;
    const pdf = await f.user.action(api.caseDocuments.upload, { caseId: f.caseId, content: pdfBytes, contentType: "application/pdf", fileName: "fixture.pdf" });
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => reply()); vi.stubGlobal("fetch", fetchMock);
    await f.user.action(api.chat.send, { ...f.request, documentIds: [pdf] });
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent");
    expect(String(call?.[1].body)).toContain(JSON.stringify({ inlineData: { mimeType: "application/pdf", data: Buffer.from(pdfBytes).toString("base64") } }));
    expect(call?.[1].redirect).toBe("error");
    expect(String(call?.[1].body)).not.toContain("fileUri");
    await f.t.run(ctx => ctx.db.patch(f.accountId, { disabled: true }));
    await expect(f.user.action(api.caseDocuments.read, { documentId: pdf })).rejects.toThrow();
    await expect(f.user.mutation(api.caseDocuments.remove, { documentId: pdf })).rejects.toThrow();
    await expect(f.upload()).rejects.toThrow();
  });
});
