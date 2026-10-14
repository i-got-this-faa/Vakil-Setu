import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const checks = [
  ["Bun >=1.4.3", Bun.semver.satisfies(Bun.version, ">=1.4.3")],
  ["Fleet reference checkout", existsSync(resolve(root, "vendor/fleet/AGENTS.md"))],
  ["Workspace dependencies", existsSync(resolve(root, "node_modules"))],
  ["Web environment file", existsSync(resolve(root, "apps/web/.env.local"))],
  ["Backend environment file", existsSync(resolve(root, "packages/backend/.env.local"))],
] as const;

for (const [label, passed] of checks) {
  process.stdout.write(`${passed ? "OK" : "MISSING"} ${label}\n`);
}
process.stdout.write("Environment files are checked by existence only; values and secrets are never printed.\n");
process.stdout.write("Hosted Clerk, Convex, and DGX connectivity require separate live acceptance checks.\n");
process.exitCode = checks.every(([, passed]) => passed) ? 0 : 1;
