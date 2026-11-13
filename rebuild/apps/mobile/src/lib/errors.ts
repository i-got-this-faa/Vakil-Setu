import { ConvexError } from "convex/values";

export const GENERIC_REQUEST_FAILURE =
  "This request could not be completed. Please try again. Nothing has been confirmed.";

/** Convex application errors carry a user-safe message; anything else stays generic. */
export function convexErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string" && data.message.length > 0) {
      return data.message;
    }
  }
  return GENERIC_REQUEST_FAILURE;
}

/**
 * Clerk reports API failures with `errors[]` (each with a `longMessage`).
 * Read them structurally so this module stays free of native imports.
 */
export function authErrorMessage(error: unknown, fallback = "Sign-in could not be completed. Check the details and try again."): string {
  if (typeof error === "object" && error !== null && "errors" in error && Array.isArray(error.errors)) {
    const first: unknown = error.errors[0];
    if (typeof first === "object" && first !== null) {
      if ("longMessage" in first && typeof first.longMessage === "string" && first.longMessage) return first.longMessage;
      if ("message" in first && typeof first.message === "string" && first.message) return first.message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
