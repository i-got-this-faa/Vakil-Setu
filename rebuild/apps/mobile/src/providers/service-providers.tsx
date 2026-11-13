import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useState, type ReactNode } from "react";
import type { ServiceConfig } from "../lib/config";

type ConfiguredServices = Extract<ServiceConfig, { kind: "configured" }>;

/**
 * Clerk supplies the native session (token cached in the device keystore via
 * expo-secure-store); ConvexProviderWithClerk forwards that session to Convex.
 * Only public values are passed in.
 */
export function ServiceProviders({ config, children }: { config: ConfiguredServices; children: ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(config.convexUrl));
  return (
    <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={client} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
