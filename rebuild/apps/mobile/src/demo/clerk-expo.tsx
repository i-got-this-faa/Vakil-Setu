// DEMO MODE ONLY: stands in for "@clerk/expo" with a signed-in demo user.
import type { ReactNode } from "react";

export function ClerkProvider({ children }: { publishableKey?: string; tokenCache?: unknown; children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return { isLoaded: true, isSignedIn: true, userId: "demo-user", getToken: async () => null, signOut: async () => undefined };
}

export function useClerk() {
  return { signOut: async () => undefined };
}

export function useSignIn(): any {
  return { isLoaded: true, signIn: null, setActive: async () => undefined };
}

export function useSignUp(): any {
  return { isLoaded: true, signUp: null, setActive: async () => undefined };
}
