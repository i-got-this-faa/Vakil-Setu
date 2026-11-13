import { describe, expect, test } from "bun:test";
import { draftBundles } from "@legal-setu/i18n";
import { RESTORABLE_CHAT_REASONS, chatReasonMessage, keepsHeldChatRequest } from "./chat";

const errors = draftBundles.en.chatCopy.errors;

describe("chatReasonMessage", () => {
  test("maps known server reasons to their copy", () => {
    expect(chatReasonMessage("rate_limited", errors)).toBe(errors.rate_limited);
    expect(chatReasonMessage("blocked", errors)).toBe(errors.blocked);
  });

  test("keeps unknown future reasons visible rather than inventing a meaning", () => {
    expect(chatReasonMessage("quota_exhausted_v2", errors)).toBe(`${errors.generic} (quota_exhausted_v2)`);
  });
});

describe("retry rules", () => {
  test("only in_progress keeps the held request", () => {
    expect(keepsHeldChatRequest("in_progress")).toBe(true);
    expect(keepsHeldChatRequest("timeout")).toBe(false);
    expect(keepsHeldChatRequest("blocked")).toBe(false);
  });

  test("blocked and limit results are never offered as a plain retry", () => {
    expect(RESTORABLE_CHAT_REASONS).not.toContain("blocked");
    expect(RESTORABLE_CHAT_REASONS).not.toContain("limit_exceeded");
    expect(RESTORABLE_CHAT_REASONS).toContain("timeout");
  });
});
