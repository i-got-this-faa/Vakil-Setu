import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useState, type ReactNode } from "react";
import type { ServiceConfig } from "../lib/config";
import { secureRandomHex } from "../lib/random";
import { LiveDemoAccount, LiveDemoSession } from "./live-demo-session";

type ConfiguredServices = Extract<ServiceConfig, { kind: "configured" }>;

/**
 * Clerk supplies the native session (token cached in the device keystore via
 * expo-secure-store); ConvexProviderWithClerk forwards that session to Convex.
 * Only public values are passed in.
 */
export function ServiceProviders({ config, children }: { config: ConfiguredServices; children: ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(config.convexUrl));
  const [demoLogin] = useState(() => __DEV__ && process.env.EXPO_PUBLIC_DEMO_LOGIN === "1" && secureRandomHex(1) !== null);
  const content = <ConvexProviderWithClerk client={client} useAuth={useAuth}>
    {demoLogin ? <LiveDemoAccount>{children}</LiveDemoAccount> : children}
  </ConvexProviderWithClerk>;
  return (
    <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}>
      {demoLogin ? <LiveDemoSession>{content}</LiveDemoSession> : content}
    </ClerkProvider>
  );
}
