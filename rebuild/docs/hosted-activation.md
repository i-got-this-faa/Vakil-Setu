# Development activation — 15 October 2026

Convex project `vakil-setu` now exists in the owner's team. Its development deployment is `chatty-sandpiper-446`, in Europe (Ireland), with cloud URL `https://chatty-sandpiper-446.eu-west-1.convex.cloud`. No production deployment or paid upgrade was created. The region picker reports a 30% regional usage surcharge; no payment method or subscription was configured by this work.

The selected Clerk development application is `app_3Kj4e2iPbvE6kONdjUnUCDzgIzu` (dashboard name `My Application`). Its Convex integration visibly reports **Enabled**, adding the `aud: "convex"` session claim. Convex's `CLERK_JWT_ISSUER_DOMAIN` points to `https://talented-fowl-5623.clerk.accounts.dev`.

Development keys are stored only in ignored `apps/web/.env.local` and `packages/backend/.env.local`. The Convex deploy key is limited to deployment, environment inspection and logs, and expires after 24 hours. It does not grant data writes, impersonation or internal function execution. The web application does not need this deploy key at runtime; expiry prevents future CLI deployments until an operator supplies a fresh key or authenticates the CLI. No secrets belong in this document.

`convex dev --once --typecheck disable` completed against this development deployment and reported functions ready, with all 19 declared indexes added. Native TypeScript checks passed separately. The production web build passed with the real configuration, and a fresh local server is running on port 3000. An unauthenticated protected request redirects to the local `/sign-in` page. Dashboard authentication is separate from signing into the application.

The Clerk form renders in Chrome at `http://localhost:3000/sign-in`. A real unauthenticated Convex HTTP query returned `null` for `accounts.me`; `cases.create` rejected the synthetic request with `UNAUTHENTICATED`, so the check wrote no intake. User application login, onboarding and a refreshed saved intake still require live verification. No administrator was bootstrapped, no advocate approval was performed, and no real case text was submitted by this setup. DGX configuration remains absent.

The pending speech callback patch now invalidates previous recognition sessions before aborting, detaches callbacks and rejects late results after locale changes, restart or unmount. Muse Spark xhigh independently reviewed this patch and the local login redirect change without finding a concrete regression. Typecheck and production build passed. The new callback guard still needs its browser regression after application sign-in; this review does not prove microphone recognition or Punjabi pronunciation.

Sources: [Convex Clerk integration](https://docs.convex.dev/auth/clerk), [Clerk middleware](https://clerk.com/docs/reference/nextjs/clerk-middleware). Runtime evidence takes precedence over configuration presence. `docs/setup.md` retains the repeatable setup and remaining acceptance workflow.
