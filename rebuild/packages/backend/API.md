# Frontend API contract

Import `api` from `@vakil/backend/api` and `Doc`/`Id` from `@vakil/backend/data-model`. Convex validators and generated bindings are the executable signatures. IDs below are branded `Id<table>`. All authenticated operations reject disabled accounts. Discovery is anonymous and returns approved profiles whose accounts remain active. Pilot locales: `en | hi | pa`; legal domains: `criminal | civil | family | property | employment | consumer | other | unknown`. Provider results are never fabricated.

## Accounts and approval

- query `accounts.me({})`: account or null (null before onboarding).
- mutation `accounts.ensure({role: "user" | "advocate", displayName: string, locale})`: account ID; idempotent for existing role, cannot choose admin or switch roles.
- query `advocates.myProfile({})`: own full profile or null.
- mutation `advocates.upsert({displayName, city, bio, barRegistration, yearsExperience, domains, locales, consultationModes})`: profile ID; every edit submits a new revision, approval invalidated. Required distinct modes: `phone | video | in_person`, at least one. Public profiles expose these modes.
- query `advocates.listPublic({domain?, locale?, city?, paginationOpts: {numItems, cursor}})`: paginated safe profiles. Required expertise/language filters precede ranking by earliest requestable slot, display name, then ID. No automatic language/location broadening. Live ranked cursors are bound to filters. Pilot scans are bounded to 500 approved candidates in the selected city/all cities; exceeding the bound returns an explicit error rather than partial matches.
- query `advocates.getPublic({advocateId})`: safe profile plus future available slots or null.
- query `advocates.resolvePublic({routeId: string})`: branded `Id<"advocates"> | null`. Bounds route strings to 1–128 characters, normalizes the table ID, and requires an approved profile with an active advocate account. Anonymous direct lookup; no list scan or pagination needed for old links.
- query `admin.queue({paginationOpts, status?})`: profile review page, private credential metadata included. Status is `pending | approved | rejected | suspended`; default pending. Approved profiles remain reachable for suspension; rejected/suspended profiles remain reachable for explicit reapproval.
- query `admin.accounts({paginationOpts})`: administrator-only account metadata for disable/reactivation. Clerk subjects and case content are omitted.
- mutation `admin.review({advocateId, revision, decision: "approve" | "reject" | "suspend", reason})`: null; approval requires a valid credential reviewed by admin.
- mutation `admin.setDisabled({accountId, disabled, reason})`: null; disabling closes pending requests, flags future accepted consultations for explicit handling, and excludes public discovery. Accepted reservations remain held; accepted consultations at or after their start are not newly flagged.
- query `admin.affectedBookings({paginationOpts})`: page of unresolved affected accepted consultations. Returns operational metadata and handling reason; excludes intake and summary content.
- mutation `admin.handleAffectedBooking({bookingId, action: "cancel" | "retain", reason})`: null; admin only. Requires an unresolved accepted consultation and nonempty reason. Cancellation requires `start > now` and releases the slot; a flag raised before start cannot authorize cancellation once start passes. Retention remains possible after start but requires an active user and an explicitly approved active advocate. Reapproval/reactivation alone never resolves the flag. Both decisions persist in history. A participant may explicitly cancel their own affected booking before start.
- INTERNAL ONLY mutation `accounts.bootstrapAdmin({clerkSubject, displayName, locale})`: ID. Invoke from deployment dashboard/CLI with an explicit Clerk subject. Never exposed to clients.

## Credentials (private)

- action `credentials.upload({content: ArrayBuffer, contentType: "application/pdf" | "image/jpeg" | "image/png", fileName})`: credential ID. At most 5 MiB; checks actual bytes, signature, declared type, and file name. Owner must be active advocate. No public upload URL.
- query `credentials.mine({})`: private credential metadata, no storage IDs or public URLs.
- action `credentials.read({credentialId})`: `{content: ArrayBuffer, contentType, fileName}` for owner or active admin only; content never gets a public storage URL. Obtains bytes first, then internally rechecks current authorization and records a private `credentialReads` entry containing only `credentialId`, derived `readerId`, derived account `role`, and `at`. Unauthorized/disabled readers, missing content, and failed final rechecks create no read audit.
- mutation `credentials.review({credentialId, decision: "valid" | "rejected", reason})`: null; active admin only. Credential rejection invalidates profile approval.
- mutation `credentials.remove({credentialId})`: null; owner only; invalidates approval.

## Private intake and summaries

