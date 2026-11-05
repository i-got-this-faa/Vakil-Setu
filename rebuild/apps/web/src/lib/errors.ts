import { ConvexError } from "convex/values";

export function errorMessage(error: unknown): string {
  // Convex application errors can be shown; network errors must not expose internals.
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    )
      return data.message;
  }
  return "This request could not be completed. Please try again. Nothing has been confirmed.";
}
