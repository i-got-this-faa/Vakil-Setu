import { describe, expect, test } from "bun:test";
import { resolveAccountGate, type AccountView, type AccountGateInput } from "./account-state";

const user: AccountView = { role: "user", disabled: false, displayName: "Asha", locale: "hi" };
const base: AccountGateInput = {
  clerkLoaded: true,
  clerkSignedIn: true,
  convexLoading: false,
  convexAuthenticated: true,
  account: user,
};

describe("resolveAccountGate", () => {
  test("waits for Clerk before deciding anything", () => {
    expect(resolveAccountGate({ ...base, clerkLoaded: false })).toEqual({ kind: "loading" });
  });

  test("signed-out visitors are offered sign-in, never account data", () => {
    expect(resolveAccountGate({ ...base, clerkSignedIn: false, convexAuthenticated: false, account: undefined })).toEqual({ kind: "signed_out" });
  });

  test("waits while Convex authenticates or the account query is pending", () => {
    expect(resolveAccountGate({ ...base, convexLoading: true })).toEqual({ kind: "loading" });
    expect(resolveAccountGate({ ...base, convexAuthenticated: false })).toEqual({ kind: "loading" });
    expect(resolveAccountGate({ ...base, account: undefined })).toEqual({ kind: "loading" });
  });

  test("a null account means onboarding is required", () => {
    expect(resolveAccountGate({ ...base, account: null })).toEqual({ kind: "onboarding" });
  });

  test("disabled accounts are blocked even when their role is user", () => {
    expect(resolveAccountGate({ ...base, account: { ...user, disabled: true } })).toEqual({ kind: "disabled" });
  });

  test("advocate and admin accounts are directed to the website", () => {
    expect(resolveAccountGate({ ...base, account: { ...user, role: "advocate" } })).toEqual({ kind: "use_website", role: "advocate" });
    expect(resolveAccountGate({ ...base, account: { ...user, role: "admin" } })).toEqual({ kind: "use_website", role: "admin" });
  });

  test("an active user account is ready", () => {
    expect(resolveAccountGate(base)).toEqual({ kind: "ready", account: user });
  });
});