- query `cases.listMine({paginationOpts})`: page of own cases.
- query `cases.resolveMine({routeId: string})`: branded `Id<"cases"> | null`. Requires an active user account, bounds route strings to 1–128 characters, normalizes the case ID and checks ownership directly. Invalid, deleted and other users' cases return null; role/authentication failures still throw. Does not page through case history.
- query `cases.getMine({caseId})`: `{case, summaries}` (version history).
- mutation `cases.create({title, text, locale, context: [{role: "user" | "assistant", content}]})`: case ID. Text <=10,000 chars, <=10 context messages each <=2,000, aggregate context <=10,000.
- mutation `cases.updateSummary({caseId, expectedVersion, summary: {locale, domain, urgency: "low" | "medium" | "high" | "emergency" | "unknown", text, actions: string[]}})`: summary ID; manual, versioned, optimistic update. Summary <=4,000 chars, <=8 actions each <=300. Does not alter booked snapshots. All urgency values are preliminary labels; emergency does not guarantee a connection.
- mutation `cases.appendFollowUp({caseId, expectedVersion, expectedContextRevision, text, reviewed: true})`: new context revision. Owner only; requires explicit reviewed new text <=2,000 chars, matching current summary/context revisions. Appends a user message and retains the newest <=10 messages within <=10,000 aggregate characters. Preserves intake locale and original text. Cases begin with `contextRevision: 0`; refetch after a conflict. Provider summaries do not automatically become follow-up messages or alter booked snapshots.
- mutation `cases.deleteDraft({caseId})`: null; only own unshared draft; deletes summary history too.
- action `triage.analyze({caseId, expectedVersion, expectedContextRevision, consent: true})`: `{kind: "available", summaryId, sourceMode: "provider", provider: "gemini"} | {kind: "unavailable", reason: "not_configured" | "invalid_config" | "provider_failed" | "invalid_result"}`. Missing/false consent fails argument validation before any dispatch or audit. Rate-limited to 5 attempts per account per rolling hour. Authentication/ownership/version failures throw structured errors. Sends only the authorized case's original text and bounded recent context, preserving its locale; never sends credentials. The action uses native Gemini GenerateContent with a structured JSON response schema and server-only x-goog-api-key header. Blocked or incomplete candidates are rejected. Historical gateway records remain readable. Immediately before a configured outbound call, internal `triageRate.recordConsent` rechecks active ownership and both revisions and stores private `aiConsents` metadata: server-derived `caseId`, `ownerId`, `summaryVersion`, `contextRevision`, `at`, `provider: "gemini"`, and `recipientOrigin` derived strictly from `new URL(config.url).origin`. No raw intake/context, credential content, API key, endpoint path or query is stored in that audit. Consent records authorize a dispatch attempt, not successful inference; unavailable configuration creates no consent record and never dispatches. Consent is omitted from existing internal analysis/rate/save arguments. Successful output is saved as a new private version only if account, summary version, and context revision are still valid. Clients must renew consent when either revision changes. Manual summaries work with no API key. AI and browser speech are separate capabilities.

## Slots and booking

- query `slots.listPublic({advocateId})`: future free slots for an approved active advocate.
- query `slots.mine({})`: own slots (including reserved ones).
- mutation `slots.publish({slots: [{start, durationMinutes, consultationMode}]})`: slot IDs. Mode is required and must belong to the approved profile's `consultationModes`. Epoch milliseconds; 15–120 minutes; future <=90 days; <=20 per call; no overlap including live reservations. Discovery includes each slot's mode and hides old slots whose modes are no longer offered.
- mutation `slots.remove({slotId})`: null; own free slot only.
- query `bookings.mine({paginationOpts})`: page of own bookings as user or advocate; summary snapshot visible only to participants.
- mutation `bookings.request({slotId, caseId, summaryVersion, idempotencyKey, consent: {recipientAdvocateId, summaryVersion, granted: true}})`: booking ID. Active user only; explicit matching recipient/version consent; snapshots latest summary immutably. Copies `consultationMode` from the trusted slot; request accepts no client mode. Idempotency key <=100 chars and replay must match the same request. Slot reserved atomically.
- mutation `bookings.transition({bookingId, action: "accept" | "decline" | "cancel" | "complete", reason?})`: null. Advocate accepts/declines pending; either participant cancels pending/accepted only before slot start; advocate cancellation requires a nonempty reason. Advocate completes accepted after end, with unresolved admin handling blocking completion. Pending expires at earlier of slot start and 24h. Terminal slots released, expired started slots cannot be rebooked. Profile edits, credential invalidation, suspension and account disablement flag only future accepted bookings with `adminHandling.kind: "pending"`, preserving original slot/summary snapshots. Started accepted bookings receive no retrospective flag, affected event or booking notification.
- query `bookings.history({bookingId, paginationOpts})`: chronologically paginated durable `bookingEvents` for participants, or active admins when a booking has handling metadata. Events persist independently of the current state/reason: request, state change, affected flag, and admin decision, each with timestamp and actor. Admin access returns events only, never shared summary content. Duplicate expiry, terminal transitions, and unresolved flag repeats cannot create duplicate lifecycle events.

## Notifications

- query `notifications.mine({paginationOpts})`: page of own notifications.
- mutation `notifications.markRead({notificationId})`: null; own only.

Structured errors use `ConvexError({code, message})`; domain exports their codes. No payments, reviews, emergency matching guarantee, fabricated confidence, or public case/credential endpoint. Pagination page sizes are bounded 1–50; discovery returns <=20 future slots per profile.

Deployment commands and exact checks are recorded in `VALIDATION.md` after implementation.
