export type ConversationSelection = { kind: "resume" } | { kind: "fresh" } | { kind: "open"; id: string };
export const FRESH_CONVERSATION = "__new_conversation__";

/** Scripted IDs cannot be sent to a live Convex deployment. */
export function restoreConversation(stored: string | null, scripted: boolean): ConversationSelection {
  if (stored === FRESH_CONVERSATION || (!scripted && stored?.startsWith("demo-"))) return { kind: "fresh" };
  return stored ? { kind: "open", id: stored } : { kind: "resume" };
}
