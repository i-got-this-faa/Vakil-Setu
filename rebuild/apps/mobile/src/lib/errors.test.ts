import { describe, expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import { GENERIC_REQUEST_FAILURE, authErrorMessage, convexErrorMessage } from "./errors";

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
  test("prefers Clerk's longMessage from the first API error", () => {
    expect(authErrorMessage({ errors: [{ longMessage: "Incorrect password." }] })).toBe("Incorrect password.");
  });

  test("falls back to an Error message, then to the supplied fallback", () => {
    expect(authErrorMessage(new Error("Network down"))).toBe("Network down");
    expect(authErrorMessage(undefined, "Try again.")).toBe("Try again.");
    expect(authErrorMessage({ errors: [] }, "Try again.")).toBe("Try again.");
  });
});
