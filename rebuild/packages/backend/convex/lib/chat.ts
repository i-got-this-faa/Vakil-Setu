import { v } from "convex/values";
import { CHAT_LIMITS } from "@vakil/domain";
import { fail } from "./access";
import type { Doc } from "../_generated/dataModel";

export const documentType = v.union(v.literal("application/pdf"), v.literal("image/jpeg"), v.literal("image/png"), v.literal("text/plain"));
export const chatResult = v.union(v.object({ kind: v.literal("pending") }), v.object({ kind: v.literal("reply"), text: v.string() }), v.object({ kind: v.literal("unavailable"), reason: v.string() }));
export const sendArgs = { caseId: v.id("cases"), message: v.string(), documentIds: v.array(v.id("caseDocuments")), requestId: v.string(), consent: v.literal(true), contextKey: v.string() };
export type SendResult = { kind: "available" } | { kind: "unavailable"; reason: string };

// Callers supply turns in chronological order; no private text enters the key.
export function chatContextKey(legalCase: Pick<Doc<"cases">, "summaryVersion" | "contextRevision">, turns: readonly Pick<Doc<"chatTurns">, "_id" | "result">[]): string {
  return `${legalCase.summaryVersion}:${legalCase.contextRevision}:${turns.map(turn => `${turn._id}:${turn.result.kind}`).join(",")}`;
}

export function validateDocument(content: ArrayBuffer, contentType: string) {
  const bytes = new Uint8Array(content);
  if (!bytes.length || bytes.length > CHAT_LIMITS.documentBytes) fail("INVALID_INPUT", "Document must be nonempty and at most 3 MiB.");
  const starts = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  let valid = false;
  if (contentType === "application/pdf") valid = starts([37, 80, 68, 70, 45]);
  if (contentType === "image/png") valid = starts([137, 80, 78, 71, 13, 10, 26, 10]);
  if (contentType === "image/jpeg") valid = starts([255, 216, 255]);
  if (contentType === "text/plain") {
    try { valid = !/[\x00-\x08\x0b\x0c\x0e-\x1f]/u.test(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { valid = false; }
  }
  if (!valid) fail("INVALID_INPUT", "Document bytes do not match the declared type or valid UTF-8 text.");
}
