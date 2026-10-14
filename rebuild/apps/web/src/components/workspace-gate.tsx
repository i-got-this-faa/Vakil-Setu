"use client";

import { Button, Input, Label } from "@vakil/ui";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@vakil/backend/api";
import type { Doc } from "@vakil/backend/data-model";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { useLocale } from "./locale";
import { ServiceBoundary, SetupNotice, useServices } from "./providers";
import { errorMessage } from "@/lib/errors";

const AccountContext = createContext<Doc<"accounts"> | null>(null);
export function useAccount() {
  return useContext(AccountContext);
}

export function WorkspaceGate({ children }: { children: ReactNode }) {
  return useServices().kind === "configured" ? (
    <ServiceBoundary>
      <AuthenticatedWorkspace>{children}</AuthenticatedWorkspace>
    </ServiceBoundary>
  ) : (
    <>
      <SetupNotice />
      {children}
    </>
  );
}

function AuthenticatedWorkspace({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { copy } = useLocale();
  const account = useQuery(api.accounts.me, isAuthenticated ? {} : "skip");
  if (isLoading || (isAuthenticated && account === undefined))
    return (
      <p className="loading" role="status">
        Loading your account…
      </p>
    );
  if (!isAuthenticated)
    return (
      <div className="card">
        <h2>Your private workspace</h2>
        <p className="page-description">
          Sign in to save intake, manage cases, and request consultations.
        </p>
        <Link className="btn" href="/sign-in" style={{ marginTop: 20 }}>
          Sign in
        </Link>
      </div>
    );
  if (!account) return <Onboarding />;
  if (account.disabled)
    return (
      <div className="status-message error">{copy.accountDisabled}</div>
    );
  return (
    <AccountContext.Provider value={account}>
      {children}
    </AccountContext.Provider>
  );
}

function Onboarding() {
  const { user } = useUser();
  const { locale, copy } = useLocale();
  const ensure = useMutation(api.accounts.ensure);
  const [displayName, setDisplayName] = useState(user?.fullName ?? "");
  const [role, setRole] = useState<"user" | "advocate">("user");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await ensure({ displayName: displayName.trim(), role, locale });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <div className="eyebrow">One time account setup</div>
      <h2>How will you use Vakil Setu?</h2>
      <p className="page-description">{copy.onboardingRoleFixed}</p>
      <form className="form-stack" style={{ marginTop: 24 }} onSubmit={submit}>
        <div className="field">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            required
            maxLength={100}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <div className="field">
          <Label htmlFor="account-role">Account role</Label>
          <select
            id="account-role"
            value={role}
            onChange={(event) => {
              if (
                event.target.value === "user" ||
                event.target.value === "advocate"
              )
                setRole(event.target.value);
            }}
          >
            <option value="user">I need legal help</option>
            <option value="advocate">I am an advocate</option>
          </select>
        </div>
        {error && (
          <p className="status-message error" role="alert">
            {error}
          </p>
        )}
        <Button className="btn" disabled={pending}>
          {pending ? "Creating account…" : "Create my account"}
        </Button>
      </form>
    </div>
  );
}

export function RequireRole({
  role,
  children,
}: {
  role: Doc<"accounts">["role"];
  children: ReactNode;
}) {
  const account = useAccount();
  if (useServices().kind === "unconfigured") return <SetupNotice />;
  if (account?.role !== role)
    return (
      <div className="card">
        <h2>This is the {role} workspace</h2>
        <p className="page-description">
          Your current account does not have access to this role. Administrator
          accounts are provisioned by the deployment owner.
        </p>
        <Link href="/workspace" className="inline-link">
          Return to your overview
        </Link>
      </div>
    );
  return children;
}
