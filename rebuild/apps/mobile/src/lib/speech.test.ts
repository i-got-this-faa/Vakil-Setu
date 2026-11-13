import { describe, expect, test } from "bun:test";
import { chooseSpeechLanguage } from "./speech";

describe("chooseSpeechLanguage", () => {
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
