import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { dgxConfig, dgxContent, dgxRequestBody } from "../convex/lib/aiDgx";

const modules = import.meta.glob("../convex/**/*.ts");
const GUEST = "guest-token-dddddddddddddddddddddddddddddddddddd";
const DGX = "https://ai-services.mietjmu.in/gateway/llm/chat";
const answer = (overrides: Record<string, unknown> = {}) => ({
  transcript: "", reply: "यह कब हुआ?", domain: "property", urgency: "high",
  city: "Ludhiana", summary: "मकान मालिक ने किरायेदार को घर से निकाला।", suggestLawyer: false, lawQuery: "", ...overrides,
});
const dgxReply = (body: unknown) => Response.json({ success: true, model: "x", message: { role: "assistant", content: "```json\n" + JSON.stringify(body) + "\n```" } });
const geminiReply = (body: unknown) => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(body) }] } }] });
const asrReply = (text: string) => Response.json({ pipelineResponse: [{ taskType: "asr", output: [{ source: text }] }] });
const HEARD = "मकान मालिक ने मुझे घर से निकाल दिया";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

type Call = { url: string; body: any };
function setup(handler: (call: Call) => Response | Promise<Response>) {
  const t = convexTest(schema, modules);
  vi.stubEnv("GEMINI_API_KEY", "test-only-noncredential");
  vi.stubEnv("GEMINI_MODEL", "gemini-test-model");
  vi.stubEnv("DGX_API_KEY", "dgx_test_only");
  vi.stubEnv("BHASHINI_API_KEY", "bhashini-test-only");
  const calls: Call[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const call = { url: String(url), body: JSON.parse(String(init.body)) };
    calls.push(call);
    return await handler(call);
  }));
  return { t, calls };
}
let request = 0;
const turn = (mimeType: "audio/mp4" | "audio/aac" = "audio/mp4") => ({
  guestToken: GUEST, locale: "hi" as const, requestId: `dgx-${++request}`, consent: true as const,
  input: { kind: "audio" as const, mimeType, data: new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]).buffer },
});
const isAsr = (call: Call) => call.url.includes("bhashini") && call.body.pipelineTasks[0].taskType === "asr";

