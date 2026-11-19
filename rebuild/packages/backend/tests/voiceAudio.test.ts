import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { toPcm16Wav } from "../convex/lib/bhashini";

const modules = import.meta.glob("../convex/**/*.ts");
const GUEST = "guest-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function floatWav(samples: number[]) {
  const out = new Uint8Array(44 + samples.length * 4);
  const view = new DataView(out.buffer);
  const write = (offset: number, text: string) => { for (let i = 0; i < 4; i++) out[offset + i] = text.charCodeAt(i); };
  write(0, "RIFF"); view.setUint32(4, 36 + samples.length * 4, true); write(8, "WAVE"); write(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 3, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true);
  view.setUint32(28, 64000, true); view.setUint16(32, 4, true); view.setUint16(34, 32, true);
  write(36, "data"); view.setUint32(40, samples.length * 4, true);
  samples.forEach((sample, i) => view.setFloat32(44 + i * 4, sample, true));
  return out;
}
const bhashini = (wav: Uint8Array) => new Response(JSON.stringify({ pipelineResponse: [{ taskType: "tts", audio: [{ audioContent: Buffer.from(wav).toString("base64") }] }] }));

describe("Bhashini read-aloud", () => {
  it("converts Bhashini's float WAV to standard 16-bit WAV", () => {
    const pcm = toPcm16Wav(floatWav([0, 1, -1, 0.5, 2]));
    const view = new DataView(pcm.buffer);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(10);
    expect([0, 1, 2, 3, 4].map((i) => view.getInt16(44 + i * 2, true))).toEqual([0, 32767, -32768, 16383, 32767]);
  });

  it("speaks a sentence once, then serves the saved clip without calling Bhashini again", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("BHASHINI_API_KEY", "test-key");
    const fetchMock = vi.fn(async () => bhashini(floatWav([0.1, 0.2])));
    vi.stubGlobal("fetch", fetchMock);
    const first = await t.action(api.voiceAudio.speak, { locale: "hi", text: "नमस्ते,   मैं मदद करूँगा।", guestToken: GUEST });
    expect(first.kind).toBe("audio");
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.pipelineTasks[0].config).toMatchObject({ language: { sourceLanguage: "hi" }, gender: "male" });
    expect(body.inputData.input[0].source).toBe("नमस्ते, मैं मदद करूँगा।");
    const again = await t.action(api.voiceAudio.speak, { locale: "hi", text: "नमस्ते, मैं मदद करूँगा।", guestToken: GUEST });
    expect(again.kind).toBe("audio");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the second key, and says so plainly when there is no voice or no caller", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("BHASHINI_API_KEY", "bad");
    vi.stubEnv("BHASHINI_API_KEY_FALLBACK", "good");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => (new Headers(init.headers).get("Authorization") === "good" ? bhashini(floatWav([0])) : new Response("no", { status: 500 })));
    vi.stubGlobal("fetch", fetchMock);
    expect((await t.action(api.voiceAudio.speak, { locale: "ta", text: "வணக்கம்", guestToken: GUEST })).kind).toBe("audio");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await t.action(api.voiceAudio.speak, { locale: "ur", text: "السلام علیکم", guestToken: GUEST })).toEqual({ kind: "unavailable", reason: "no_voice" });
    expect(await t.action(api.voiceAudio.speak, { locale: "hi", text: "नमस्ते" })).toEqual({ kind: "unavailable", reason: "unauthenticated" });
    expect(await t.action(api.voiceAudio.speak, { locale: "hi", text: "x".repeat(401), guestToken: GUEST })).toEqual({ kind: "unavailable", reason: "invalid_text" });
  });
});

describe("Gemini read-aloud for Kashmiri", () => {
  const pcm = new Uint8Array([1, 0, 2, 0, 3, 0, 4, 0]);
  const geminiAudio = (mimeType: string, data: Uint8Array) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType, data: Buffer.from(data).toString("base64") } }] } }] }));

  it("speaks Kashmiri with Gemini (not Bhashini), wraps raw PCM as WAV, and saves the clip", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("BHASHINI_API_KEY", "bhashini-key");
    vi.stubEnv("GEMINI_API_KEY", "gemini-key");
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => geminiAudio("audio/L16;codec=pcm;rate=24000", pcm));
    vi.stubGlobal("fetch", fetchMock);
    const first = await t.action(api.voiceAudio.speak, { locale: "ks", text: "آداب، بہٕ چھس مدد کرنہٕ خٲطرٕ۔", guestToken: GUEST });
    expect(first.kind).toBe("audio");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain("generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent");
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe("gemini-key");
    const body = JSON.parse(String(init.body));
    expect(body.generationConfig.responseModalities).toEqual(["AUDIO"]);
    expect(body.contents[0].parts[0].text).toBe("آداب، بہٕ چھس مدد کرنہٕ خٲطرٕ۔");
    const stored = new Uint8Array((await t.run(async ctx => {
      const clip = await ctx.db.query("voiceClips").first();
      return clip ? await (await ctx.storage.get(clip.storageId))!.arrayBuffer() : null;
    }))!);
    const view = new DataView(stored.buffer);
    expect(String.fromCharCode(...stored.slice(0, 4))).toBe("RIFF");
    expect(view.getUint32(24, true)).toBe(24000);
    expect([...stored.slice(44)]).toEqual([...pcm]);
    expect((await t.action(api.voiceAudio.speak, { locale: "ks", text: "آداب، بہٕ چھس مدد کرنہٕ خٲطرٕ۔", guestToken: GUEST })).kind).toBe("audio");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("tries the next Gemini key, and reports failure when no key can speak", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("GEMINI_API_KEY", "out-of-quota");
    vi.stubEnv("GEMINI_API_KEYS", "spare");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => (new Headers(init.headers).get("x-goog-api-key") === "spare" ? geminiAudio("audio/wav", pcm) : new Response("quota", { status: 429 })));
    vi.stubGlobal("fetch", fetchMock);
    // A WAV that isn't really one is refused rather than saved.
    expect(await t.action(api.voiceAudio.speak, { locale: "ks", text: "آداب", guestToken: GUEST })).toEqual({ kind: "unavailable", reason: "provider_failed" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.stubEnv("GEMINI_API_KEYS", "");
    expect(await t.action(api.voiceAudio.speak, { locale: "ks", text: "شکریہ", guestToken: GUEST })).toEqual({ kind: "unavailable", reason: "provider_failed" });
  });
});
