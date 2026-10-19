import { v } from "convex/values";

export const locale = v.union(v.literal("en"), v.literal("hi"), v.literal("pa"));
export const domain = v.union(v.literal("criminal"), v.literal("civil"), v.literal("family"), v.literal("property"), v.literal("employment"), v.literal("consumer"), v.literal("other"), v.literal("unknown"));
export const urgency = v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("emergency"), v.literal("unknown"));
export const consultationMode = v.union(v.literal("phone"), v.literal("video"), v.literal("in_person"));
export const role = v.union(v.literal("user"), v.literal("advocate"), v.literal("admin"));
export const contextMessage = v.object({ role: v.union(v.literal("user"), v.literal("assistant")), content: v.string() });
export const summary = v.object({ locale, domain, urgency, text: v.string(), actions: v.array(v.string()) });
// Keep historical provider labels readable after switching new requests to Gemini.
export const aiProvider = v.union(v.literal("gateway"), v.literal("gemini"));
export const summarySource = v.union(v.object({ kind: v.literal("manual") }), v.object({ kind: v.literal("provider"), provider: aiProvider, model: v.string() }));
export const reviewDetails = { reviewerId: v.id("accounts"), reviewedAt: v.number(), reason: v.string() };
export const application = v.union(
  v.object({ kind: v.literal("pending") }),
  v.object({ kind: v.literal("approved"), ...reviewDetails }),
  v.object({ kind: v.literal("rejected"), ...reviewDetails }),
  v.object({ kind: v.literal("suspended"), ...reviewDetails }),
);
export const credentialType = v.union(v.literal("application/pdf"), v.literal("image/png"), v.literal("image/jpeg"));
export const credentialReview = v.union(v.object({ kind: v.literal("pending") }), v.object({ kind: v.literal("valid"), ...reviewDetails }), v.object({ kind: v.literal("rejected"), ...reviewDetails }));
export const bookingState = v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined"), v.literal("cancelled"), v.literal("completed"), v.literal("expired"));
export const bookingActor = v.union(
  v.object({ kind: v.literal("system") }),
  v.object({ kind: v.union(v.literal("user"), v.literal("advocate"), v.literal("admin")), accountId: v.id("accounts") }),
);
export const adminHandling = v.union(
  v.object({ kind: v.literal("pending"), reason: v.string(), flaggedAt: v.number() }),
  v.object({ kind: v.literal("resolved"), action: v.union(v.literal("retain"), v.literal("cancel")), reason: v.string(), adminId: v.id("accounts"), handledAt: v.number() }),
);
export const bookingEvent = v.union(
  v.object({ kind: v.literal("requested"), state: v.literal("pending") }),
  v.object({ kind: v.literal("state_changed"), from: bookingState, to: bookingState, reason: v.optional(v.string()) }),
  v.object({ kind: v.literal("affected"), reason: v.string() }),
  v.object({ kind: v.literal("admin_handled"), action: v.union(v.literal("retain"), v.literal("cancel")), reason: v.string() }),
);
export const consent = v.object({ recipientAdvocateId: v.id("advocates"), summaryVersion: v.number(), granted: v.literal(true) });
