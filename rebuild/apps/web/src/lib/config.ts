export type ServiceConfig =
  | { kind: "configured"; clerkKey: string; convexUrl: string }
  | { kind: "unconfigured"; missing: string[] };

// Parse public configuration once; never return the server's Clerk secret.
export function serviceConfig(): ServiceConfig {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const missing: string[] = [];
  if (!clerkKey || !/^pk_(test|live)_[A-Za-z0-9+/=]+$/.test(clerkKey)) {
    missing.push("Clerk publishable key");
  }
  if (
    !process.env.CLERK_SECRET_KEY ||
    !/^sk_(test|live)_/.test(process.env.CLERK_SECRET_KEY)
  ) {
    missing.push("Clerk server key");
  }
  if (!convexUrl || !isHttpsUrl(convexUrl))
    missing.push("Convex deployment URL");
  if (missing.length || !clerkKey || !convexUrl)
    return { kind: "unconfigured", missing };
  return { kind: "configured", clerkKey, convexUrl };
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
