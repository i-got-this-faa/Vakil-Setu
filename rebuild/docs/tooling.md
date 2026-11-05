# Local tooling

Registry `latest` tags checked on 14 October 2026: Next.js 16.4.0, TypeScript 7.0.2, Convex 1.46.0, Bun 1.4.3. Package versions and the Bun lockfile pin this build.

Type checking uses the stable TypeScript package's `tsc` entry point. Its installed `lib/tsc.js` launches the platform native compiler executable. The compiler is implemented in Go; the application needs no additional Go backend. The obsolete native preview compiler is removed. [Microsoft TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).

Before type checking or building, `backend:codegen:local` creates schema-derived Convex application bindings without contacting a deployment. API and server files use the installed Convex generator templates; data model aliases derive from `schema.ts`. This script is pinned to Convex 1.46.0, supports this application's component-free layout, and must be reviewed when upgrading Convex or adding components. Generated files are checked in so imports also resolve before generation. After hosted activation, `convex dev` supplies authoritative deployment bindings.

`bun run doctor` checks local prerequisites and reports missing hosted environment files as pending. `bun run doctor --services` also requires those files to exist. Neither command reads or prints their contents, validates credentials, or proves service connectivity.

On this Windows workstation the ignored Bun executable is `.tooling/node_modules/bun/bin/bun.exe`. If Bun is not globally installed, add that directory to this process's `PATH` before invoking scripts that launch child Bun processes. Do not commit the task-local binary or installed dependencies.
