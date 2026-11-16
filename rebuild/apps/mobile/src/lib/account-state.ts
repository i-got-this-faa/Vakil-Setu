/**
 * Maps Clerk + Convex + the `accounts.me` query into one screen-level decision.
 * `account` is `undefined` while the query loads and `null` before onboarding.
 */
export interface AccountView {
  readonly role: "user" | "advocate" | "admin";
  readonly disabled: boolean;
  readonly displayName: string;
  readonly locale: string;
}

export interface AccountGateInput {
  readonly clerkLoaded: boolean;
  readonly clerkSignedIn: boolean;
  readonly convexLoading: boolean;
  readonly convexAuthenticated: boolean;
  readonly account: AccountView | null | undefined;
}

export type AccountGateState =
  | { readonly kind: "loading" }
  | { readonly kind: "signed_out" }
  | { readonly kind: "onboarding" }
  | { readonly kind: "disabled" }
  | { readonly kind: "use_website"; readonly role: "advocate" | "admin" }
  | { readonly kind: "ready"; readonly account: AccountView };

export function resolveAccountGate(input: AccountGateInput): AccountGateState {
  if (!input.clerkLoaded) return { kind: "loading" };
  if (!input.clerkSignedIn) return { kind: "signed_out" };
  if (input.convexLoading || !input.convexAuthenticated) return { kind: "loading" };
  if (input.account === undefined) return { kind: "loading" };
  if (input.account === null) return { kind: "onboarding" };
  if (input.account.disabled) return { kind: "disabled" };
  if (input.account.role === "user") return { kind: "ready", account: input.account };
  return { kind: "use_website", role: input.account.role };
}
