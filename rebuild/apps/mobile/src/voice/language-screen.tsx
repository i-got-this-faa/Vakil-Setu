import * as Speech from "expo-speech";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { VoiceLocale } from "@legal-setu/domain";
import { LANGUAGE_CHOICES, UPCOMING_LANGUAGES, speechTagFor } from "./languages";
import { useVoicePrefs } from "./prefs";
import { voice } from "./ui";

/** First screen: every language in its own script, one tap. No reading of English required. */
export function LanguageScreen({ allowed }: { allowed: readonly VoiceLocale[] | undefined }) {
  const { locale, setLocale } = useVoicePrefs();
  const choices = allowed ? LANGUAGE_CHOICES.filter((choice) => allowed.includes(choice.code)) : LANGUAGE_CHOICES;

  function choose(code: VoiceLocale, name: string) {
    Speech.stop();
    // The talk screen plays the Dogri greeting through Bhashini.
    if (code !== "doi") Speech.speak(name, { language: speechTagFor(code) });
    setLocale(code);
    if (router.canGoBack()) router.back();
    else router.replace("/talk");
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.top}>
        <Ionicons name="globe-outline" size={44} color={voice.brand} />
        <Text style={styles.hint}>भाषा · ਭਾਸ਼ਾ · ভাষা · மொழி · Language</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {choices.map((choice) => {
          const selected = choice.code === locale;
          return (
            <Pressable key={choice.code} accessibilityRole="button" accessibilityLabel={choice.name} accessibilityState={{ selected }}
              onPress={() => choose(choice.code, choice.name)} style={({ pressed }) => [styles.choice, selected && styles.selected, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.name, selected && { color: "#fff" }]}>{choice.name}</Text>
            </Pressable>
          );
        })}
        {UPCOMING_LANGUAGES.map((upcoming) => (
          <View key={upcoming.code} accessible accessibilityRole="button" accessibilityState={{ disabled: true }}
            accessibilityLabel={`${upcoming.name}, ${upcoming.english}, coming soon`} style={[styles.choice, styles.upcoming]}>
            <Text style={[styles.name, styles.upcomingName]}>{upcoming.name}</Text>
            <Text style={styles.soon}>जल्द आ रहा है · Coming soon</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: voice.bg },
  top: { alignItems: "center", gap: 8, paddingTop: 24, paddingBottom: 12 },
  hint: { fontSize: 16, color: voice.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 16, justifyContent: "center" },
  choice: { width: "46%", minHeight: 84, borderRadius: 20, backgroundColor: voice.card, borderWidth: 2, borderColor: voice.line, alignItems: "center", justifyContent: "center", padding: 12 },
  selected: { backgroundColor: voice.brand, borderColor: voice.brand },
  name: { fontSize: 26, fontWeight: "700", color: voice.ink },
  upcoming: { borderStyle: "dashed", opacity: 0.55 },
  upcomingName: { color: voice.muted },
  soon: { marginTop: 4, fontSize: 12, color: voice.muted, textAlign: "center" },
});