describe("voice on the college DGX server", () => {
  it("transcribes with Bhashini, answers in one DGX call and stores what was heard", async () => {
    const { t, calls } = setup(call => isAsr(call) ? asrReply(HEARD) : call.body.model === "qwen3.5:9b" ? dgxReply({ lawQuery: "" }) : call.url === DGX ? dgxReply(answer()) : new Response(null, { status: 500 }));
    const result = await t.action(api.voice.send, turn());
    expect(result.kind).toBe("available");
    expect(calls.map(call => call.url.includes("bhashini") ? "asr" : call.body.model ?? "gemini")).toEqual(["asr", "qwen3.5:9b", "qwen3.6:35b"]);
    expect(calls[0]!.body.pipelineTasks[0].config).toMatchObject({ audioFormat: "m4a", serviceId: "ai4bharat/conformer-hi-gpu--t4", language: { sourceLanguage: "hi" } });
    expect(calls[1]!.body.messages.at(-1).content).toBe(HEARD);
    const dgx = calls[2]!.body;
    expect(dgx).toMatchObject({ stream: false, think: false, keep_alive: "30m" });
    expect(dgx.messages[0].role).toBe("system");
    expect(dgx.messages.at(-1).content).toContain(HEARD);
    // Shorter output: no transcript or search phrase to write back, and no law excerpts were found.
    expect(Object.keys(dgx.format.properties)).not.toContain("transcript");
    expect(Object.keys(dgx.format.properties)).not.toContain("lawQuery");
    expect(dgx.messages[0].content).toContain("do not name any law");
    const view = await t.query(api.conversations.get, { conversationId: (result as unknown as { conversationId: Id<"conversations"> }).conversationId, guestToken: GUEST });
    expect(view?.turns[0]).toMatchObject({ transcript: HEARD, reply: { kind: "reply", text: "यह कब हुआ?" } });
    const stored = await t.run(async ctx => await ctx.db.query("conversationTurns").first());
    expect(stored?.dispatch).toMatchObject({ model: "qwen3.6:35b", recipientOrigin: "https://ai-services.mietjmu.in" });
  });

  it("moves to the next DGX model, then Gemini, when a model is down", async () => {
    const { t, calls } = setup(call => isAsr(call) ? asrReply(HEARD) : call.url === DGX ? Response.json({ success: false, message: "LLM service unavailable." }, { status: 503 }) : geminiReply(answer()));
    expect((await t.action(api.voice.send, turn())).kind).toBe("available");
    expect(calls.slice(1).map(call => call.body.model ?? "gemini")).toEqual(["qwen3.5:9b", "qwen3.6:35b", "gemma3:27b", "gemini"]);
    // Gemini got the transcript as text, not the audio.
    expect(JSON.stringify(calls[4]!.body)).not.toContain("inlineData");
  });

  it("sends the audio to Gemini (skipping text-only DGX models) when Bhashini can't transcribe it", async () => {
    const { t, calls } = setup(call => call.url.includes("bhashini") ? new Response(null, { status: 500 }) : call.url === DGX ? dgxReply(answer()) : geminiReply(answer({ transcript: HEARD })));
    expect((await t.action(api.voice.send, turn("audio/aac"))).kind).toBe("available");
    expect(calls.some(isAsr)).toBe(false); // raw AAC is not a format Bhashini decodes
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body.contents.at(-1).parts[1].inlineData.mimeType).toBe("audio/aac");
  });

  it("looks up the law BEFORE answering, so one answer call cites the excerpt", async () => {
    const { t, calls } = setup(call => isAsr(call) ? asrReply("मेरे साथ धोखा हुआ")
      : call.body.model === "qwen3.5:9b" ? dgxReply({ lawQuery: "cheating dishonestly inducing delivery of property" })
      : call.url === DGX ? dgxReply({ ...answer({ reply: "भारतीय न्याय संहिता की धारा 318 के अनुसार धोखा देना अपराध है।" }), usedSources: [1, 9] })
      : new Response(null, { status: 500 }));
    const dataset = "a".repeat(64);
    const source = { title: "Bharatiya Nyaya Sanhita, 2023", url: "https://www.ncrb.mha.gov.in/uploads/SankalanPortal/ChaptersBNS.html#318", documentType: "statute" as const, act: "BNS", sectionNumber: 318, sectionTitle: "Cheating" };
    await t.run(async ctx => {
      await ctx.db.insert("legalPassages", { dataset, passageId: "s318", text: "**318.** Whoever cheats shall be punished with imprisonment.", textHash: "b".repeat(64), searchText: "Cheating dishonestly inducing delivery of property punished", source });
      await ctx.db.insert("legalDatasets", { key: "current", dataset, count: 1 });
    });
    const result = await t.action(api.voice.send, turn());
    if (result.kind !== "available") throw new Error("expected reply");
    const answers = calls.filter(call => call.url === DGX && call.body.model !== "qwen3.5:9b");
    expect(answers).toHaveLength(1);
    expect(answers[0]!.body.messages[0].content).toContain("BNS section 318 (Cheating)");
    expect(answers[0]!.body.format.required).toContain("usedSources");
    const view = await t.query(api.conversations.get, { conversationId: result.conversationId as Id<"conversations">, guestToken: GUEST });
    expect(view?.turns[0]?.reply).toEqual({ kind: "reply", text: "भारतीय न्याय संहिता की धारा 318 के अनुसार धोखा देना अपराध है।", sources: [{ ...source, quote: "318. Whoever cheats shall be punished with imprisonment." }] });
  });

  it("answers without law excerpts when the search-phrase model fails", async () => {
    const { t, calls } = setup(call => isAsr(call) ? asrReply(HEARD) : call.body.model === "qwen3.5:9b" ? new Response(null, { status: 503 }) : call.url === DGX ? dgxReply(answer()) : new Response(null, { status: 500 }));
    expect((await t.action(api.voice.send, turn())).kind).toBe("available");
    expect(calls.at(-1)!.body.model).toBe("qwen3.6:35b");
  });

  it("uses the old two-step path when the single-call path is turned off", async () => {
    const { t, calls } = setup(call => isAsr(call) ? asrReply(HEARD) : call.url === DGX ? dgxReply({ ...answer(), transcript: HEARD }) : new Response(null, { status: 500 }));
    vi.stubEnv("DGX_QUERY_MODEL", "none");
    expect((await t.action(api.voice.send, turn())).kind).toBe("available");
    expect(calls.map(call => call.body.model ?? "asr")).toEqual(["asr", "qwen3.6:35b"]);
    expect(calls[1]!.body.format.required).toContain("lawQuery");
  });

  it("keeps the DGX models warm with a fixed one-word request", async () => {
    const { t, calls } = setup(() => Response.json({ success: true, message: { content: "hi" } }));
    await t.action(internal.dgxWarm.ping, {});
    expect(calls.map(call => call.body.model).sort()).toEqual(["gemma3:27b", "qwen3.5:9b", "qwen3.6:35b"]);
    expect(calls.every(call => call.body.keep_alive === "30m" && call.body.messages[0].content === "hi")).toBe(true);
    vi.stubEnv("DGX_KEEP_WARM", "false");
    await t.action(internal.dgxWarm.ping, {});
    expect(calls).toHaveLength(3);
  });

  it("reports the capability as configured with only DGX set", async () => {
    const { t } = setup(() => new Response(null, { status: 500 }));
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await t.query(api.conversations.capabilities, {})).toMatchObject({ configured: true });
  });
});

