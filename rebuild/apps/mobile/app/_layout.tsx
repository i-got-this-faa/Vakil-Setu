import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ServiceNotConfigured } from "../src/components/service-not-configured";
import { colors, fonts } from "../src/theme";
import { parseServiceConfig } from "../src/lib/config";
import { LocaleProvider } from "../src/providers/locale";
import { ServiceProviders } from "../src/providers/service-providers";
import { DataErrorBoundary } from "../src/components/data-error-boundary";

// Expo inlines EXPO_PUBLIC_* values only when they are read as literal member accesses.
const serviceConfig = parseServiceConfig({
  convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

export default function RootLayout() {
  return (
    <LocaleProvider>
      <StatusBar style="dark" />
      {serviceConfig.kind === "configured" ? (
        <ServiceProviders config={serviceConfig}>
          <DataErrorBoundary>
          <Stack
            screenOptions={{
              headerTintColor: colors.primary,
              headerTitleStyle: { color: colors.ink, fontFamily: fonts.heading, fontWeight: "400" },
              headerStyle: { backgroundColor: colors.surface },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
            <Stack.Screen name="sign-up" options={{ title: "Create account" }} />
            <Stack.Screen name="advocate/[advocateId]" options={{ title: "Advocate" }} />
            <Stack.Screen name="request/[advocateId]" options={{ title: "Request consultation" }} />
            <Stack.Screen name="case/new" options={{ title: "New intake" }} />
            <Stack.Screen name="case/[caseId]" options={{ title: "Case" }} />
          </Stack>
          </DataErrorBoundary>
        </ServiceProviders>
      ) : (
        <ServiceNotConfigured missing={serviceConfig.missing} />
      )}
    </LocaleProvider>
  );
}
