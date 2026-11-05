import { describe, expect, it } from "vitest";
import { aiAllowedLanguages, aiCapabilities, boundedResponseText, extractGeminiContent, geminiConfig, parseProviderResult } from "../convex/lib/provider";
import { LOCALES } from "@vakil/domain";

const draft = { locale: "pa", domain: "unknown", urgency: "unknown", summary: "ਪਹਿਲਾਂ ਦਸਤਾਵੇਜ਼ਾਂ ਦੀ ਸਮੀਖਿਆ ਕਰੋ।", actions: [] };
describe("Gemini transport boundary", () => {
  it("pins Google HTTPS, defaults the model, and never falls back to old gateway credentials", () => {
    expect(geminiConfig({ LLM_API_KEY: "old-test-marker" })).toEqual({ kind: "unavailable", reason: "not_configured" });
    expect(geminiConfig({ GEMINI_API_KEY: "synthetic-test-key" })).toEqual({ kind: "configured", apiKey: "synthetic-test-key", model: "gemini-3.6-flash", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent" });
    for (const model of ["", "../secrets", "gemini-test?key=secret", "https://evil.example"]) expect(geminiConfig({ GEMINI_API_KEY: "synthetic", GEMINI_MODEL: model })).toEqual({ kind: "unavailable", reason: "invalid_config" });
    expect(geminiConfig({ GEMINI_API_KEY: "test\r\nheader" })).toEqual({ kind: "unavailable", reason: "invalid_config" });
  });
  it("joins text parts, omits thoughts, and validates the requested language", () => {
    const json = JSON.stringify(draft);
    const text = extractGeminiContent({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "private reasoning", thought: true }, { text: json.slice(0, 20) }, { text: json.slice(20) }] } }] });
    expect(text).toBe(json);
    expect(parseProviderResult(JSON.parse(text ?? "null"), "pa")).toMatchObject({ locale: "pa", text: draft.summary });
    expect(parseProviderResult(draft, "hi")).toBeNull();
  });
  it.each([
    { promptFeedback: { blockReason: "SAFETY" } },
    { candidates: [] },
    { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: JSON.stringify(draft) }] } }] },
    { candidates: [{ finishReason: "SAFETY", content: { parts: [{ text: JSON.stringify(draft) }] } }] },
    { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "thought", thought: true }] } }] },
    { candidates: [{ finishReason: "STOP", content: { parts: [{ functionCall: { name: "unexpected" } }] } }] },
    { choices: [{ message: { content: JSON.stringify(draft) } }] },
  ])("rejects incomplete, blocked or wrong-protocol responses %#", (response) => {
    expect(extractGeminiContent(response)).toBeNull();
  });
  it("rejects oversized responses and invalid draft content", async () => {
    expect(await boundedResponseText(new Response("x".repeat(64 * 1024 + 1)))).toBeNull();
    for (const invalid of [{ ...draft, summary: " " }, { ...draft, summary: "x".repeat(4001) }, { ...draft, actions: ["x".repeat(301)] }, { ...draft, domain: "invented" }]) expect(parseProviderResult(invalid, "pa")).toBeNull();
  });
  it("keeps provider credentials and UI language coverage out of AI permission", () => {
    expect(aiCapabilities({})).toEqual({ configured: false, locales: ["en", "hi", "pa"], provider: "gemini_native", evidence: "observed_runtime_only_not_quality_validated", reason: "not_configured" });
    const capabilities = aiCapabilities({ GEMINI_API_KEY: "secret-marker", GEMINI_MODEL: "gemini-3.8-flash", AI_CHAT_LOCALES: "ta, ur,ta" });
    expect(capabilities).toEqual({ configured: true, locales: ["ta", "ur"], provider: "gemini_native", evidence: "operator_allowlist_not_quality_validated" });
    expect(JSON.stringify(capabilities)).not.toContain("secret-marker");
    expect(JSON.stringify(capabilities)).not.toContain("gemini-3.8-flash");
    expect(aiAllowedLanguages({ AI_CHAT_LOCALES: LOCALES.join(",") })).toEqual([...LOCALES]);
    for (const invalid of ["en,xx", "en-IN", "*", "en,", "EN"]) expect(aiAllowedLanguages({ AI_CHAT_LOCALES: invalid })).toEqual([]);
    expect(aiAllowedLanguages({ AI_CHAT_LOCALES: "" })).toEqual([]);
  });
  it.each(LOCALES)("validates %s draft content without granting it provider permission", locale => {
    expect(parseProviderResult({ ...draft, locale }, locale)).toMatchObject({ locale });
    if (!["en", "hi", "pa"].includes(locale)) expect(aiAllowedLanguages({})).not.toContain(locale);
  });
});
