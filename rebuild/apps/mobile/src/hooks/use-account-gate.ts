import { useAuth } from "@clerk/expo";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import { resolveAccountGate, type AccountGateState, type AccountView } from "../lib/account-state";

export function toAccountView(doc: { role: AccountView["role"]; disabled: boolean; displayName: string; locale: string }): AccountView {
  return { role: doc.role, disabled: doc.disabled, displayName: doc.displayName, locale: doc.locale };
}

/** Single source of truth for whether private screens may render for this device. */
export function useAccountGateState(): AccountGateState {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.accounts.me, isAuthenticated ? {} : "skip");
  const account = me === undefined ? undefined : me === null ? null : toAccountView(me);
  return resolveAccountGate({
    clerkLoaded: isLoaded,
    clerkSignedIn: Boolean(isSignedIn),
    convexLoading: isLoading,
    convexAuthenticated: isAuthenticated,
    account,
  });
}
