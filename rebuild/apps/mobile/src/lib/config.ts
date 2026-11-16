/**
 * Public, client-side configuration only. Clerk publishable keys and Convex
 * deployment URLs are public by design; secret keys must never reach the app.
 */
export type ServiceConfig =
  | { kind: "configured"; clerkPublishableKey: string; convexUrl: string }
  | { kind: "unconfigured"; missing: readonly string[] };

export interface RawPublicConfig {
  readonly convexUrl: string | undefined;
  readonly clerkPublishableKey: string | undefined;
}

const CLERK_PUBLISHABLE_KEY = /^pk_(test|live)_[A-Za-z0-9+/=]+$/;
// https, a host with optional port, and no userinfo, path, query or fragment.
const CONVEX_URL = /^https:\/\/[A-Za-z0-9.-]+(?::\d{1,5})?\/?$/;

export const CONFIG_ENV_NAMES = {
  convexUrl: "EXPO_PUBLIC_CONVEX_URL",
  clerkPublishableKey: "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
} as const;

export function parseServiceConfig(raw: RawPublicConfig): ServiceConfig {
  const clerkPublishableKey = (raw.clerkPublishableKey ?? "").trim();
  const convexUrl = (raw.convexUrl ?? "").trim();
  const missing: string[] = [];
  if (!CLERK_PUBLISHABLE_KEY.test(clerkPublishableKey)) missing.push(CONFIG_ENV_NAMES.clerkPublishableKey);
  if (!CONVEX_URL.test(convexUrl)) missing.push(CONFIG_ENV_NAMES.convexUrl);
  if (missing.length > 0) return { kind: "unconfigured", missing };
  return { kind: "configured", clerkPublishableKey, convexUrl };
}
