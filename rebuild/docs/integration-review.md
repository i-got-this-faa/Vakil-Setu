# Integration review record

The parent verified delegated findings against source. This record separates implemented behavior from external acceptance. Final command and browser evidence belongs in `verification.md`.

| Finding | Disposition |
|---|---|
| Missing local Convex API | Resolved: pinned Convex API/server templates and schema-derived aliases generate without credentials. Hosted codegen remains authoritative after activation. |
| Credential action inference and web role narrowing | Resolved with real return types and role checks; no casts or fake library declarations. |
| Approval loss destroyed accepted bookings | Resolved: pending requests close; future accepted bookings retain reservations and require a durable admin decision. Past accepted appointments are preserved and cannot be cancelled retrospectively. |
| Urgency and consultation mode omitted | Resolved: unknown/emergency remain preliminary labels; profile/slot mode is validated and copied server-side into booking snapshots. |
| History and follow-ups missing | Resolved: transactional booking events and authorized bounded context revisions; immutable recipient/version sharing. |
| Admin could not reach approved/suspended profiles | Resolved: status-filtered review plus account management UI and redacted trusted backend queries. |
| Participant cancellation after start | Resolved: the shared policy rejects it and both backend/UI use the slot start. |
| Discovery filtered after paging and lacked rank | Resolved: strict filters precede globally ranked pages within a bounded 500-profile pilot cohort. Earliest slot, name, ID determine order; UI explains actual matches. |
| Cohort cap silently truncates results | Rejected review finding: the code throws an explicit limit error, tested with 501 profiles. It does not return partial matches. Scaling needs an indexed projection. |
| Detail routes required loading earlier pages | Resolved: server-normalized direct route IDs with ownership/approval checks; no client ID casts. |
| AI consent existed only in UI | Resolved: explicit request consent plus private server-derived dispatch audit; consent resets when case revisions change. |
| Credential retrieval lacked audit | Resolved: authenticated final retrieval recheck and private audit metadata, without bearer URLs. |
| Language menu did not translate actual screens | Resolved for core navigation, intake, consent and setup text. Remaining English explanations are enumerated in the web README; human/legal language review is pending. |
| Pilot guard accepted aliases as canonical tags | Resolved: canonical BCP 47 tags only. Short domain language codes and full interface tags are intentionally different; normalization maps them. |
| i18n used the wrong runner | Rejected review finding: package script is `bun test`, matching `bun:test`. Its 12 tests pass. |
| UI fake ambient declarations | Resolved: removed; actual Radix/lucide/CVA types pass native checks. shadcn config points at the real stylesheet. |
| Native preview compiler remained | Resolved: stable TypeScript 7.0.2 `tsc` checks scripts and all five packages. |
| Narrow workspace overflow | CSS correction applied; isolated production browser checks at 360/375px pass. |
| Missing environment examples | Resolved: placeholder-only web/backend examples, with server variables configured on the Convex deployment. |

Hosted identity, persistence/OCC, storage/scheduler, DGX hardware and inference, real speech, human language review, retention/contact policies, and backup restore remain explicit release gates. None is certified by a local build or synthetic integration fixtures.
