# Surface coverage

Behavior: a user reviews multilingual intake, chooses an approved advocate, explicitly shares a summary version, requests an exclusive future slot, and sees the advocate's persistent decision.

| Surface | Applicability | Required evidence |
|---|---|---|
| Visitor landing and discovery | Applies | Browser route/navigation, public fields only |
| User registration/session/logout | Applies | Real Clerk sessions, independent account isolation |
| User intake, transcript edit, typed fallback | Applies | Browser capture/error path and Unicode preservation |
| English/Hindi/Punjabi interface | Applies | Native-script UI checks; human comprehension still required |
| Other scheduled languages | Applies to registry/text | No claim of full UI, AI or speech support |
| Browser recognition and playback | Applies | Capability detection and explicit unavailable state; device/language trials pending |
| DGX chat provider | Applies | Boundary/parser/timeout tests; live endpoint documentation missing |
| DGX speech provider | Unavailable | No documented protocol exists; typed and browser alternatives |
| Advocate registration/application | Applies | Private credentials, pending hidden, review and reapproval |
| Administrator approval/suspension | Applies | Backend role enforcement and effect on discovery/requests |
| Private cases, follow-ups and summary consent | Applies | Owner checks, bounded context, immutable recipient snapshot |
| Slot publication/reservation | Applies | Overlap rejection and concurrent transaction tests |
| Booking acceptance/cancellation/decline/completion | Applies | Allowed transitions, assigned participant permission, status history |
| Expiry and reservation release | Applies | Scheduled backend enforcement without browser |
| Notifications | Applies | Recipient-only access; transaction remains correct on delivery failure |
| Hosted persistence and refresh/restart | Applies | Live Convex+Clerk complete journey pending provisioning |
| Offline mutation success | Does not apply | Network required; never show an unpersisted booking as successful |
| Payments/reviews/emergency guarantee | Does not apply | User confirmed deferred scope |
| Native React Native clients | Does not apply to MVP | Platform-neutral shared packages documented; device app deferred |
| Legacy migration | Does not apply to current build | Source retained, no destructive migration authorized |
| Public deployment | Does not apply yet | Local rebuild requested; live service setup and pilot policies pending |

Record implementation checks in `verification.md`; this ledger is a scope map, not evidence that every acceptance test passed.
