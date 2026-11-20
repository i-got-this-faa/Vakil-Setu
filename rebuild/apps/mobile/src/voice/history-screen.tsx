import { Ionicons } from "@expo/vector-icons";
import { useClerk } from "@clerk/expo";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import { Stack, router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { VoiceLocale } from "@legal-setu/domain";
import { formatIst } from "../lib/format";
import { convexErrorMessage } from "../lib/errors";
import { RTL_LOCALES, phrasesFor, speechTagFor } from "./languages";
import { useVoiceAccount } from "./account";
import { useVoicePrefs } from "./prefs";
import { bookingStatus } from "./logic";
import { BigButton, Card, Plain, voice } from "./ui";

export function HistoryScreen({ locale }: { locale: VoiceLocale }) {
  const phrases = phrasesFor(locale);
  const rtl = RTL_LOCALES.includes(locale);
  const account = useVoiceAccount();
  const ready = account.kind === "ready";
  const { conversationId, setConversationId, resetGuest } = useVoicePrefs();
  const conversations = useQuery(api.conversations.listMine, ready ? {} : "skip");
  const bookings = usePaginatedQuery(api.bookings.mine, ready ? {} : "skip", { initialNumItems: 10 });
  const startNew = useMutation(api.conversations.startNew);
  const clerk = useClerk();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function open(id: string) {
    setConversationId(id);
    router.dismissTo("/talk");
  }
  async function newProblem() {
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    try {
      open(await startNew({ locale, consent: true }));
    } catch (failure) {
      setError(convexErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    try {
      await clerk.signOut();
      resetGuest();
      router.dismissTo("/talk");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: phrases.myConversations }} />
      <BigButton icon="add-circle" label={phrases.newProblem} busy={busy} disabled={!ready} onPress={() => void newProblem()} />
      {error ? <Card tone="warn"><Plain rtl={rtl}>{error}</Plain></Card> : null}

      {bookings.results.length > 0 ? <Text style={styles.section}>{phrases.appointment}</Text> : null}
      {bookings.results.map((booking) => (
        <Card key={booking._id} tone={booking.state === "accepted" ? "ok" : "lawyer"}>
          <View style={styles.row}>
            <Ionicons name="calendar" size={26} color={voice.lawyer} />
            <View style={styles.flex}>
              <Text style={styles.title}>{formatIst(booking.start, speechTagFor(locale))}</Text>
              <Text style={styles.status}>{bookingStatus(booking.state, phrases)}</Text>
            </View>
          </View>
        </Card>
      ))}

      <Text style={styles.section}>{phrases.myConversations}</Text>
      {(conversations ?? []).map((item) => (
        <Pressable key={item._id} accessibilityRole="button" onPress={() => open(item._id)} style={({ pressed }) => [styles.item, item._id === conversationId && styles.current, pressed && { opacity: 0.85 }]}>
          <Ionicons name="chatbubbles" size={26} color={voice.brand} />
          <View style={styles.flex}>
            <Text style={[styles.summary, rtl && styles.rtl]} numberOfLines={3}>{item.summary || "…"}</Text>
            <Text style={styles.meta}>{formatIst(item.updatedAt, speechTagFor(locale))}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={voice.muted} />
        </Pressable>
      ))}
      {conversations?.length === 0 ? <Plain muted>…</Plain> : null}

      <View style={styles.footer}>
        <BigButton icon="globe-outline" label={phrases.language} tone="plain" onPress={() => router.push("/language")} />
        <BigButton icon="log-out-outline" label={phrases.signOut} tone="plain" busy={busy} onPress={() => void signOut()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: voice.bg },
  content: { padding: 16, gap: 12 },
  section: { fontSize: 20, fontWeight: "700", color: voice.ink, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1, gap: 4 },
  title: { fontSize: 18, fontWeight: "600", color: voice.ink },
  status: { fontSize: 17, fontWeight: "700", color: voice.lawyer },
  item: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 18, backgroundColor: voice.card, borderWidth: 1, borderColor: voice.line },
  current: { borderColor: voice.brand, borderWidth: 2 },
  summary: { fontSize: 18, lineHeight: 26, color: voice.ink },
  rtl: { writingDirection: "rtl", textAlign: "right" },
  meta: { fontSize: 14, color: voice.muted },
  footer: { gap: 10, marginTop: 16 },
});
