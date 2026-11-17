import { useAuth } from "@clerk/expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import { useEffect, useRef } from "react";
import { useVoicePrefs } from "./prefs";

export type VoiceAccount =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "needs_name" }
  | { kind: "ready"; displayName: string }
  | { kind: "not_user" };

/** Where this device stands: talking as a guest, mid sign-in, or signed in as a person seeking help. */
export function useVoiceAccount(): VoiceAccount {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.accounts.me, isAuthenticated ? {} : "skip");
  if (!isLoaded) return { kind: "loading" };
  if (!isSignedIn) return { kind: "guest" };
  if (isLoading || !isAuthenticated || me === undefined) return { kind: "loading" };
  if (me === null) return { kind: "needs_name" };
  if (me.role !== "user" || me.disabled) return { kind: "not_user" };
  return { kind: "ready", displayName: me.displayName };
}

/** Once signed in, whatever was said as a guest on this device moves into the account. */
export function useClaimGuestConversation(account: VoiceAccount) {
  const { guestToken } = useVoicePrefs();
  const claim = useMutation(api.conversations.claimGuest);
  const claimed = useRef<string | null>(null);
  useEffect(() => {
    if (account.kind !== "ready" || !guestToken || claimed.current === guestToken) return;
    claimed.current = guestToken;
    claim({ guestToken }).catch(() => {
      claimed.current = null;
    });
  }, [account.kind, guestToken, claim]);
}
