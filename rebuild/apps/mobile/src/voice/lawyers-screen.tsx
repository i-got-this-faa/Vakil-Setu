import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { Id } from "@legal-setu/backend/data-model";
import { Stack, router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { VoiceLocale } from "@legal-setu/domain";
import { formatIst } from "../lib/format";
import { phrasesFor, speechTagFor, RTL_LOCALES } from "./languages";
import { useVoiceAccount } from "./account";
import { useVoicePrefs } from "./prefs";
import { BigButton, Card, Plain, voice } from "./ui";
import { rankLawyers } from "./logic";

export function LawyersScreen({ locale }: { locale: VoiceLocale }) {
  const phrases = phrasesFor(locale);
  const rtl = RTL_LOCALES.includes(locale);
  const { conversationId, guestToken } = useVoicePrefs();
  const account = useVoiceAccount();
  const conversation = useQuery(api.conversations.get, conversationId && account.kind !== "loading"
    ? { conversationId: conversationId as Id<"conversations">, ...(account.kind === "ready" || !guestToken ? {} : { guestToken }) } : "skip");
  const list = useQuery(api.advocates.listPublic, { paginationOpts: { numItems: 50, cursor: null } });
  const profile = conversation?.profile;
  const lawyers = list ? rankLawyers(list.page, { locale, domain: profile?.domain ?? "unknown", city: profile?.city ?? "" }) : undefined;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: phrases.lawyersTitle }} />
      <Plain muted rtl={rtl}>{phrases.lawyersHint}</Plain>
      {lawyers === undefined ? <ActivityIndicator size="large" color={voice.brand} /> : null}
      {lawyers?.length === 0 ? <Card tone="warn"><Plain rtl={rtl}>{phrases.noLawyers}</Plain></Card> : null}
      {lawyers?.map((lawyer) => (
        <Pressable key={lawyer._id} accessibilityRole="button" accessibilityLabel={lawyer.displayName} onPress={() => router.push(`/lawyer/${lawyer._id}`)}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
          <View style={styles.avatar}><Ionicons name="person" size={34} color={voice.lawyer} /></View>
          <View style={styles.info}>
            <Text style={styles.name}>{lawyer.displayName}</Text>
            <Text style={styles.line}><Ionicons name="location" size={16} /> {lawyer.city} · {lawyer.yearsExperience} {phrases.yearsExperience}</Text>
            <Text style={styles.line}><Ionicons name="chatbubbles" size={16} /> {lawyer.locales.map((code) => phrasesFor(code as VoiceLocale).name).join(", ")}</Text>
            {lawyer.slots[0] ? <Text style={styles.next}><Ionicons name="time" size={16} /> {formatIst(lawyer.slots[0].start, speechTagFor(locale))}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={28} color={voice.muted} />
        </Pressable>
      ))}
      <BigButton icon="mic" label={phrases.backToTalk} tone="plain" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: voice.bg },
  content: { padding: 16, gap: 14 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, backgroundColor: voice.card, borderWidth: 1, borderColor: voice.line },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: voice.lawyerSoft, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 21, fontWeight: "700", color: voice.ink },
  line: { fontSize: 16, color: voice.muted },
  next: { fontSize: 16, fontWeight: "600", color: voice.lawyer },
});
