# Confirmed implementation decisions

User confirmed English, Hindi and Punjabi as pilot languages, hosted Convex with Clerk identity, and the SRS MVP boundary. Payments, reviews, guaranteed emergency connections and native mobile implementation are deferred. The new frontend and database replace the SRS's suggested Vite/Express/MongoDB technology, while keeping its behavioral requirements.

Package registry checked on 2026-10-14: Next 16.4.0, React 19.3.0, Convex 1.46.0, Clerk Next 7.9.15, TypeScript 7.0.2, Bun 1.4.3, Turbo 2.11.8, Tailwind 4.3.3. TypeScript 7's stable package uses platform-native compiler packages; use native stable `tsc` as the authoritative checker. The separately named `tsgo` preview can verify compatibility but is not needed for production. No separate Go server is required by a compiler written in Go.

The user does not yet have a DGX URL or API documentation. Legacy gateway configuration is a reference contract only; live behavior and hardware are unverified. Implement explicit provider-unavailable behavior and server-side configuration. Never substitute invented legal analysis, ratings, or confidence values.

Hosted Clerk/Convex provisioning requires account configuration outside this repository. Public preview must remain useful without credentials, but must not claim persistent authenticated workflows ran until real services are configured and tested.
