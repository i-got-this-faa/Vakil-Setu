import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { LIMITS } from "@vakil/domain";

const modules = import.meta.glob("../convex/**/*.ts");
const paginationOpts = { numItems: 50, cursor: null };
const manualSummary = { locale: "en", domain: "property", urgency: "medium", text: "A disputed property transfer needs document review.", actions: ["Bring the relevant documents."] } as const;
const profile = { displayName: "Pilot Advocate", city: "Jammu", bio: "Property and family consultation.", barRegistration: "TEST-PILOT-001", yearsExperience: 7, domains: ["property", "family"], locales: ["en", "hi", "pa"], consultationModes: ["phone", "video"] } as const;
const pdf = new TextEncoder().encode("%PDF-1.7\nTest-only credential content.\n%%EOF").buffer;
const now = Date.UTC(2026, 9, 14, 9);

function setup() {
  const t = convexTest(schema, modules);
  return { t, user: t.withIdentity({ subject: "clerk-user" }), advocate: t.withIdentity({ subject: "clerk-advocate" }), admin: t.withIdentity({ subject: "clerk-admin" }), stranger: t.withIdentity({ subject: "clerk-stranger" }) };
}
async function fixture() {
  const clients = setup();
  const { t, user, advocate, admin, stranger } = clients;
  const userId = await user.mutation(api.accounts.ensure, { role: "user", displayName: "Case owner", locale: "en" });
  await stranger.mutation(api.accounts.ensure, { role: "user", displayName: "Other owner", locale: "en" });
  await t.mutation(internal.accounts.bootstrapAdmin, { clerkSubject: "clerk-admin", displayName: "Test administrator", locale: "en" });
  const advocateAccountId = await advocate.mutation(api.accounts.ensure, { role: "advocate", displayName: profile.displayName, locale: "en" });
  const advocateId = await advocate.mutation(api.advocates.upsert, { ...profile, domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes] });
  const credentialId = await advocate.action(api.credentials.upload, { content: pdf, contentType: "application/pdf", fileName: "test-registration.pdf" });
  await admin.mutation(api.credentials.review, { credentialId, decision: "valid", reason: "Test fixture credential reviewed." });
  await admin.mutation(api.admin.review, { advocateId, revision: 1, decision: "approve", reason: "Test fixture approved." });
  const caseId = await user.mutation(api.cases.create, { title: "Property intake", text: "A property transfer is disputed.", context: [], locale: "en" });
  await user.mutation(api.cases.updateSummary, { caseId, expectedVersion: 0, summary: { ...manualSummary, actions: [...manualSummary.actions] } });
  const [slotId] = await advocate.mutation(api.slots.publish, { slots: [{ start: now + 4 * LIMITS.hourMs, durationMinutes: 30, consultationMode: "video" }] });
  if (!slotId) throw new Error("Fixture did not publish its slot.");
  const request = { slotId, caseId, summaryVersion: 1, idempotencyKey: "request-1", consent: { recipientAdvocateId: advocateId, summaryVersion: 1, granted: true } } as const;
  return { ...clients, userId, advocateAccountId, advocateId, credentialId, caseId, slotId, request };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("administrative reachability and ranked discovery", () => {
  it("rejects oversized discovery cohorts instead of silently returning partial matches", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      const reviewer = await ctx.db.query("accounts").withIndex("by_subject", (q) => q.eq("clerkSubject", "clerk-admin")).unique();
      if (!reviewer) throw new Error("Test reviewer missing.");
      for (let index = 0; index < LIMITS.discoveryCandidates; index++) {
        const accountId = await ctx.db.insert("accounts", { clerkSubject: `cohort-fixture-${index}`, displayName: `Test advocate ${index}`, role: "advocate", locale: "en", disabled: false });
        await ctx.db.insert("advocates", { ...profile, domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes], accountId, city: "Test City", cityKey: "test city", revision: 1, application: { kind: "approved", reviewerId: reviewer._id, reviewedAt: now, reason: "Synthetic cohort fixture only." } });
      }
    });
    await expect(f.t.query(api.advocates.listPublic, { paginationOpts })).rejects.toMatchObject({ data: { code: "LIMIT_EXCEEDED" } });
    expect((await f.t.query(api.advocates.listPublic, { city: "Jammu", paginationOpts })).page.map((entry) => entry._id)).toEqual([f.advocateId]);
  });

  it("lists approved/suspended profiles and redacted accounts only for active administrators", async () => {
    const f = await fixture();
    expect((await f.admin.query(api.admin.queue, { paginationOpts, status: "approved" })).page.map((entry) => entry.advocate._id)).toEqual([f.advocateId]);
    await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "suspend", reason: "Test suspension." });
    expect((await f.admin.query(api.admin.queue, { paginationOpts, status: "suspended" })).page[0]?.advocate._id).toBe(f.advocateId);
    await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "approve", reason: "Explicit reapproval." });
    const rows = (await f.admin.query(api.admin.accounts, { paginationOpts })).page;
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => !("clerkSubject" in row) && !("text" in row))).toBe(true);
    await expect(f.user.query(api.admin.accounts, { paginationOpts })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await expect(f.stranger.query(api.admin.queue, { paginationOpts, status: "approved" })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await f.admin.mutation(api.admin.setDisabled, { accountId: f.userId, disabled: true, reason: "Test status change." });
    expect((await f.admin.query(api.admin.accounts, { paginationOpts })).page.find((row) => row._id === f.userId)?.disabled).toBe(true);
    await f.admin.mutation(api.admin.setDisabled, { accountId: f.userId, disabled: false, reason: "Test reactivation." });
    expect(await f.user.query(api.accounts.me, {})).toMatchObject({ disabled: false });
  });

  it("keeps accepted appointments immutable to participant cancellation once they start", async () => {
    const f = await fixture();
    const bookingId = await f.user.mutation(api.bookings.request, f.request);
    await f.advocate.mutation(api.bookings.transition, { bookingId, action: "accept" });
    vi.setSystemTime(now + 4 * LIMITS.hourMs);
    await expect(f.user.mutation(api.bookings.transition, { bookingId, action: "cancel" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await expect(f.advocate.mutation(api.bookings.transition, { bookingId, action: "cancel", reason: "Too late." })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    expect((await f.t.run((ctx) => ctx.db.get(bookingId)))?.state).toBe("accepted");
    vi.setSystemTime(now + 5 * LIMITS.hourMs);
    await f.advocate.mutation(api.bookings.transition, { bookingId, action: "complete" });
    expect((await f.t.run((ctx) => ctx.db.get(bookingId)))?.state).toBe("completed");
  });

  it("filters before paging, ranks earliest slots across cities, and never weakens a language", async () => {
    const f = await fixture();
    async function addAdvocate(subject: string, city: string, locales: ("en" | "pa")[], start: number) {
      const client = f.t.withIdentity({ subject });
      await client.mutation(api.accounts.ensure, { role: "advocate", displayName: city, locale: "en" });
      const id = await client.mutation(api.advocates.upsert, { ...profile, displayName: city, city, locales, domains: [...profile.domains], consultationModes: [...profile.consultationModes] });
      const credential = await client.action(api.credentials.upload, { content: pdf, contentType: "application/pdf", fileName: "test.pdf" });
      await f.admin.mutation(api.credentials.review, { credentialId: credential, decision: "valid", reason: "Test credential." });
      await f.admin.mutation(api.admin.review, { advocateId: id, revision: 1, decision: "approve", reason: "Test approval." });
      await client.mutation(api.slots.publish, { slots: [{ start, durationMinutes: 30, consultationMode: "video" }] });
      return id;
    }
    await addAdvocate("english-only", "A City", ["en"], now + LIMITS.hourMs);
    const earliest = await addAdvocate("punjabi-earliest", "Z City", ["pa"], now + 2 * LIMITS.hourMs);
    const first = await f.t.query(api.advocates.listPublic, { domain: "property", locale: "pa", paginationOpts: { numItems: 1, cursor: null } });
    expect(first.page.map((entry) => entry._id)).toEqual([earliest]);
    expect(first.isDone).toBe(false);
    const second = await f.t.query(api.advocates.listPublic, { domain: "property", locale: "pa", paginationOpts: { numItems: 1, cursor: first.continueCursor } });
    expect(second.page.map((entry) => entry._id)).toEqual([f.advocateId]);
    expect(second.isDone).toBe(true);
    expect((await f.t.query(api.advocates.listPublic, { locale: "hi", city: "Z City", paginationOpts })).page).toEqual([]);
    await expect(f.t.query(api.advocates.listPublic, { locale: "hi", paginationOpts: { numItems: 1, cursor: first.continueCursor } })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(f.t.query(api.advocates.listPublic, { paginationOpts: { numItems: 1, cursor: "{}" } })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
  });
});

function configureTestProvider() {
  vi.stubEnv("LLM_API_KEY", "test-only-noncredential");
  vi.stubEnv("LLM_PROVIDER", "gateway");
  vi.stubEnv("LLM_API_URL", "https://provider.example.test/chat");
  vi.stubEnv("LLM_MODEL", "test-model");
  vi.stubEnv("LLM_API_KEY_HEADER", "Authorization");
  vi.stubEnv("LLM_API_KEY_PREFIX", "Bearer");
}

describe("direct route resolution", () => {
  it("normalizes bounded routes, hides private/nonapproved targets, and preserves existing read contracts", async () => {
    const f = await fixture();
    for (const routeId of ["", "invalid-id", "x".repeat(129), f.userId]) {
      expect(await f.t.query(api.advocates.resolvePublic, { routeId })).toBeNull();
      expect(await f.user.query(api.cases.resolveMine, { routeId })).toBeNull();
    }
    expect(await f.t.query(api.advocates.resolvePublic, { routeId: f.caseId })).toBeNull();
    expect(await f.user.query(api.cases.resolveMine, { routeId: f.advocateId })).toBeNull();
    expect(await f.stranger.query(api.cases.resolveMine, { routeId: f.caseId })).toBeNull();
    await expect(f.t.query(api.cases.resolveMine, { routeId: f.caseId })).rejects.toMatchObject({ data: { code: "UNAUTHENTICATED" } });
    await expect(f.admin.query(api.cases.resolveMine, { routeId: f.caseId })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    expect(await f.user.query(api.cases.resolveMine, { routeId: f.caseId })).toBe(f.caseId);
    expect((await f.user.query(api.cases.getMine, { caseId: f.caseId })).case._id).toBe(f.caseId);
    expect(await f.t.query(api.advocates.resolvePublic, { routeId: f.advocateId })).toBe(f.advocateId);
    expect((await f.t.query(api.advocates.getPublic, { advocateId: f.advocateId }))?._id).toBe(f.advocateId);
    await f.advocate.mutation(api.advocates.upsert, { ...profile, domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes] });
    expect(await f.t.query(api.advocates.resolvePublic, { routeId: f.advocateId })).toBeNull();
    await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 2, decision: "approve", reason: "Explicit approval." });
    await f.admin.mutation(api.admin.setDisabled, { accountId: f.advocateAccountId, disabled: true, reason: "Disabled profile hidden." });
    expect(await f.t.query(api.advocates.resolvePublic, { routeId: f.advocateId })).toBeNull();
    await f.user.mutation(api.cases.deleteDraft, { caseId: f.caseId });
    expect(await f.user.query(api.cases.resolveMine, { routeId: f.caseId })).toBeNull();
    await f.admin.mutation(api.admin.setDisabled, { accountId: f.userId, disabled: true, reason: "Disabled case reader." });
    await expect(f.user.query(api.cases.resolveMine, { routeId: f.caseId })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
  });
  it("resolves old case/profile links beyond the first page without listing all records", async () => {
    const f = await fixture();
    await f.advocate.mutation(api.slots.remove, { slotId: f.slotId });
    const admin = await f.admin.query(api.accounts.me, {});
    if (!admin) throw new Error("Test administrator missing.");
    for (let index = 0; index < 60; index++) {
      vi.setSystemTime(now + index + 1);
      await f.user.mutation(api.cases.create, { title: `Recent case ${index}`, text: "Synthetic recent intake.", locale: "en", context: [] });
      await f.t.run(async (ctx) => {
        const accountId = await ctx.db.insert("accounts", { clerkSubject: `route-fixture-${index}`, displayName: `A fixture ${index}`, role: "advocate", locale: "en", disabled: false });
        await ctx.db.insert("advocates", { ...profile, displayName: `A fixture ${index}`, domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes], accountId, cityKey: "jammu", revision: 1, application: { kind: "approved", reviewerId: admin._id, reviewedAt: Date.now(), reason: "Synthetic approved route fixture." } });
      });
    }
    const casePage = await f.user.query(api.cases.listMine, { paginationOpts });
    const profilePage = await f.t.query(api.advocates.listPublic, { paginationOpts });
    expect(casePage.page.map((entry) => entry._id)).not.toContain(f.caseId);
    expect(profilePage.page.map((entry) => entry._id)).not.toContain(f.advocateId);
    expect(casePage.isDone).toBe(false);
    expect(profilePage.isDone).toBe(false);
    expect(await f.user.query(api.cases.resolveMine, { routeId: f.caseId })).toBe(f.caseId);
    expect(await f.t.query(api.advocates.resolvePublic, { routeId: f.advocateId })).toBe(f.advocateId);
  });
});
function providerResponse(locale: "en" | "hi" | "pa", urgency: "unknown" | "emergency" = "unknown") {
  return Response.json({ choices: [{ message: { content: JSON.stringify({ sourceMode: "provider", provider: "gateway", locale, domain: "unknown", urgency, summary: "Test-only preliminary summary.", actions: [] }) } }] });
}

describe("provider boundary and follow-up persistence", () => {
  it("requires explicit consent before any configured dispatch or consent audit", async () => {
    const f = await fixture();
    configureTestProvider();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const args = { caseId: f.caseId, expectedVersion: 1, expectedContextRevision: 0 };
    // @ts-expect-error Deliberately exercise missing consent at the action boundary.
    await expect(f.user.action(api.triage.analyze, args)).rejects.toThrow();
    // @ts-expect-error Deliberately exercise refused consent at the action boundary.
    await expect(f.user.action(api.triage.analyze, { ...args, consent: false })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
    expect(await f.t.run((ctx) => ctx.db.query("aiConsents").collect())).toEqual([]);
    expect(await f.t.run((ctx) => ctx.db.query("aiAttempts").collect())).toEqual([]);
  });
  it("audits only server-derived consent metadata immediately before configured dispatch", async () => {
    const f = await fixture();
    configureTestProvider();
    vi.stubEnv("LLM_API_URL", "https://provider.example.test/private/chat?key=test-query-secret");
    await f.user.mutation(api.cases.appendFollowUp, { caseId: f.caseId, expectedVersion: 1, expectedContextRevision: 0, reviewed: true, text: "Private reviewed follow-up." });
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe("https://provider.example.test/private/chat?key=test-query-secret");
      expect(init).toMatchObject({ method: "POST", redirect: "error", headers: { Authorization: "Bearer test-only-noncredential", "Content-Type": "application/json" } });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const rows = await f.t.run((ctx) => ctx.db.query("aiConsents").collect());
      expect(rows).toHaveLength(1);
      const row = rows[0];
      if (!row) throw new Error("Missing consent audit before dispatch.");
      const { _id, _creationTime, ...metadata } = row;
      expect(metadata).toEqual({ caseId: f.caseId, ownerId: f.userId, summaryVersion: 1, contextRevision: 1, at: now, provider: "gateway", recipientOrigin: "https://provider.example.test" });
      const serialized = JSON.stringify(rows);
      for (const privateValue of ["test-only-noncredential", "test-query-secret", "/private/chat", "Private reviewed follow-up.", "A property transfer is disputed.", profile.barRegistration, "Test-only credential content"]) expect(serialized).not.toContain(privateValue);
      if (typeof init?.body !== "string") throw new Error("Expected JSON provider request.");
      expect(init.body).toContain("Private reviewed follow-up.");
      expect(init.body).not.toContain('"consent"');
      return providerResponse("en");
    });
    vi.stubGlobal("fetch", fetch);
    expect(await f.user.action(api.triage.analyze, { caseId: f.caseId, expectedVersion: 1, expectedContextRevision: 1, consent: true })).toMatchObject({ kind: "available" });
    expect(fetch).toHaveBeenCalledOnce();
    expect((await f.user.query(api.cases.getMine, { caseId: f.caseId })).case.summaryVersion).toBe(2);
  });
  it("rejects unauthorized, stale and disabled consent in the final mutation without auditing", async () => {
    const f = await fixture();
    configureTestProvider();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const args = { caseId: f.caseId, expectedVersion: 1, expectedContextRevision: 0, consent: true } as const;
    await expect(f.stranger.action(api.triage.analyze, args)).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(f.user.action(api.triage.analyze, { ...args, expectedVersion: 0 })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await expect(f.user.action(api.triage.analyze, { ...args, expectedContextRevision: 1 })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    const auditArgs = { caseId: f.caseId, expectedVersion: 1, expectedContextRevision: 0, recipientOrigin: "https://provider.example.test" };
    await expect(f.stranger.mutation(internal.triageRate.recordConsent, auditArgs)).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(f.admin.mutation(internal.triageRate.recordConsent, auditArgs)).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await f.user.mutation(api.cases.appendFollowUp, { caseId: f.caseId, expectedVersion: 1, expectedContextRevision: 0, reviewed: true, text: "Context changed after initial authorization." });
    await expect(f.user.mutation(internal.triageRate.recordConsent, auditArgs)).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await f.user.mutation(api.cases.updateSummary, { caseId: f.caseId, expectedVersion: 1, summary: { ...manualSummary, actions: [] } });
    await expect(f.user.mutation(internal.triageRate.recordConsent, { ...auditArgs, expectedContextRevision: 1 })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await f.admin.mutation(api.admin.setDisabled, { accountId: f.userId, disabled: true, reason: "Disabled before outbound dispatch." });
    await expect(f.user.mutation(internal.triageRate.recordConsent, { ...auditArgs, expectedVersion: 2, expectedContextRevision: 1 })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    expect(fetch).not.toHaveBeenCalled();
    expect(await f.t.run((ctx) => ctx.db.query("aiConsents").collect())).toEqual([]);
  });
  it.each(["unknown", "emergency"] as const)("sends authorized recent context and preserves %s and the selected locale", async (urgency) => {
    const f = await fixture();
    configureTestProvider();
    const caseId = await f.user.mutation(api.cases.create, { title: "हिंदी मामला", text: "दस्तावेज़ की समीक्षा चाहिए।", locale: "hi", context: [] });
    await f.user.mutation(api.cases.appendFollowUp, { caseId, expectedVersion: 0, expectedContextRevision: 0, reviewed: true, text: "नई जानकारी की समीक्षा की है।" });
    const bodies: string[] = [];
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof init?.body !== "string") throw new Error("Expected JSON provider request.");
      bodies.push(init.body);
      return providerResponse("hi", urgency);
    });
    vi.stubGlobal("fetch", fetch);
    const result = await f.user.action(api.triage.analyze, { caseId, expectedVersion: 0, expectedContextRevision: 1, consent: true });
    expect(result).toMatchObject({ kind: "available", sourceMode: "provider" });
    expect(fetch).toHaveBeenCalledOnce();
    expect(bodies[0]).toContain("नई जानकारी की समीक्षा की है।");
    expect(bodies[0]).not.toContain(profile.barRegistration);
    expect(bodies[0]).not.toContain("Test-only credential content");
    expect(bodies[0]).not.toContain("A property transfer is disputed");
    expect((await f.user.query(api.cases.getMine, { caseId })).summaries[0]).toMatchObject({ summary: { locale: "hi", domain: "unknown", urgency }, source: { kind: "provider", provider: "gateway", model: "test-model" } });
  });
  it.each(["follow_up", "disabled", "summary_edit"] as const)("does not persist an in-flight response after %s changes", async (change) => {
    const f = await fixture();
    configureTestProvider();
    vi.stubGlobal("fetch", vi.fn(async () => {
      if (change === "follow_up") await f.user.mutation(api.cases.appendFollowUp, { caseId: f.caseId, expectedVersion: 1, expectedContextRevision: 0, reviewed: true, text: "New reviewed facts." });
      if (change === "disabled") await f.admin.mutation(api.admin.setDisabled, { accountId: f.userId, disabled: true, reason: "Disabled during provider call" });
      if (change === "summary_edit") await f.user.mutation(api.cases.updateSummary, { caseId: f.caseId, expectedVersion: 1, summary: { ...manualSummary, text: "Concurrent manual revision", actions: [] } });
      return providerResponse("en");
    }));
    await expect(f.user.action(api.triage.analyze, { caseId: f.caseId, expectedVersion: 1, expectedContextRevision: 0, consent: true })).rejects.toMatchObject({ data: { code: change === "disabled" ? "ACCOUNT_DISABLED" : "CONFLICT" } });
    expect(await f.t.run((ctx) => ctx.db.query("caseSummaries").filter((q) => q.eq(q.field("source.kind"), "provider")).collect())).toEqual([]);
  });
  it("rejects foreign and stale context before fetch and exposes unavailable/rate-limited states", async () => {
    const f = await fixture();
    vi.stubEnv("LLM_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const args = { caseId: f.caseId, expectedVersion: 1, expectedContextRevision: 0, consent: true } as const;
    await expect(f.stranger.action(api.triage.analyze, args)).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(f.user.action(api.triage.analyze, { ...args, expectedContextRevision: 1 })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    for (let index = 0; index < LIMITS.aiAttemptsPerHour; index++) expect(await f.user.action(api.triage.analyze, args)).toEqual({ kind: "unavailable", reason: "not_configured" });
    await expect(f.user.action(api.triage.analyze, args)).rejects.toMatchObject({ data: { code: "RATE_LIMITED" } });
    expect(fetch).not.toHaveBeenCalled();
    expect(await f.t.run((ctx) => ctx.db.query("aiConsents").collect())).toEqual([]);
    expect((await f.user.query(api.cases.getMine, { caseId: f.caseId })).summaries).toHaveLength(1);
  });
  it("rejects malformed/wrong-language output and reports failed external calls without saving", async () => {
    const f = await fixture();
    configureTestProvider();
    const fetch = vi.fn()
      .mockResolvedValueOnce(providerResponse("pa"))
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "invalid JSON" } }] }))
      .mockResolvedValueOnce(new Response("provider error", { status: 503 }))
      .mockRejectedValueOnce(new Error("Test-only timeout"));
    vi.stubGlobal("fetch", fetch);
    const args = { caseId: f.caseId, expectedVersion: 1, expectedContextRevision: 0, consent: true } as const;
    expect(await f.user.action(api.triage.analyze, args)).toEqual({ kind: "unavailable", reason: "invalid_result" });
    expect(await f.user.action(api.triage.analyze, args)).toEqual({ kind: "unavailable", reason: "provider_failed" });
    expect(await f.user.action(api.triage.analyze, args)).toEqual({ kind: "unavailable", reason: "provider_failed" });
    expect(await f.user.action(api.triage.analyze, args)).toEqual({ kind: "unavailable", reason: "provider_failed" });
    expect((await f.user.query(api.cases.getMine, { caseId: f.caseId })).summaries).toHaveLength(1);
  });
});

