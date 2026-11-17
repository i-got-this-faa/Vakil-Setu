import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import type { ReactNode } from "react";
import type { VoiceLocale } from "@legal-setu/domain";
import { useVoicePrefs } from "./prefs";
import { voice } from "./ui";

/** Every screen speaks the chosen language; until one is chosen, people go to the language picker. */
export function WithLocale({ children }: { children: (locale: VoiceLocale) => ReactNode }) {
  const { ready, locale } = useVoicePrefs();
  if (!ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: voice.bg }}><ActivityIndicator size="large" color={voice.brand} /></View>;
  if (!locale) return <Redirect href="/language" />;
  return <>{children(locale)}</>;
}
