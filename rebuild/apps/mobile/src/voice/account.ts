import { useAuth } from "@clerk/expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import { useEffect, useState } from "react";
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
  const [settledToken, setSettledToken] = useState<string | null>(null);
  const claiming = account.kind === "ready" && !!guestToken && settledToken !== guestToken;
  useEffect(() => {
    if (!claiming || !guestToken) return;
    let active = true;
    const settle = () => { if (active) setSettledToken(guestToken); };
    void claim({ guestToken }).then(settle, settle);
    return () => { active = false; };
  }, [claiming, guestToken, claim]);
  return claiming;
}
