import { LIMITS } from "@legal-setu/domain";

export const TITLE_MAX_CHARS = 160;
export const ACTION_MAX_CHARS = 300;

export type IntakeProblem = "title_required" | "text_required" | "title_too_long" | "text_too_long";

/** Mirrors the server bounds for a new private intake. */
export function validateIntake(input: { title: string; text: string }): IntakeProblem | null {
  const title = input.title.trim();
  const text = input.text.trim();
  if (!title) return "title_required";
  if (title.length > TITLE_MAX_CHARS) return "title_too_long";
  if (!text) return "text_required";
  if (text.length > LIMITS.intakeText) return "text_too_long";
  return null;
}

export type SummaryProblem = "text_required" | "text_too_long" | "too_many_actions" | "action_too_long";

/** One action per line; blank lines are dropped before the server sees them. */
export function parseSummaryActions(raw: string): string[] {
  return raw.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}

export function validateSummary(input: { text: string; actions: readonly string[] }): SummaryProblem | null {
  const text = input.text.trim();
  if (!text) return "text_required";
  if (text.length > LIMITS.summaryText) return "text_too_long";
  if (input.actions.length > LIMITS.actions) return "too_many_actions";
  if (input.actions.some((action) => action.length > ACTION_MAX_CHARS)) return "action_too_long";
  return null;
}
