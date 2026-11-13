import { expect, test } from "vitest";
import { parseConvexConfig, bookingRequest } from "../services/convexConfig";

test("only public Clerk keys and HTTPS origins can activate client services", () => {
  expect(parseConvexConfig({}).kind).toBe("unconfigured");
  for (const key of ["sk_test_secret", "", "not-a-key"]) expect(parseConvexConfig({ VITE_CLERK_PUBLISHABLE_KEY: key, VITE_CONVEX_URL: "https://test.convex.cloud" }).kind).toBe("unconfigured");
  for (const url of ["http://test.convex.cloud", "https://user:pass@test.convex.cloud", "https://test.convex.cloud/private", "https://test.convex.cloud?token=x"]) expect(parseConvexConfig({ VITE_CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZQ==", VITE_CONVEX_URL: url }).kind).toBe("unconfigured");
  expect(parseConvexConfig({ VITE_CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZQ==", VITE_CONVEX_URL: "https://test.convex.cloud" }).kind).toBe("configured");
});
test("booking payload binds real slot, exact summary and named recipient consent", () => {
  const input = { slotId: "slot", caseId: "case", summaryVersion: 3, advocateId: "advocate", consent: true, requestId: "stable-request" };
  expect(bookingRequest(input)).toEqual({ slotId: "slot", caseId: "case", summaryVersion: 3, idempotencyKey: "stable-request", consent: { recipientAdvocateId: "advocate", summaryVersion: 3, granted: true } });
  for (const change of [{ consent: false }, { slotId: "" }, { summaryVersion: 0 }]) expect(() => bookingRequest({ ...input, ...change })).toThrow();
});