describe("identity, onboarding, private credential review", () => {
  it("audits successful owner/admin credential reads with no bytes, names or storage URLs", async () => {
    const f = await fixture();
    const admin = await f.admin.query(api.accounts.me, {});
    if (!admin) throw new Error("Test administrator missing.");
    expect((await f.advocate.action(api.credentials.read, { credentialId: f.credentialId })).content).toEqual(pdf);
    expect((await f.admin.action(api.credentials.read, { credentialId: f.credentialId })).content).toEqual(pdf);
    const rows = await f.t.run((ctx) => ctx.db.query("credentialReads").collect());
    expect(rows.map(({ _id, _creationTime, ...metadata }) => metadata)).toEqual([
      { credentialId: f.credentialId, readerId: f.advocateAccountId, role: "advocate", at: now },
      { credentialId: f.credentialId, readerId: admin._id, role: "admin", at: now },
    ]);
    await expect(f.user.action(api.credentials.read, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(f.t.action(api.credentials.read, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "UNAUTHENTICATED" } });
    await expect(f.stranger.mutation(internal.credentials.auditRead, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await f.t.run(async (ctx) => {
      const credential = await ctx.db.get(f.credentialId);
      if (!credential) throw new Error("Test credential missing.");
      await ctx.storage.delete(credential.storageId);
    });
    await expect(f.admin.action(api.credentials.read, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await f.admin.mutation(api.admin.setDisabled, { accountId: f.advocateAccountId, disabled: true, reason: "Reader disabled." });
    await expect(f.advocate.action(api.credentials.read, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    await expect(f.advocate.mutation(internal.credentials.auditRead, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    await f.t.run((ctx) => ctx.db.patch(admin._id, { disabled: true }));
    await expect(f.admin.action(api.credentials.read, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    expect(await f.t.run((ctx) => ctx.db.query("credentialReads").collect())).toEqual(rows);
  });
  it("rechecks credential read permission after arrayBuffer resolves and does not audit denied bytes", async () => {
    const f = await fixture();
    const arrayBuffer = vi.spyOn(Blob.prototype, "arrayBuffer").mockImplementationOnce(async () => {
      await f.admin.mutation(api.admin.setDisabled, { accountId: f.advocateAccountId, disabled: true, reason: "Disabled while obtaining credential bytes." });
      return pdf;
    });
    try {
      await expect(f.advocate.action(api.credentials.read, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
      expect(arrayBuffer).toHaveBeenCalledOnce();
      expect(await f.t.run((ctx) => ctx.db.query("credentialReads").collect())).toEqual([]);
    } finally { arrayBuffer.mockRestore(); }
  });
  it("bounds concurrent uploads atomically and removes the losing upload's storage blob", async () => {
    const f = await fixture();
    for (let index = 0; index < 3; index++) await f.advocate.action(api.credentials.upload, { content: pdf, contentType: "application/pdf", fileName: `fixture-${index}.pdf` });
    const uploads = await Promise.allSettled([1, 2].map((index) => f.advocate.action(api.credentials.upload, { content: pdf, contentType: "application/pdf", fileName: `race-${index}.pdf` })));
    expect(uploads.filter((upload) => upload.status === "fulfilled")).toHaveLength(1);
    expect(uploads.find((upload) => upload.status === "rejected")).toMatchObject({ reason: { data: { code: "LIMIT_EXCEEDED" } } });
    expect(await f.advocate.query(api.credentials.mine, {})).toHaveLength(LIMITS.credentialsPerAdvocate);
    expect(await f.t.run((ctx) => ctx.db.system.query("_storage").collect())).toHaveLength(LIMITS.credentialsPerAdvocate);
    await expect(f.advocate.action(api.credentials.upload, { content: pdf, contentType: "application/pdf", fileName: "over-limit.pdf" })).rejects.toMatchObject({ data: { code: "LIMIT_EXCEEDED" } });
  });
  it("protects credential review/removal, deletes bytes, and rechecks disabled readers", async () => {
    const f = await fixture();
    const other = f.t.withIdentity({ subject: "other-advocate" });
    await other.mutation(api.accounts.ensure, { role: "advocate", displayName: "Other advocate", locale: "hi" });
    await other.mutation(api.advocates.upsert, { ...profile, domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes] });
    await expect(other.mutation(api.credentials.remove, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(other.action(api.credentials.read, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(f.advocate.mutation(api.credentials.review, { credentialId: f.credentialId, decision: "valid", reason: "Self review." })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).buffer;
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]).buffer;
    for (const [contentType, content] of [["image/png", png], ["image/jpeg", jpeg]] as const) {
      const id = await f.advocate.action(api.credentials.upload, { contentType, content, fileName: "fixture-image" });
      expect((await f.admin.action(api.credentials.read, { credentialId: id })).content).toEqual(content);
      await f.advocate.mutation(api.credentials.remove, { credentialId: id });
    }
    await f.admin.mutation(api.admin.setDisabled, { accountId: f.advocateAccountId, disabled: true, reason: "Test disable." });
    await expect(f.advocate.action(api.credentials.read, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    expect((await f.admin.action(api.credentials.read, { credentialId: f.credentialId })).content).toEqual(pdf);
    await f.admin.mutation(api.admin.setDisabled, { accountId: f.advocateAccountId, disabled: false, reason: "Test reactivate." });
    await f.advocate.mutation(api.credentials.remove, { credentialId: f.credentialId });
    expect(await f.t.run((ctx) => ctx.db.system.query("_storage").collect())).toEqual([]);
    await expect(f.admin.action(api.credentials.read, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
  });
  it("derives roles from stored Clerk subject and never bootstraps admin publicly", async () => {
    const { t, user } = setup();
    expect(await t.query(api.accounts.me, {})).toBeNull();
    await expect(t.mutation(api.accounts.ensure, { role: "user", displayName: "Owner", locale: "en" })).rejects.toMatchObject({ data: { code: "UNAUTHENTICATED" } });
    const first = await user.mutation(api.accounts.ensure, { role: "user", displayName: "Owner", locale: "en" });
    expect(await user.mutation(api.accounts.ensure, { role: "user", displayName: "Owner", locale: "en" })).toBe(first);
    await expect(user.mutation(api.accounts.ensure, { role: "advocate", displayName: "Owner", locale: "en" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await expect(user.query(api.admin.queue, { paginationOpts })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await expect(t.mutation(internal.accounts.bootstrapAdmin, { clerkSubject: "clerk-user", displayName: "Owner", locale: "en" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
  });
  it("checks credential bytes, declared type and 5 MiB before private storage", async () => {
    const f = await fixture();
    await expect(f.advocate.action(api.credentials.upload, { content: pdf, contentType: "image/png", fileName: "false.png" })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(f.advocate.action(api.credentials.upload, { content: new ArrayBuffer(LIMITS.credentialBytes + 1), contentType: "application/pdf", fileName: "too-big.pdf" })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(f.advocate.action(api.credentials.upload, { content: pdf, contentType: "application/pdf", fileName: "../bad.pdf" })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    const metadata = await f.advocate.query(api.credentials.mine, {});
    expect(metadata).toHaveLength(1);
    expect(metadata[0]).not.toHaveProperty("storageId");
    expect((await f.admin.action(api.credentials.read, { credentialId: f.credentialId })).content).toEqual(pdf);
    expect((await f.advocate.action(api.credentials.read, { credentialId: f.credentialId })).content).toEqual(pdf);
    await expect(f.user.action(api.credentials.read, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(f.t.action(api.credentials.read, { credentialId: f.credentialId })).rejects.toMatchObject({ data: { code: "UNAUTHENTICATED" } });
  });
  it("requires credential review before approval and rejects stale review revisions", async () => {
    const f = await fixture();
    await f.advocate.mutation(api.advocates.upsert, { ...profile, domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes], bio: "Updated application." });
    await expect(f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "approve", reason: "Stale review." })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await f.admin.mutation(api.credentials.review, { credentialId: f.credentialId, decision: "rejected", reason: "Registration not accepted." });
    await expect(f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 2, decision: "approve", reason: "No valid credential." })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
  });
  it("excludes suspended and disabled advocates while preserving accepted consultations", async () => {
    const f = await fixture();
    const id = await f.user.mutation(api.bookings.request, f.request);
    await f.advocate.mutation(api.bookings.transition, { bookingId: id, action: "accept" });
    await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "suspend", reason: "Approval suspended." });
    expect(await f.t.query(api.advocates.getPublic, { advocateId: f.advocateId })).toBeNull();
    expect(await f.t.query(api.slots.listPublic, { advocateId: f.advocateId })).toEqual([]);
    expect((await f.user.query(api.bookings.mine, { paginationOpts })).page[0]).toMatchObject({ state: "accepted", adminHandling: { kind: "pending" } });
    expect((await f.t.run((ctx) => ctx.db.get(f.slotId)))?.reservation).toEqual({ kind: "reserved", bookingId: id });
    await expect(f.advocate.mutation(api.slots.publish, { slots: [{ start: now + 6 * LIMITS.hourMs, durationMinutes: 30, consultationMode: "video" }] })).rejects.toMatchObject({ data: { code: "NOT_APPROVED" } });
    await f.advocate.mutation(api.advocates.upsert, { ...profile, domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes] });
    expect((await f.advocate.query(api.advocates.myProfile, {}))?.application.kind).toBe("suspended");
    await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 2, decision: "approve", reason: "Explicitly reapproved." });
    expect(await f.t.query(api.advocates.getPublic, { advocateId: f.advocateId })).not.toBeNull();
    await f.admin.mutation(api.admin.setDisabled, { accountId: f.advocateAccountId, disabled: true, reason: "Disabled account." });
    expect((await f.t.query(api.advocates.listPublic, { paginationOpts })).page).toEqual([]);
    await expect(f.advocate.query(api.credentials.mine, {})).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    await f.admin.mutation(api.admin.setDisabled, { accountId: f.advocateAccountId, disabled: false, reason: "Reactivated account." });
    expect(await f.t.query(api.advocates.getPublic, { advocateId: f.advocateId })).toBeNull();
  });
});

describe("private cases and consent snapshots", () => {
  it("authorizes reviewed follow-ups, preserves Unicode locale, and keeps only bounded recent context", async () => {
    const f = await fixture();
    const caseId = await f.user.mutation(api.cases.create, { title: "ਪੰਜਾਬੀ ਮਾਮਲਾ", text: "ਮੈਨੂੰ ਦਸਤਾਵੇਜ਼ ਦੀ ਸਮੀਖਿਆ ਚਾਹੀਦੀ ਹੈ।", locale: "pa", context: [] });
    const followUp = { caseId, expectedVersion: 0, expectedContextRevision: 0, text: "ਨਵੀਂ ਜਾਣਕਾਰੀ", reviewed: true } as const;
    await expect(f.stranger.mutation(api.cases.appendFollowUp, followUp)).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(f.admin.mutation(api.cases.appendFollowUp, followUp)).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    // @ts-expect-error Deliberately exercise the transport boundary's review requirement.
    await expect(f.user.mutation(api.cases.appendFollowUp, { ...followUp, reviewed: false })).rejects.toThrow();
    await expect(f.user.mutation(api.cases.appendFollowUp, { ...followUp, text: "x".repeat(LIMITS.contextMessage + 1) })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    const writes = await Promise.allSettled([1, 2].map(() => f.user.mutation(api.cases.appendFollowUp, followUp)));
    expect(writes.filter((write) => write.status === "fulfilled")).toHaveLength(1);
    expect((await f.user.query(api.cases.getMine, { caseId })).case).toMatchObject({ locale: "pa", contextRevision: 1, context: [{ role: "user", content: followUp.text }] });
    for (let revision = 1; revision <= 6; revision++) await f.user.mutation(api.cases.appendFollowUp, { ...followUp, expectedContextRevision: revision, text: String(revision).repeat(2000) });
    expect((await f.user.query(api.cases.getMine, { caseId })).case.context).toEqual([2, 3, 4, 5, 6].map((index) => ({ role: "user", content: String(index).repeat(2000) })));
    for (let revision = 7; revision < 20; revision++) await f.user.mutation(api.cases.appendFollowUp, { ...followUp, expectedContextRevision: revision, text: `Recent ${revision}` });
    expect((await f.user.query(api.cases.getMine, { caseId })).case.context).toHaveLength(LIMITS.contextMessages);
    expect((await f.user.query(api.cases.getMine, { caseId: f.caseId })).case.context).toEqual([]);
    await expect(f.stranger.query(internal.cases.forAnalysis, { caseId, expectedVersion: 0, expectedContextRevision: 20 })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
  });
  it("persists unknown/emergency urgency without altering booked snapshots", async () => {
    const f = await fixture();
    for (const [index, urgency] of (["unknown", "emergency"] as const).entries()) await f.user.mutation(api.cases.updateSummary, { caseId: f.caseId, expectedVersion: index + 1, summary: { ...manualSummary, urgency, actions: [] } });
    const bookingId = await f.user.mutation(api.bookings.request, { ...f.request, summaryVersion: 3, consent: { ...f.request.consent, summaryVersion: 3 } });
    expect((await f.t.run((ctx) => ctx.db.get(bookingId)))?.summarySnapshot.urgency).toBe("emergency");
    expect((await f.user.query(api.cases.getMine, { caseId: f.caseId })).summaries.map((entry) => entry.summary.urgency)).toEqual(["emergency", "unknown", "medium"]);
  });
  it("enforces private ownership on reads, writes and draft deletion", async () => {
    const f = await fixture();
    await expect(f.stranger.query(api.cases.getMine, { caseId: f.caseId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(f.admin.query(api.cases.getMine, { caseId: f.caseId })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await expect(f.stranger.mutation(api.cases.updateSummary, { caseId: f.caseId, expectedVersion: 1, summary: { ...manualSummary, actions: [] } })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(f.stranger.mutation(api.cases.deleteDraft, { caseId: f.caseId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await f.user.mutation(api.cases.deleteDraft, { caseId: f.caseId });
    expect(await f.t.run((ctx) => ctx.db.query("caseSummaries").collect())).toEqual([]);
  });
  it("bounds intake, context and summary and prevents lost version updates", async () => {
    const f = await fixture();
    await expect(f.user.mutation(api.cases.create, { title: "Oversized", text: "x".repeat(10_001), locale: "en", context: [] })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(f.user.mutation(api.cases.create, { title: "Oversized context", text: "Case", locale: "en", context: Array.from({ length: 6 }, () => ({ role: "user" as const, content: "x".repeat(2000) })) })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(f.user.mutation(api.cases.updateSummary, { caseId: f.caseId, expectedVersion: 1, summary: { ...manualSummary, text: "x".repeat(4001), actions: [] } })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(f.user.mutation(api.cases.updateSummary, { caseId: f.caseId, expectedVersion: 0, summary: { ...manualSummary, actions: [] } })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    const writes = await Promise.allSettled([1, 2].map((index) => f.user.mutation(api.cases.updateSummary, { caseId: f.caseId, expectedVersion: 1, summary: { ...manualSummary, text: `Summary edit ${index}`, actions: [] } })));
    expect(writes.filter((write) => write.status === "fulfilled")).toHaveLength(1);
    expect((await f.user.query(api.cases.getMine, { caseId: f.caseId })).summaries).toHaveLength(2);
  });
  it("requires exact recipient/version consent and keeps booked summaries immutable", async () => {
    const f = await fixture();
    const otherId = await f.t.run((ctx) => ctx.db.insert("advocates", { accountId: f.advocateAccountId, ...profile, domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes], cityKey: "jammu", revision: 1, application: { kind: "pending" } }));
    await expect(f.user.mutation(api.bookings.request, { ...f.request, consent: { ...f.request.consent, recipientAdvocateId: otherId } })).rejects.toMatchObject({ data: { code: "CONSENT_REQUIRED" } });
    await expect(f.user.mutation(api.bookings.request, { ...f.request, consent: { ...f.request.consent, summaryVersion: 2 } })).rejects.toMatchObject({ data: { code: "CONSENT_REQUIRED" } });
    await expect(f.stranger.mutation(api.bookings.request, f.request)).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    const id = await f.user.mutation(api.bookings.request, f.request);
    await f.user.mutation(api.cases.updateSummary, { caseId: f.caseId, expectedVersion: 1, summary: { ...manualSummary, text: "Later private revision.", actions: [] } });
    const booking = (await f.advocate.query(api.bookings.mine, { paginationOpts })).page[0];
    expect(booking?._id).toBe(id);
    expect(booking?.summarySnapshot.text).toBe(manualSummary.text);
    expect(booking?.consent).toMatchObject({ recipientAdvocateId: f.advocateId, summaryVersion: 1, grantedBy: f.userId, grantedAt: now });
    await expect(f.user.mutation(api.cases.deleteDraft, { caseId: f.caseId })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    expect((await f.stranger.query(api.bookings.mine, { paginationOpts })).page).toEqual([]);
  });
});

describe("atomic slots, reservation, lifecycle and notifications", () => {
  it.each((["profile", "credential", "suspension", "advocate_disabled", "user_disabled"] as const).flatMap((source) => [0, LIMITS.hourMs].map((elapsed) => ({ source, elapsed }))))("does not retrospectively flag started accepted bookings on $source loss ($elapsed ms after start)", async ({ source, elapsed }) => {
    const f = await fixture();
    const bookingId = await f.user.mutation(api.bookings.request, f.request);
    await f.advocate.mutation(api.bookings.transition, { bookingId, action: "accept" });
    const before = await f.t.run((ctx) => ctx.db.get(bookingId));
    const events = await f.t.run((ctx) => ctx.db.query("bookingEvents").collect());
    const notices = await f.t.run((ctx) => ctx.db.query("notifications").filter((q) => q.eq(q.field("bookingId"), bookingId)).collect());
    vi.setSystemTime(now + 4 * LIMITS.hourMs + elapsed);
    switch (source) {
      case "profile": await f.advocate.mutation(api.advocates.upsert, { ...profile, bio: "Edited after consultation", domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes] }); break;
      case "credential": await f.admin.mutation(api.credentials.review, { credentialId: f.credentialId, decision: "rejected", reason: "Later credential review" }); break;
      case "suspension": await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "suspend", reason: "Later suspension" }); break;
      case "advocate_disabled": await f.admin.mutation(api.admin.setDisabled, { accountId: f.advocateAccountId, disabled: true, reason: "Later disablement" }); break;
      case "user_disabled": await f.admin.mutation(api.admin.setDisabled, { accountId: f.userId, disabled: true, reason: "Later disablement" }); break;
      default: { const exhaustive: never = source; throw new Error(exhaustive); }
    }
    expect(await f.t.run((ctx) => ctx.db.get(bookingId))).toEqual(before);
    expect(await f.t.run((ctx) => ctx.db.query("bookingEvents").collect())).toEqual(events);
    expect(await f.t.run((ctx) => ctx.db.query("notifications").filter((q) => q.eq(q.field("bookingId"), bookingId)).collect())).toEqual(notices);
    expect((await f.admin.query(api.admin.affectedBookings, { paginationOpts })).page).toEqual([]);
    expect((await f.t.run((ctx) => ctx.db.get(f.slotId)))?.reservation).toEqual({ kind: "reserved", bookingId });
  });
  it.each([0, LIMITS.hourMs])("rejects administrator cancellation after a flag crosses slot start by %s ms", async (elapsed) => {
    const f = await fixture();
    const bookingId = await f.user.mutation(api.bookings.request, f.request);
    await f.advocate.mutation(api.bookings.transition, { bookingId, action: "accept" });
    await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "suspend", reason: "Flagged before start." });
    const before = await f.t.run((ctx) => ctx.db.get(bookingId));
    const events = await f.t.run((ctx) => ctx.db.query("bookingEvents").collect());
    vi.setSystemTime(now + 4 * LIMITS.hourMs + elapsed);
    await expect(f.admin.mutation(api.admin.handleAffectedBooking, { bookingId, action: "cancel", reason: "Too late to cancel." })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await expect(f.admin.mutation(api.admin.handleAffectedBooking, { bookingId, action: "retain", reason: "Still suspended." })).rejects.toMatchObject({ data: { code: "NOT_APPROVED" } });
    expect(await f.t.run((ctx) => ctx.db.get(bookingId))).toEqual(before);
    expect(await f.t.run((ctx) => ctx.db.query("bookingEvents").collect())).toEqual(events);
    expect((await f.t.run((ctx) => ctx.db.get(f.slotId)))?.reservation).toEqual({ kind: "reserved", bookingId });
    await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "approve", reason: "Explicit reapproval for retention." });
    await f.admin.mutation(api.admin.handleAffectedBooking, { bookingId, action: "retain", reason: "Explicitly reviewed retention." });
    expect(await f.t.run((ctx) => ctx.db.get(bookingId))).toMatchObject({ state: "accepted", adminHandling: { kind: "resolved", action: "retain" } });
  });
  it.each(["profile", "credential", "suspension", "advocate_disabled", "user_disabled"] as const)("preserves accepted bookings and closes pending requests on %s loss", async (source) => {
    const f = await fixture();
    const [pendingSlot] = await f.advocate.mutation(api.slots.publish, { slots: [{ start: now + 6 * LIMITS.hourMs, durationMinutes: 30, consultationMode: "phone" }] });
    if (!pendingSlot) throw new Error("Expected pending slot.");
    const acceptedId = await f.user.mutation(api.bookings.request, f.request);
    await f.advocate.mutation(api.bookings.transition, { bookingId: acceptedId, action: "accept" });
    const pendingId = await f.user.mutation(api.bookings.request, { ...f.request, slotId: pendingSlot, idempotencyKey: "pending" });
    switch (source) {
      case "profile": await f.advocate.mutation(api.advocates.upsert, { ...profile, bio: "Revised bio", domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes] }); break;
      case "credential": await f.admin.mutation(api.credentials.review, { credentialId: f.credentialId, decision: "rejected", reason: "Withdrawn review" }); break;
      case "suspension": await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "suspend", reason: "Suspended" }); break;
      case "advocate_disabled": await f.admin.mutation(api.admin.setDisabled, { accountId: f.advocateAccountId, disabled: true, reason: "Disabled" }); break;
      case "user_disabled": await f.admin.mutation(api.admin.setDisabled, { accountId: f.userId, disabled: true, reason: "Disabled" }); break;
      default: { const exhaustive: never = source; throw new Error(exhaustive); }
    }
    expect(await f.t.run((ctx) => ctx.db.get(acceptedId))).toMatchObject({ state: "accepted", adminHandling: { kind: "pending" } });
    expect(await f.t.run((ctx) => ctx.db.get(pendingId))).toMatchObject({ state: "cancelled" });
    expect((await f.t.run((ctx) => ctx.db.get(f.slotId)))?.reservation).toEqual({ kind: "reserved", bookingId: acceptedId });
    expect((await f.t.run((ctx) => ctx.db.get(pendingSlot)))?.reservation).toEqual({ kind: "free" });
    const queue = await f.admin.query(api.admin.affectedBookings, { paginationOpts });
    expect(queue.page).toHaveLength(1);
    expect(queue.page[0]).not.toHaveProperty("summarySnapshot");
    await expect(f.stranger.query(api.admin.affectedBookings, { paginationOpts })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await expect(f.stranger.mutation(api.admin.handleAffectedBooking, { bookingId: acceptedId, action: "cancel", reason: "Not an administrator" })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await expect(f.admin.mutation(api.admin.handleAffectedBooking, { bookingId: acceptedId, action: "retain", reason: "Still unavailable" })).rejects.toMatchObject({ data: { code: "NOT_APPROVED" } });
    await f.admin.mutation(api.admin.handleAffectedBooking, { bookingId: acceptedId, action: "cancel", reason: "Explicit administrator cancellation" });
    expect(await f.t.run((ctx) => ctx.db.get(acceptedId))).toMatchObject({ state: "cancelled", adminHandling: { kind: "resolved", action: "cancel" } });
    expect((await f.t.run((ctx) => ctx.db.get(f.slotId)))?.reservation.kind).toBe("free");
    expect((await f.admin.query(api.admin.affectedBookings, { paginationOpts })).page).toEqual([]);
    expect((await f.admin.query(api.bookings.history, { bookingId: acceptedId, paginationOpts })).page.map(({ event }) => event.kind)).toEqual(["requested", "state_changed", "affected", "state_changed", "admin_handled"]);
  });
  it("records explicit retention, deduplicates unresolved flags, and guards affected completion", async () => {
    const f = await fixture();
    const bookingId = await f.user.mutation(api.bookings.request, f.request);
    await f.advocate.mutation(api.bookings.transition, { bookingId, action: "accept" });
    for (let index = 0; index < 2; index++) await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "suspend", reason: `Suspension ${index}` });
    vi.setSystemTime(now + 5 * LIMITS.hourMs);
    await expect(f.advocate.mutation(api.bookings.transition, { bookingId, action: "complete" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "approve", reason: "Reviewed and reapproved" });
    expect((await f.admin.query(api.admin.affectedBookings, { paginationOpts })).page).toHaveLength(1);
    await f.admin.mutation(api.admin.handleAffectedBooking, { bookingId, action: "retain", reason: "Explicit retention after reapproval" });
    expect((await f.t.run((ctx) => ctx.db.get(f.slotId)))?.reservation).toEqual({ kind: "reserved", bookingId });
    await f.advocate.mutation(api.bookings.transition, { bookingId, action: "complete" });
    const history = await f.user.query(api.bookings.history, { bookingId, paginationOpts });
    expect(history.page.map(({ event }) => event.kind)).toEqual(["requested", "state_changed", "affected", "admin_handled", "state_changed"]);
    expect(history.page.at(-1)?.event).toMatchObject({ from: "accepted", to: "completed" });
    await expect(f.stranger.query(api.bookings.history, { bookingId, paginationOpts })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(f.admin.query(api.bookings.mine, { paginationOpts })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });
  it("derives booking mode from the reviewed slot and enforces profile mode and slot ownership", async () => {
    const f = await fixture();
    expect((await f.t.query(api.advocates.getPublic, { advocateId: f.advocateId }))?.consultationModes).toEqual(["phone", "video"]);
    expect((await f.t.query(api.slots.listPublic, { advocateId: f.advocateId }))[0]?.consultationMode).toBe("video");
    await expect(f.advocate.mutation(api.slots.publish, { slots: [{ start: now + 6 * LIMITS.hourMs, durationMinutes: 30, consultationMode: "in_person" }] })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    const other = f.t.withIdentity({ subject: "other-slot-owner" });
    await other.mutation(api.accounts.ensure, { role: "advocate", displayName: "Other", locale: "en" });
    await other.mutation(api.advocates.upsert, { ...profile, domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes] });
    await expect(other.mutation(api.slots.remove, { slotId: f.slotId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    const bookingId = await f.user.mutation(api.bookings.request, f.request);
    expect((await f.t.run((ctx) => ctx.db.get(bookingId)))?.consultationMode).toBe("video");
    await f.advocate.mutation(api.advocates.upsert, { ...profile, domains: [...profile.domains], locales: [...profile.locales], consultationModes: ["phone"] });
    await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 2, decision: "approve", reason: "Reapproved new modes" });
    expect(await f.t.query(api.slots.listPublic, { advocateId: f.advocateId })).toEqual([]);
    await expect(f.user.mutation(api.bookings.request, { ...f.request, idempotencyKey: "removed-mode" })).rejects.toMatchObject({ data: { code: "SLOT_UNAVAILABLE" } });
    expect((await f.t.run((ctx) => ctx.db.get(bookingId)))?.consultationMode).toBe("video");
  });
  it("rejects client mode injection and requires an advocate cancellation reason", async () => {
    const f = await fixture();
    const forgedRequest = { ...f.request, consultationMode: "phone" };
    await expect(f.user.mutation(api.bookings.request, forgedRequest)).rejects.toThrow();
    expect((await f.t.run((ctx) => ctx.db.get(f.slotId)))?.reservation.kind).toBe("free");
    const bookingId = await f.user.mutation(api.bookings.request, f.request);
    await expect(f.advocate.mutation(api.bookings.transition, { bookingId, action: "cancel" })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await f.advocate.mutation(api.bookings.transition, { bookingId, action: "cancel", reason: "Unavailable for this consultation" });
    expect((await f.user.query(api.bookings.history, { bookingId, paginationOpts })).page[1]).toMatchObject({ actor: { kind: "advocate", accountId: f.advocateAccountId }, event: { from: "pending", to: "cancelled", reason: "Unavailable for this consultation" } });
  });
  it("lets only one of two owners reserve a slot and closes repeated participant cancellation once", async () => {
    const f = await fixture();
    const strangerCase = await f.stranger.mutation(api.cases.create, { title: "Other owner", text: "Other private facts", locale: "en", context: [] });
    await f.stranger.mutation(api.cases.updateSummary, { caseId: strangerCase, expectedVersion: 0, summary: { ...manualSummary, actions: [] } });
    const results = await Promise.allSettled([f.user.mutation(api.bookings.request, f.request), f.stranger.mutation(api.bookings.request, { ...f.request, caseId: strangerCase })]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { data: { code: "SLOT_UNAVAILABLE" } } });
    const winner = results.find((result) => result.status === "fulfilled");
    if (!winner || winner.status !== "fulfilled") throw new Error("Expected winning booking.");
    const winnerClient = results[0]?.status === "fulfilled" ? f.user : f.stranger;
    const losingClient = results[0]?.status === "fulfilled" ? f.stranger : f.user;
    await expect(losingClient.query(api.bookings.history, { bookingId: winner.value, paginationOpts })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    const cancellations = await Promise.allSettled([1, 2].map(() => winnerClient.mutation(api.bookings.transition, { bookingId: winner.value, action: "cancel" })));
    expect(cancellations.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await winnerClient.query(api.bookings.history, { bookingId: winner.value, paginationOpts })).page).toHaveLength(2);
    expect((await f.t.run((ctx) => ctx.db.get(f.slotId)))?.reservation.kind).toBe("free");
  });
  it("prevents a user from concurrently reserving overlapping slots across advocates", async () => {
    const f = await fixture();
    const otherSlot = await f.t.run(async (ctx) => {
      const admin = await ctx.db.query("accounts").withIndex("by_subject", (q) => q.eq("clerkSubject", "clerk-admin")).unique();
      if (!admin) throw new Error("Expected fixture administrator.");
      const accountId = await ctx.db.insert("accounts", { clerkSubject: "fixture-second-advocate", role: "advocate", displayName: "Second fixture advocate", locale: "en", disabled: false });
      const advocateId = await ctx.db.insert("advocates", { ...profile, accountId, domains: [...profile.domains], locales: [...profile.locales], consultationModes: [...profile.consultationModes], cityKey: "jammu", revision: 1, application: { kind: "approved", reviewerId: admin._id, reviewedAt: now, reason: "Explicit development test fixture" } });
      const slotId = await ctx.db.insert("slots", { advocateId, start: now + 4 * LIMITS.hourMs, end: now + 4.5 * LIMITS.hourMs, durationMinutes: 30, consultationMode: "phone", reservation: { kind: "free" } });
      return { slotId, advocateId };
    });
    const results = await Promise.allSettled([
      f.user.mutation(api.bookings.request, f.request),
      f.user.mutation(api.bookings.request, { ...f.request, slotId: otherSlot.slotId, idempotencyKey: "overlap", consent: { ...f.request.consent, recipientAdvocateId: otherSlot.advocateId } }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { data: { code: "CONFLICT" } } });
    expect((await f.user.query(api.bookings.mine, { paginationOpts })).page).toHaveLength(1);
    const slots = await f.t.run(async (ctx) => Promise.all([ctx.db.get(f.slotId), ctx.db.get(otherSlot.slotId)]));
    expect(slots.filter((slot) => slot?.reservation.kind === "reserved")).toHaveLength(1);
  });
  it("records only one decision under concurrent administrator handling", async () => {
    const f = await fixture();
    const bookingId = await f.user.mutation(api.bookings.request, f.request);
    await f.advocate.mutation(api.bookings.transition, { bookingId, action: "accept" });
    await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "suspend", reason: "Needs handling" });
    const results = await Promise.allSettled([1, 2].map(() => f.admin.mutation(api.admin.handleAffectedBooking, { bookingId, action: "cancel", reason: "Explicit cancellation" })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { data: { code: "CONFLICT" } } });
    const events = (await f.admin.query(api.bookings.history, { bookingId, paginationOpts })).page;
    expect(events.filter(({ event }) => event.kind === "admin_handled")).toHaveLength(1);
    expect(events.filter(({ event }) => event.kind === "state_changed" && event.to === "cancelled")).toHaveLength(1);
  });
  it("settles acceptance/suspension and cancellation/expiry races without double release or missing history", async () => {
    const f = await fixture();
    const bookingId = await f.user.mutation(api.bookings.request, f.request);
    await Promise.allSettled([
      f.advocate.mutation(api.bookings.transition, { bookingId, action: "accept" }),
      f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "suspend", reason: "Concurrent suspension" }),
    ]);
    const booking = await f.t.run((ctx) => ctx.db.get(bookingId));
    const slot = await f.t.run((ctx) => ctx.db.get(f.slotId));
    if (booking?.state === "accepted") {
      expect(booking.adminHandling?.kind).toBe("pending");
      expect(slot?.reservation).toEqual({ kind: "reserved", bookingId });
      await f.admin.mutation(api.admin.handleAffectedBooking, { bookingId, action: "cancel", reason: "Race resolved by admin" });
    } else {
      expect(booking?.state).toBe("cancelled");
      expect(slot?.reservation.kind).toBe("free");
    }
    await f.admin.mutation(api.admin.review, { advocateId: f.advocateId, revision: 1, decision: "approve", reason: "Reapproved" });
    const second = await f.user.mutation(api.bookings.request, { ...f.request, idempotencyKey: "second-race" });
    vi.setSystemTime(now + 4 * LIMITS.hourMs);
    await Promise.allSettled([f.user.mutation(api.bookings.transition, { bookingId: second, action: "cancel" }), f.t.mutation(internal.bookings.expire, { bookingId: second })]);
    expect((await f.t.run((ctx) => ctx.db.get(second)))?.state).toBe("expired");
    const events = (await f.user.query(api.bookings.history, { bookingId: second, paginationOpts })).page;
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ actor: { kind: "system" }, event: { kind: "state_changed", from: "pending", to: "expired" } });
    expect((await f.t.run((ctx) => ctx.db.get(f.slotId)))?.reservation.kind).toBe("free");
  });
  it("rejects overlapping publication, accepts adjacency and excludes concurrent duplicates", async () => {
    const f = await fixture();
    await expect(f.advocate.mutation(api.slots.publish, { slots: [{ start: now + 4 * LIMITS.hourMs + 1, durationMinutes: 30, consultationMode: "video" }] })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await expect(f.advocate.mutation(api.slots.publish, { slots: [{ start: now + 6 * LIMITS.hourMs, durationMinutes: 30, consultationMode: "video" }, { start: now + 6 * LIMITS.hourMs + 1000, durationMinutes: 30, consultationMode: "video" }] })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    expect(await f.advocate.mutation(api.slots.publish, { slots: [{ start: now + 4.5 * LIMITS.hourMs, durationMinutes: 30, consultationMode: "video" }] })).toHaveLength(1);
    const publications = await Promise.allSettled([1, 2].map(() => f.advocate.mutation(api.slots.publish, { slots: [{ start: now + 8 * LIMITS.hourMs, durationMinutes: 30, consultationMode: "video" }] })));
    expect(publications.filter((publication) => publication.status === "fulfilled")).toHaveLength(1);
    const discovery = await f.t.query(api.advocates.listPublic, { domain: "property", locale: "pa", city: "JAMMU", paginationOpts });
    expect(discovery.page).toHaveLength(1);
    expect(discovery.page[0]).not.toHaveProperty("barRegistration");
    expect(discovery.page[0]).not.toHaveProperty("accountId");
    expect((await f.t.query(api.advocates.listPublic, { domain: "criminal", paginationOpts })).page).toEqual([]);
  });
  it("reserves exactly once under competing requests and replays the same key", async () => {
    const f = await fixture();
    const competing = await Promise.allSettled(["one", "two"].map((key) => f.user.mutation(api.bookings.request, { ...f.request, idempotencyKey: key })));
    expect(competing.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const current = (await f.user.query(api.bookings.mine, { paginationOpts })).page[0];
    if (!current) throw new Error("Expected a winning reservation.");
    expect(await f.user.mutation(api.bookings.request, { ...f.request, idempotencyKey: current.idempotencyKey })).toBe(current._id);
    const slot = await f.t.run((ctx) => ctx.db.get(f.slotId));
    expect(slot?.reservation).toEqual({ kind: "reserved", bookingId: current._id });
    await expect(f.advocate.mutation(api.slots.remove, { slotId: f.slotId })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await expect(f.user.mutation(api.bookings.request, { ...f.request, idempotencyKey: current.idempotencyKey, summaryVersion: 2, consent: { ...f.request.consent, summaryVersion: 2 } })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    expect((await f.t.query(api.slots.listPublic, { advocateId: f.advocateId }))).toEqual([]);
  });
  it("returns the same reservation under concurrent same-key retries", async () => {
    const f = await fixture();
    const ids = await Promise.all([f.user.mutation(api.bookings.request, f.request), f.user.mutation(api.bookings.request, f.request)]);
    expect(ids[0]).toBe(ids[1]);
    expect((await f.user.query(api.bookings.mine, { paginationOpts })).page).toHaveLength(1);
  });
  it("enforces participant transition permissions, completion time and notification ownership", async () => {
    const f = await fixture();
    const id = await f.user.mutation(api.bookings.request, f.request);
    await expect(f.user.mutation(api.bookings.transition, { bookingId: id, action: "accept" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await expect(f.stranger.mutation(api.bookings.transition, { bookingId: id, action: "cancel" })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await f.advocate.mutation(api.bookings.transition, { bookingId: id, action: "accept" });
    await expect(f.advocate.mutation(api.bookings.transition, { bookingId: id, action: "decline" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await expect(f.advocate.mutation(api.bookings.transition, { bookingId: id, action: "complete" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    const notice = (await f.user.query(api.notifications.mine, { paginationOpts })).page[0];
    if (!notice) throw new Error("Expected notification.");
    await expect(f.stranger.mutation(api.notifications.markRead, { notificationId: notice._id })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await f.user.mutation(api.notifications.markRead, { notificationId: notice._id });
    expect((await f.user.query(api.notifications.mine, { paginationOpts })).page[0]?.readAt).toBe(now);
    vi.setSystemTime(now + 4.5 * LIMITS.hourMs);
    await f.t.mutation(internal.bookings.expire, { bookingId: id });
    expect((await f.user.query(api.bookings.mine, { paginationOpts })).page[0]?.state).toBe("accepted");
    await f.advocate.mutation(api.bookings.transition, { bookingId: id, action: "complete" });
    expect((await f.user.query(api.bookings.mine, { paginationOpts })).page[0]?.state).toBe("completed");
  });
  it("releases declined/cancelled slots and does not let old expiry release a new booking", async () => {
    const f = await fixture();
    const first = await f.user.mutation(api.bookings.request, f.request);
    await f.advocate.mutation(api.bookings.transition, { bookingId: first, action: "decline" });
    const second = await f.user.mutation(api.bookings.request, { ...f.request, idempotencyKey: "second" });
    await f.t.mutation(internal.bookings.expire, { bookingId: first });
    expect((await f.t.run((ctx) => ctx.db.get(f.slotId)))?.reservation).toEqual({ kind: "reserved", bookingId: second });
    await f.user.mutation(api.bookings.transition, { bookingId: second, action: "cancel", reason: "Plans changed." });
    expect((await f.t.run((ctx) => ctx.db.get(f.slotId)))?.reservation.kind).toBe("free");
    await f.advocate.mutation(api.slots.remove, { slotId: f.slotId });
  });
  it("runs scheduled expiry at slot start and at 24 hours for later slots", async () => {
    const f = await fixture();
    const first = await f.user.mutation(api.bookings.request, f.request);
    expect((await f.t.run((ctx) => ctx.db.get(first)))?.expiresAt).toBe(now + 4 * LIMITS.hourMs);
    await vi.advanceTimersByTimeAsync(4 * LIMITS.hourMs);
    await f.t.finishInProgressScheduledFunctions();
    expect((await f.t.run((ctx) => ctx.db.get(first)))?.state).toBe("expired");
    await expect(f.user.mutation(api.bookings.request, { ...f.request, idempotencyKey: "late" })).rejects.toMatchObject({ data: { code: "SLOT_UNAVAILABLE" } });
    const [laterSlot] = await f.advocate.mutation(api.slots.publish, { slots: [{ start: Date.now() + 30 * LIMITS.hourMs, durationMinutes: 30, consultationMode: "video" }] });
    if (!laterSlot) throw new Error("Expected later slot.");
    const second = await f.user.mutation(api.bookings.request, { ...f.request, slotId: laterSlot, idempotencyKey: "later" });
    expect((await f.t.run((ctx) => ctx.db.get(second)))?.expiresAt).toBe(Date.now() + LIMITS.pendingMs);
    await vi.advanceTimersByTimeAsync(LIMITS.pendingMs);
    await f.t.finishInProgressScheduledFunctions();
    expect((await f.t.run((ctx) => ctx.db.get(second)))?.state).toBe("expired");
    expect((await f.t.run((ctx) => ctx.db.get(laterSlot)))?.reservation.kind).toBe("free");
  });
  it("blocks every private path for disabled accounts", async () => {
    const f = await fixture();
    const bookingId = await f.user.mutation(api.bookings.request, f.request);
    await f.admin.mutation(api.admin.setDisabled, { accountId: f.userId, disabled: true, reason: "Account disabled." });
    expect((await f.t.run((ctx) => ctx.db.get(bookingId)))?.state).toBe("cancelled");
    await expect(f.user.query(api.accounts.me, {})).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    await expect(f.user.query(api.cases.listMine, { paginationOpts })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    await expect(f.user.mutation(api.cases.deleteDraft, { caseId: f.caseId })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    await expect(f.user.mutation(api.bookings.request, f.request)).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    await expect(f.user.query(api.bookings.mine, { paginationOpts })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    await expect(f.user.query(api.notifications.mine, { paginationOpts })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    await expect(f.user.action(api.triage.analyze, { caseId: f.caseId, expectedVersion: 1, expectedContextRevision: 0, consent: true })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
  });
});
