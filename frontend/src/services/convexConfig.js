export function parseConvexConfig(env) {
  const key = env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  const rawUrl = env.VITE_CONVEX_URL?.trim();
  if (!key || !/^pk_(test|live)_[A-Za-z0-9+/=]+$/.test(key)) return { kind: "unconfigured" };
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return { kind: "unconfigured" };
    return { kind: "configured", key, url: url.origin };
  } catch { return { kind: "unconfigured" }; }
}
export function serviceError(error) {
  return typeof error?.data?.message === "string" ? error.data.message : "Service request failed. Please retry; your saved records have not been replaced.";
}
export function bookingRequest({ slotId, caseId, summaryVersion, advocateId, consent, requestId }) {
  if (!slotId || !caseId || !advocateId || !Number.isInteger(summaryVersion) || summaryVersion < 1 || !consent || !requestId) throw new Error("Choose a real slot, review the saved summary and allow sharing with this advocate.");
  return { slotId, caseId, summaryVersion, idempotencyKey: requestId, consent: { recipientAdvocateId: advocateId, summaryVersion, granted: true } };
}
