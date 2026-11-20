import { describe, expect, test } from "bun:test";
import { chooseReadAloudLanguage, chooseSpeechLanguage } from "./speech";

describe("chooseSpeechLanguage", () => {
  test("prefers a native Dogri voice but can use Hindi for its Devanagari text", () => {
    expect(chooseReadAloudLanguage([{ language: "doi-IN" }, { language: "hi-IN" }], "doi-IN")).toBe("doi-IN");
    expect(chooseReadAloudLanguage([{ language: "hi-IN" }], "doi-IN")).toBe("hi-IN");
    expect(chooseReadAloudLanguage([{ language: "en-US" }], "doi-IN")).toBeNull();
    expect(chooseReadAloudLanguage([{ language: "hi-IN" }], "ks-IN")).toBeNull();
  });
  test("uses an exact regional voice when the device has one", () => {
    expect(chooseSpeechLanguage([{ language: "hi-IN" }], "hi-IN")).toBe("hi-IN");
    expect(chooseSpeechLanguage([{ language: "hi_IN" }], "hi-IN")).toBe("hi-IN");
  });

  test("accepts a primary-language voice for the same language", () => {
    expect(chooseSpeechLanguage([{ language: "en-US" }], "en-IN")).toBe("en");
  });

  test("returns null when no voice exists, so the control stays disabled", () => {
    expect(chooseSpeechLanguage([{ language: "en-US" }], "pa-IN")).toBeNull();
    expect(chooseSpeechLanguage([], "hi-IN")).toBeNull();
    expect(chooseSpeechLanguage([{ language: undefined }], "hi-IN")).toBeNull();
  });
});
