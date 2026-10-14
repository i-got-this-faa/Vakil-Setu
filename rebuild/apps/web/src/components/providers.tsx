"use client";

import { Button } from "@vakil/ui";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import {
  Component,
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { ServiceConfig } from "@/lib/config";
import { LocaleProvider, useLocale } from "./locale";
import { errorMessage } from "@/lib/errors";

const ServiceContext = createContext<ServiceConfig>({
  kind: "unconfigured",
  missing: ["Clerk", "Convex"],
});
export function useServices() {
  return useContext(ServiceContext);
}

export function Providers({
  config,
  children,
}: {
  config: ServiceConfig;
  children: ReactNode;
}) {
  return (
    <ServiceContext.Provider value={config}>
      <LocaleProvider>
        {config.kind === "configured" ? (
          <ConfiguredProviders config={config}>{children}</ConfiguredProviders>
        ) : (
          children
        )}
      </LocaleProvider>
    </ServiceContext.Provider>
  );
}

function ConfiguredProviders({
  config,
  children,
}: {
  config: Extract<ServiceConfig, { kind: "configured" }>;
  children: ReactNode;
}) {
  const [convex] = useState(() => new ConvexReactClient(config.convexUrl));
  return (
    <ClerkProvider
      publishableKey={config.clerkKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/workspace"
      signUpFallbackRedirectUrl="/workspace"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export function SetupNotice() {
  const config = useServices();
  const { copy } = useLocale();
  if (config.kind === "configured") return null;
  return (
    <aside className="setup-notice" role="status">
      <strong>{copy.setupTitle}</strong>
      {copy.setupBody} Missing: {config.missing.join(", ")}.{" "}
      {copy.setupNotSaved}
    </aside>
  );
}

export function ServiceBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useServices().kind === "configured" ? (
    <DataErrorBoundary>{children}</DataErrorBoundary>
  ) : (
    <>{fallback ?? <SetupNotice />}</>
  );
}

type DataErrorState = { kind: "ready" } | { kind: "failed"; message: string };

class DataErrorBoundary extends Component<
  { children: ReactNode },
  DataErrorState
> {
  state: DataErrorState = { kind: "ready" };
  static getDerivedStateFromError(error: unknown): DataErrorState {
    return { kind: "failed", message: errorMessage(error) };
  }
  render() {
    if (this.state.kind === "failed")
      return (
        <div className="status-message error" role="alert">
          {this.state.message}{" "}
          <Button
            className="inline-link"
            onClick={() => this.setState({ kind: "ready" })}
          >
            retry
          </Button>
          .
        </div>
      );
    return this.props.children;
  }
}
