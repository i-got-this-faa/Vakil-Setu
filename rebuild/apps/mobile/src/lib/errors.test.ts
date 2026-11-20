import { describe, expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import { GENERIC_REQUEST_FAILURE, authErrorCode, authErrorMessage, convexErrorMessage } from "./errors";

describe("convexErrorMessage", () => {
  test("shows the server message from a structured ConvexError", () => {
    const error = new ConvexError({ code: "CONFLICT", message: "Review the latest summary first." });
    expect(convexErrorMessage(error)).toBe("Review the latest summary first.");
  });

  test("hides internals for unknown or empty errors", () => {
    expect(convexErrorMessage(new Error("socket hang up"))).toBe(GENERIC_REQUEST_FAILURE);
    expect(convexErrorMessage(new ConvexError({ code: "X", message: "" }))).toBe(GENERIC_REQUEST_FAILURE);
    expect(convexErrorMessage("boom")).toBe(GENERIC_REQUEST_FAILURE);
  });
});

describe("authErrorMessage", () => {
  test("detects new accounts inside Clerk's generic error wrapper", () => {
    expect(authErrorCode({ code: "api_response_error", errors: [{ code: "form_identifier_not_found" }] })).toBe("form_identifier_not_found");
    expect(authErrorCode({ code: "form_identifier_not_found" })).toBe("form_identifier_not_found");
    expect(authErrorCode(null)).toBe("");
  });
  test("shows the single error returned by Clerk Core 3 methods", () => {
    expect(authErrorMessage({ code: "strategy_not_supported", longMessage: "Phone sign-in is disabled." })).toBe("Phone sign-in is disabled.");
    expect(authErrorMessage({ message: "SMS cannot be delivered to this country." })).toBe("SMS cannot be delivered to this country.");
  });
  test("prefers Clerk's longMessage from the first API error", () => {
    expect(authErrorMessage({ message: "API request failed", errors: [{ longMessage: "Incorrect password." }] })).toBe("Incorrect password.");
  });

  test("falls back to an Error message, then to the supplied fallback", () => {
    expect(authErrorMessage(new Error("Network down"))).toBe("Network down");
    expect(authErrorMessage(undefined, "Try again.")).toBe("Try again.");
    expect(authErrorMessage({ errors: [] }, "Try again.")).toBe("Try again.");
  });
});
