import { LIMITS } from "@legal-setu/domain";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { fail } from "./access";
import { boundedText } from "./input";

/**
 * Turns a voice conversation into a private case with a summary, so a lawyer can be asked to read it.
 * Used by the booking screen (conversations.prepareCase) and by voice booking. `account` must own the conversation.
 * Booking taps ("book a lawyer", "number 1") are not part of the problem, so they are left out.
 */
export async function prepareConversationCase(ctx: MutationCtx, account: Doc<"accounts">, conversation: Doc<"conversations">) {
  if (conversation.accountId !== account._id) fail("NOT_FOUND", "Conversation not found.");
  const turns = await ctx.db.query("conversationTurns").withIndex("by_conversation", q => q.eq("conversationId", conversation._id)).order("desc").take(200);
  const spoken = turns.filter(turn => turn.reply.kind === "reply" && turn.transcript && turn.inputKind !== "booking" && !turn.reply.booking).reverse().map(turn => turn.transcript);
  if (!spoken.length) fail("INVALID_INPUT", "Tell us a little about your problem first.");
  let text = spoken.join("\n");
  if (text.length > LIMITS.intakeText) text = text.slice(text.length - LIMITS.intakeText);
  text = boundedText(text, "Conversation", LIMITS.intakeText);
  const fromModel = Boolean(conversation.profile.summary);
  const summaryText = boundedText((conversation.profile.summary || text).slice(0, LIMITS.summaryText), "Summary", LIMITS.summaryText);
  const summary = { locale: conversation.locale, domain: conversation.profile.domain, urgency: conversation.profile.urgency, text: summaryText, actions: [] };
  const source = fromModel ? { kind: "provider" as const, provider: conversation.profileModel?.startsWith("gemini") ? "gemini" as const : "dgx" as const, model: conversation.profileModel ?? "unknown" } : { kind: "manual" as const };
  const now = Date.now();
  let legalCase = conversation.caseId ? await ctx.db.get(conversation.caseId) : null;
  if (legalCase && legalCase.ownerId !== account._id) legalCase = null;
  if (legalCase && conversation.caseTurnCount === conversation.turnCount) return { caseId: legalCase._id, summaryVersion: legalCase.summaryVersion, summary };
  if (!legalCase) {
    const title = boundedText(summaryText.slice(0, 80), "Title", 160);
    const caseId = await ctx.db.insert("cases", { ownerId: account._id, title, text, locale: conversation.locale, context: [], contextRevision: 0, state: "draft", summaryVersion: 1 });
    await ctx.db.insert("caseSummaries", { caseId, version: 1, summary, source, createdAt: now });
    await ctx.db.patch(conversation._id, { caseId, caseTurnCount: conversation.turnCount });
    return { caseId, summaryVersion: 1, summary };
  }
  if (legalCase.summaryVersion >= 100) fail("LIMIT_EXCEEDED", "This case has reached the summary version limit.");
  const version = legalCase.summaryVersion + 1;
  await ctx.db.insert("caseSummaries", { caseId: legalCase._id, version, summary, source, createdAt: now });
  await ctx.db.patch(legalCase._id, { text, summaryVersion: version, contextRevision: legalCase.contextRevision + 1 });
  await ctx.db.patch(conversation._id, { caseTurnCount: conversation.turnCount });
  return { caseId: legalCase._id, summaryVersion: version, summary };
}
