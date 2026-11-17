import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ServiceNotConfigured } from "../src/components/service-not-configured";
import { DataErrorBoundary } from "../src/components/data-error-boundary";
import { parseServiceConfig } from "../src/lib/config";
import { LocaleProvider } from "../src/providers/locale";
import { ServiceProviders } from "../src/providers/service-providers";
import { VoicePrefsProvider } from "../src/voice/prefs";
import { voice } from "../src/voice/ui";

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
          <VoicePrefsProvider>
            <DataErrorBoundary>
              <Stack
                screenOptions={{
                  headerTintColor: voice.brand,
                  headerTitleStyle: { color: voice.ink, fontSize: 20, fontWeight: "700" },
                  headerStyle: { backgroundColor: voice.bg },
                  headerShadowVisible: false,
                  contentStyle: { backgroundColor: voice.bg },
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="language" options={{ headerShown: false }} />
                <Stack.Screen name="talk" options={{ headerShown: false }} />
              </Stack>
            </DataErrorBoundary>
          </VoicePrefsProvider>
        </ServiceProviders>
      ) : (
        <ServiceNotConfigured missing={serviceConfig.missing} />
      )}
    </LocaleProvider>
  );
}
