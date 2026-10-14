import { LIMITS, type LegalDomain, type PilotLocale } from "@vakil/domain";
import { fail } from "./access";

type Filters = { domain?: LegalDomain; locale?: PilotLocale; city?: string };
function cursorScope(filters: Filters) {
  return JSON.stringify([filters.domain ?? null, filters.locale ?? null, filters.city ?? null]);
}

// Ranking is computed over a bounded pilot cohort, so cursors describe live offsets.
export function discoveryOffset(cursor: string | null, filters: Filters): number {
  if (cursor === null) return 0;
  let value: unknown;
  try { value = JSON.parse(cursor); } catch { fail("INVALID_INPUT", "Invalid discovery cursor."); }
  if (typeof value !== "object" || value === null || !("offset" in value) || !("scope" in value)
    || typeof value.offset !== "number" || !Number.isSafeInteger(value.offset)
    || value.offset < 0 || value.offset > LIMITS.discoveryCandidates || value.scope !== cursorScope(filters)) {
    fail("INVALID_INPUT", "Discovery cursor does not match these filters.");
  }
  return value.offset;
}

export function discoveryCursor(offset: number, filters: Filters): string {
  return JSON.stringify({ offset, scope: cursorScope(filters) });
}
