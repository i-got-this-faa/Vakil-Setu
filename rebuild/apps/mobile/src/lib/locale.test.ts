import { describe, expect, test } from "bun:test";
import { isInterfaceLocale, languageTagFor, parseInterfaceLocale } from "./locale";

describe("parseInterfaceLocale", () => {
  test("keeps the three pilot interface languages", () => {
    expect(parseInterfaceLocale("en")).toBe("en");
    expect(parseInterfaceLocale("hi")).toBe("hi");
    expect(parseInterfaceLocale("pa")).toBe("pa");
  });

  test("maps registry tags to their short interface code", () => {
    expect(parseInterfaceLocale("hi-IN")).toBe("hi");
    expect(parseInterfaceLocale("pa-Guru-IN")).toBe("pa");
  });

  test("falls back to English for unknown, unsupported or missing values", () => {
    expect(parseInterfaceLocale("ta")).toBe("en");
    expect(parseInterfaceLocale("xx-YY")).toBe("en");
    expect(parseInterfaceLocale(null)).toBe("en");
    expect(parseInterfaceLocale(42)).toBe("en");
  });
});

describe("isInterfaceLocale", () => {
  test("is strict about the shipped set", () => {
    expect(isInterfaceLocale("hi")).toBe(true);
    expect(isInterfaceLocale("hi-IN")).toBe(false);
  });
});

describe("languageTagFor", () => {
  test("returns the registry tag for known codes and en-IN otherwise", () => {
    expect(languageTagFor("hi")).toBe("hi-IN");
    expect(languageTagFor("pa")).toBe("pa-Guru-IN"); // registry script-specific tag
    expect(languageTagFor("unknown-code")).toBe("en-IN");
  });
});