describe("DGX adapter", () => {
  it("reads config with safe defaults and rejects bad values", () => {
    expect(dgxConfig({})).toEqual({ kind: "unavailable", reason: "not_configured" });
    expect(dgxConfig({ DGX_API_KEY: "k" })).toMatchObject({ kind: "configured", models: ["qwen3.6:35b", "gemma3:27b"], queryModel: "qwen3.5:9b", origin: "https://ai-services.mietjmu.in" });
    expect(dgxConfig({ DGX_API_KEY: "k", DGX_QUERY_MODEL: "none" })).toMatchObject({ queryModel: null });
    expect(dgxConfig({ DGX_API_KEY: "k", DGX_MODELS: "gemma3:27b" })).toMatchObject({ models: ["gemma3:27b"] });
    expect(dgxConfig({ DGX_API_KEY: "k", DGX_URL: "http://insecure.example/chat" })).toMatchObject({ reason: "invalid_config" });
    expect(dgxConfig({ DGX_API_KEY: "k", DGX_MODELS: "bad model" })).toMatchObject({ reason: "invalid_config" });
  });
  it("extracts the answer from fences and hidden reasoning", () => {
    const wrap = (content: string) => ({ success: true, message: { content } });
    expect(dgxContent(wrap('```json\n{"a":1}\n```'), true)).toBe('{"a":1}');
    expect(dgxContent(wrap('<think>hmm</think>Here: {"a":1}'), true)).toBe('{"a":1}');
    expect(dgxContent(wrap("not json"), true)).toBeNull();
    expect(dgxContent(wrap("<think>x</think> नमस्ते"), false)).toBe("नमस्ते");
    expect(dgxContent({ success: false, message: "LLM service unavailable." }, false)).toBeNull();
  });
  it("sends the JSON schema and token limit", () => {
    const body = dgxRequestBody("qwen3.6:35b", { systemInstruction: "S", messages: [{ role: "user", parts: [{ kind: "text", text: "Q" }] }], maxOutputTokens: 512, maxReplyChars: 100, output: { kind: "json", schema: { type: "object" } } });
    expect(body).toEqual({ model: "qwen3.6:35b", stream: false, think: false, keep_alive: "30m", messages: [{ role: "system", content: 'S\n\nReply with ONLY one JSON object (no other text, no code fences) matching this JSON schema:\n{"type":"object"}' }, { role: "user", content: "Q" }], options: { num_predict: 512, temperature: 0.3 }, format: { type: "object" } });
  });
});
