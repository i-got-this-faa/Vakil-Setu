import { describe, expect, test } from "bun:test";
import { parseServiceConfig } from "./config";

const goodKey = "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k";
const goodUrl = "https://quiet-otter-123.convex.cloud";

describe("parseServiceConfig", () => {
  test("accepts a publishable key and an https Convex URL", () => {
    expect(parseServiceConfig({ clerkPublishableKey: goodKey, convexUrl: goodUrl })).toEqual({
      kind: "configured",
      clerkPublishableKey: goodKey,
      convexUrl: goodUrl,
    });
  });

  test("trims surrounding whitespace before validating", () => {
    const result = parseServiceConfig({ clerkPublishableKey: ` ${goodKey}\n`, convexUrl: ` ${goodUrl} ` });
    expect(result.kind).toBe("configured");
  });

  test("reports every missing value by its public environment name", () => {
    expect(parseServiceConfig({ clerkPublishableKey: undefined, convexUrl: undefined })).toEqual({
      kind: "unconfigured",
      missing: ["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", "EXPO_PUBLIC_CONVEX_URL"],
    });
  });

  test("rejects a Clerk secret key so it can never ship inside the app", () => {
    const result = parseServiceConfig({ clerkPublishableKey: "sk_test_abc123", convexUrl: goodUrl });
    expect(result).toEqual({ kind: "unconfigured", missing: ["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"] });
  });

  test("rejects plain http, userinfo and paths in the Convex URL", () => {
    for (const url of ["http://localhost:3210", "https://user:pw@x.convex.cloud", "https://x.convex.cloud/api", ""]) {
      expect(parseServiceConfig({ clerkPublishableKey: goodKey, convexUrl: url })).toEqual({
        kind: "unconfigured",
        missing: ["EXPO_PUBLIC_CONVEX_URL"],
      });
    }
  });
});
