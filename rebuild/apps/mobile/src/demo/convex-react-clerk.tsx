// DEMO MODE ONLY: stands in for "convex/react-clerk".
import type { ReactNode } from "react";

export function ConvexProviderWithClerk({ children }: { client?: unknown; useAuth?: unknown; children: ReactNode }) {
  return <>{children}</>;
}
