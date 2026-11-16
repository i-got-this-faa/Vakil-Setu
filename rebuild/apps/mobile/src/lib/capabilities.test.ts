import { describe, expect, test } from "bun:test";
import { aiAllowedForLocale, vertexFallbackEnabled } from "./capabilities";

describe("aiAllowedForLocale", () => {
  test("requires configuration and the exact locale in the allowlist", () => {
    expect(aiAllowedForLocale({ configured: true, locales: ["en", "hi"] }, "hi")).toBe(true);
    expect(aiAllowedForLocale({ configured: true, locales: ["en"] }, "hi")).toBe(false);
    expect(aiAllowedForLocale({ configured: false, locales: ["hi"] }, "hi")).toBe(false);
  });

  test("is closed while capabilities are unknown", () => {
    expect(aiAllowedForLocale(undefined, "en")).toBe(false);
  });
});

describe("vertexFallbackEnabled", () => {
  test("only an explicit true enables the fallback notice and flag", () => {
    expect(vertexFallbackEnabled({ configured: true, locales: [], vertexFallback: true })).toBe(true);
    expect(vertexFallbackEnabled({ configured: true, locales: [] })).toBe(false);
    expect(vertexFallbackEnabled(undefined)).toBe(false);
  });
});

