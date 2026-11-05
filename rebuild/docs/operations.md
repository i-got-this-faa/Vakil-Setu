# Pilot operations

The current work is a local implementation. No hosted deployment, backup restore, legal compliance review or production readiness claim is made.

## Environments

Use distinct Clerk and Convex development/production projects. Match web public keys and deployment URLs to the same environment. Configure `CLERK_JWT_ISSUER_DOMAIN` and server provider secrets in the selected Convex deployment; sync functions after auth changes. Deploy the web app only after live acceptance checks and pilot policies are resolved. Logs must exclude raw cases, credential contents and tokens.

## Backup and restore

Convex supports data export/import. A deployment owner should export a development snapshot, including private storage when applicable, then restore it into a disposable scratch deployment and verify counts, file references, participants and booking histories. Record commands, timestamp, duration and failures. Never restore a scratch snapshot over live data.

From `packages/backend`, inspect the selected deployment and CLI help before using `bunx convex export --include-file-storage --path <private-backup.zip>` and `bunx convex import <private-backup.zip>` in the scratch project. Backups contain private data and need access controls and a retention policy. No restore drill has been performed; recovery objectives remain unmeasured. [Convex CLI documentation](https://docs.convex.dev/cli/overview)

## Policies required before collecting real data

- Define retention/deletion periods for raw intake, summaries, credential files, bookings and audit events.
- Define the credential checks administrators perform and the exact approval wording.
- Choose how participants exchange consultation contact information after acceptance; the MVP does not provide built-in calls or public contact scraping.
- Record browser/AI recipients, purpose and privacy terms in the disclosure shown before submission.
- Agree language comprehension/recognition/playback checks with native reviewers and advocates. Interface translations do not establish model or speech quality.

Existing future bookings affected by suspension need explicit participant notification and administrator handling. Review the backend lifecycle contract and status history; do not silently hide affected appointments. Pending requests expire at the earlier of slot start or 24 hours after request creation, enforced by backend scheduling.

## Legacy and future clients

Legacy source remains unchanged. No automatic database import, mass scraping or public advocate migration is performed. Any future migration needs a reviewed mapping, consent and repeatable validation. Development fixture data must be labelled and kept out of production discovery.

`@vakil/domain` and `@vakil/i18n` contain platform-neutral logic for future React Native work. Web DOM/Radix components are web-only. Native authentication, microphone permissions, locale speech, deep links and timezone behavior require device acceptance tests when mobile work begins.

## Remaining live evidence

Real Clerk session/revocation, hosted Convex persistence/OCC, scheduler execution, private hosted storage, DGX inference, device speech, and a real restore drill are untested. `verification.md` distinguishes these gates from passing local checks.
