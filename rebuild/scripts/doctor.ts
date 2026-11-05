import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const localChecks = [
  ["Bun >=1.4.3", Bun.semver.satisfies(Bun.version, ">=1.4.3")],
  ["Fleet reference checkout", existsSync(resolve(root, "vendor/fleet/AGENTS.md"))],
  ["Workspace dependencies", existsSync(resolve(root, "node_modules"))],
  ["Convex application bindings", existsSync(resolve(root, "packages/backend/convex/_generated/api.js"))],
  ["Node >=22", Number(process.versions.node.split(".")[0]) >= 22],
] as const;
const activationChecks = [
  ["Web environment file", existsSync(resolve(root, "apps/web/.env.local"))],
  ["Backend environment file", existsSync(resolve(root, "packages/backend/.env.local"))],
] as const;

for (const [label, passed] of localChecks) {
  process.stdout.write(`${passed ? "OK" : "MISSING"} ${label}\n`);
}
for (const [label, passed] of activationChecks) {
  process.stdout.write(`${passed ? "PRESENT" : "PENDING"} ${label} (hosted activation)\n`);
}
process.stdout.write("Environment files are checked by existence only; values and secrets are never printed.\n");
process.stdout.write("Hosted Clerk, Convex, and DGX connectivity require separate live acceptance checks.\n");
const requireServices = process.argv.includes("--services");
process.exitCode = localChecks.every(([, passed]) => passed)
  && (!requireServices || activationChecks.every(([, passed]) => passed)) ? 0 : 1;
