import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { VoiceLocale } from "@legal-setu/domain";
import { RTL_LOCALES, phrasesFor } from "./languages";
import { EMERGENCY_NUMBERS } from "./logic";
import { useSpeaker } from "./speaker";
import { voice } from "./ui";

/**
 * Big, plain call buttons for India's free emergency numbers.
 * Each opens the phone's dialer with the number filled in, so one more tap places the call:
 * no accidental calls, and no phone permission is needed.
 */
export function EmergencyScreen({ locale }: { locale: VoiceLocale }) {
  const phrases = phrasesFor(locale);
  const rtl = RTL_LOCALES.includes(locale);
  const speaker = useSpeaker(locale);
  const { ready, speak, stop } = speaker;

  useEffect(() => {
    if (ready) speak("emergency", phrases.emergencyHint);
    return () => stop();
  }, [ready, speak, stop, phrases.emergencyHint]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: phrases.emergencyTitle, headerStyle: { backgroundColor: voice.mic }, headerTintColor: "#fff" }} />
      <Text style={[styles.hint, rtl && styles.rtl]}>{phrases.emergencyHint}</Text>
      {EMERGENCY_NUMBERS.map((item) => (
        <Pressable
          key={item.number}
          accessibilityRole="button"
          accessibilityLabel={`${phrases[item.label]}, ${item.number.split("").join(" ")}`}
          onPress={() => void Linking.openURL(`tel:${item.number}`)}
          style={({ pressed }) => [styles.button, { backgroundColor: item.color }, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.icon}><Ionicons name={item.icon} size={34} color={item.color} /></View>
          <View style={styles.text}>
            <Text style={styles.number}>{item.number}</Text>
            <Text style={[styles.label, rtl && styles.rtl]}>{phrases[item.label]}</Text>
          </View>
          <Ionicons name="call" size={34} color="#fff" />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: voice.bg },
  content: { padding: 16, gap: 14 },
  hint: { fontSize: 20, lineHeight: 28, fontWeight: "600", color: voice.ink, marginBottom: 4 },
  rtl: { writingDirection: "rtl", textAlign: "right" },
  button: { flexDirection: "row", alignItems: "center", gap: 16, minHeight: 104, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 22, elevation: 3, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  icon: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
  number: { fontSize: 36, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  label: { fontSize: 19, fontWeight: "600", color: "#fff" },
});
