# Future React Native app

Native mobile implementation is deferred by the approved MVP scope. Add the Expo or React Native app here when work starts. Reuse `@vakil/domain` and `@vakil/i18n`; they contain no DOM or Next.js imports. Use the same Convex backend and Clerk identity. The web `@vakil/ui` package uses DOM and Radix components and is intentionally not shared with native views.

Before adding mobile, verify Clerk's native session flow, the microphone adapter, locale-specific speech availability, timezone handling, deep links, and the full booking conflict and cancellation journey on devices. A workspace directory alone does not establish native readiness.
