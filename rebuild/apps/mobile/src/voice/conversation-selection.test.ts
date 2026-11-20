import { expect, test } from "bun:test";
import { FRESH_CONVERSATION, restoreConversation } from "./conversation-selection";

test("switching to live chat discards scripted IDs", () => {
  expect(restoreConversation("demo-conversation-2", false)).toEqual({ kind: "fresh" });
  expect(restoreConversation("demo-conversation-2", true)).toEqual({ kind: "open", id: "demo-conversation-2" });
});
test("starting fresh stays fresh after reload instead of resuming the previous conversation", () => {
  expect(restoreConversation(FRESH_CONVERSATION, false)).toEqual({ kind: "fresh" });
  expect(restoreConversation(null, false)).toEqual({ kind: "resume" });
  expect(restoreConversation("stored-id", false)).toEqual({ kind: "open", id: "stored-id" });
});
