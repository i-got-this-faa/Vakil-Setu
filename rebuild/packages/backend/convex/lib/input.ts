import { LIMITS } from "@vakil/domain";
import type { Infer } from "convex/values";
import type { PaginationOptions } from "convex/server";
import type { summary, contextMessage } from "./validators";
import { fail } from "./access";

export function boundedText(value: string, label: string, max: number) {
  const text = value.trim();
  if (!text || text.length > max) fail("INVALID_INPUT", `${label} must contain 1–${max} characters.`);
  return text;
}
export function integer(value: number, label: string, min: number, max: number) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail("INVALID_INPUT", `${label} is outside its allowed range.`);
  return value;
}
export function page(options: PaginationOptions) {
  integer(options.numItems, "Page size", 1, LIMITS.pageSize);
  if (options.cursor && options.cursor.length > 8192) fail("INVALID_INPUT", "Cursor is too long.");
  return options;
}
export function cleanSummary(value: Infer<typeof summary>) {
  if (value.actions.length > LIMITS.actions) fail("INVALID_INPUT", "Too many summary actions.");
  return { ...value, text: boundedText(value.text, "Summary", LIMITS.summaryText), actions: value.actions.map((action) => boundedText(action, "Action", LIMITS.actionText)) };
}
export function cleanContext(messages: Infer<typeof contextMessage>[]) {
  if (messages.length > LIMITS.contextMessages) fail("INVALID_INPUT", "Too many context messages.");
  const context = messages.map((message) => ({ ...message, content: boundedText(message.content, "Context message", LIMITS.contextMessage) }));
  if (context.reduce((length, message) => length + message.content.length, 0) > LIMITS.contextTotal) fail("INVALID_INPUT", "Context exceeds the total character limit.");
  return context;
}
