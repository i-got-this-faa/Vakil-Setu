import { describe, expect, test } from "bun:test";
import { LIMITS } from "@legal-setu/domain";
import { parseSummaryActions, validateIntake, validateSummary } from "./drafts";

describe("validateIntake", () => {
  test("accepts a titled, non-empty intake within bounds", () => {
    expect(validateIntake({ title: " Deposit ", text: "Landlord kept it." })).toBeNull();
  });

  test("requires both title and text after trimming", () => {
    expect(validateIntake({ title: "   ", text: "x" })).toBe("title_required");
    expect(validateIntake({ title: "x", text: "  " })).toBe("text_required");
  });

  test("enforces the server text limit", () => {
    expect(validateIntake({ title: "x", text: "a".repeat(LIMITS.intakeText) })).toBeNull();
    expect(validateIntake({ title: "x", text: "a".repeat(LIMITS.intakeText + 1) })).toBe("text_too_long");
    expect(validateIntake({ title: "t".repeat(161), text: "x" })).toBe("title_too_long");
  });
});

describe("parseSummaryActions", () => {
  test("splits lines, trims them and drops blanks", () => {
    expect(parseSummaryActions("  Gather receipts \n\n\nCall the landlord  ")).toEqual(["Gather receipts", "Call the landlord"]);
  });
});

describe("validateSummary", () => {
  test("enforces the summary and action bounds", () => {
    expect(validateSummary({ text: "Short", actions: [] })).toBeNull();
    expect(validateSummary({ text: " ", actions: [] })).toBe("text_required");
    expect(validateSummary({ text: "a".repeat(LIMITS.summaryText + 1), actions: [] })).toBe("text_too_long");
    expect(validateSummary({ text: "ok", actions: Array.from({ length: LIMITS.actions + 1 }, () => "x") })).toBe("too_many_actions");
    expect(validateSummary({ text: "ok", actions: ["a".repeat(301)] })).toBe("action_too_long");
  });
});
