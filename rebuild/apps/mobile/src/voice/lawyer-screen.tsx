import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { Id } from "@legal-setu/backend/data-model";
import { randomUUID } from "expo-crypto";
import { Stack, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { VoiceLocale } from "@legal-setu/domain";
import { formatIst } from "../lib/format";
import { convexErrorMessage } from "../lib/errors";
import { RTL_LOCALES, phrasesFor, speechTagFor } from "./languages";
import { useVoiceAccount } from "./account";
import { useVoicePrefs } from "./prefs";
import { useSpeaker } from "./speaker";
import { BigButton, Big, Card, Plain, voice } from "./ui";

type Prepared = { caseId: Id<"cases">; summaryVersion: number; summary: { text: string } };

export function LawyerScreen({ locale, advocateId }: { locale: VoiceLocale; advocateId: Id<"advocates"> }) {
  const phrases = phrasesFor(locale);
  const rtl = RTL_LOCALES.includes(locale);
  const account = useVoiceAccount();
  const { conversationId } = useVoicePrefs();
  const lawyer = useQuery(api.advocates.getPublic, { advocateId });
  const slots = useQuery(api.slots.listPublic, { advocateId });
  const prepareCase = useMutation(api.conversations.prepareCase);
  const request = useMutation(api.bookings.request);
  const speaker = useSpeaker(locale);
  const [slotId, setSlotId] = useState<Id<"slots"> | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // Stable per screen so a retried request after a network hiccup cannot double-book.
  const [idempotencyKey] = useState(() => randomUUID());

  // When a time is chosen, turn the conversation into what the lawyer will read, and read it aloud. Runs once per screen.
  const started = useRef(false);
  const { speak } = speaker;
  useEffect(() => {
    if (!slotId || account.kind !== "ready" || started.current) return;
    const text = phrasesFor(locale);
    if (!conversationId) {
      setProblem(text.speakFirst);
      return;
    }
    started.current = true;
    setBusy(true);
    prepareCase({ conversationId: conversationId as Id<"conversations"> })
      .then((result) => {
        setPrepared(result);
        speak("summary", `${text.sharedSummary} ${result.summary.text}`);
      })
      .catch(() => {
        started.current = false;
        setProblem(text.speakFirst);
      })
      .finally(() => setBusy(false));
  }, [slotId, account.kind, conversationId, prepareCase, locale, speak]);

  async function book() {
    if (!slotId || !prepared) return;
    setBusy(true);
    setProblem("");
    try {
      await request({
        slotId, caseId: prepared.caseId, summaryVersion: prepared.summaryVersion, idempotencyKey,
        consent: { recipientAdvocateId: advocateId, summaryVersion: prepared.summaryVersion, granted: true },
      });
      setDone(true);
      speaker.speak("done", phrases.requestSent);
    } catch (failure) {
      setProblem(convexErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  if (lawyer === undefined || slots === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={voice.brand} /></View>;
  if (lawyer === null) return <View style={styles.center}><Plain>{phrases.noLawyers}</Plain></View>;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: lawyer.displayName }} />
      <Card>
        <View style={styles.row}>
          <View style={styles.avatar}><Ionicons name="person" size={40} color={voice.lawyer} /></View>
          <View style={styles.flex}>
            <Text style={styles.name}>{lawyer.displayName}</Text>
            <Text style={styles.line}>{lawyer.city} · {lawyer.yearsExperience} {phrases.yearsExperience}</Text>
            <Text style={styles.line}>{lawyer.locales.map((code) => phrasesFor(code as VoiceLocale).name).join(", ")}</Text>
          </View>
        </View>
        {lawyer.bio ? <Plain muted>{lawyer.bio}</Plain> : null}
      </Card>

      {done ? (
        <Card tone="ok">
          <Big rtl={rtl}>{phrases.requestSent}</Big>
          <BigButton icon="mic" label={phrases.backToTalk} onPress={() => router.dismissTo("/talk")} />
        </Card>
      ) : (
        <>
          <Text style={styles.section}>{phrases.chooseTime}</Text>
          {slots.length === 0 ? <Card tone="warn"><Plain rtl={rtl}>{phrases.noTimes}</Plain></Card> : null}
          <View style={styles.slots}>
            {slots.slice(0, 12).map((slot) => {
              const selected = slot._id === slotId;
              return (
                <Pressable key={slot._id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSlotId(slot._id)}
                  style={[styles.slot, selected && styles.slotOn]}>
                  <Ionicons name={selected ? "checkmark-circle" : "time-outline"} size={22} color={selected ? "#fff" : voice.lawyer} />
                  <Text style={[styles.slotText, selected && { color: "#fff" }]}>{formatIst(slot.start, speechTagFor(locale))}</Text>
                </Pressable>
              );
            })}
          </View>

          {slotId && account.kind !== "ready" ? (
            <Card tone="warn">
              <Plain rtl={rtl}>{phrases.guestLimit}</Plain>
              <BigButton icon="call" label={phrases.signIn} onPress={() => router.push("/sign-in")} />
            </Card>
          ) : null}

          {slotId && prepared ? (
            <Card tone="lawyer">
              <Text style={styles.section}>{phrases.sharedSummary}</Text>
              <Big rtl={rtl}>{prepared.summary.text}</Big>
              <BigButton icon="send" label={phrases.shareAndBook} tone="lawyer" busy={busy} onPress={() => void book()} />
            </Card>
          ) : null}
          {slotId && busy && !prepared ? <ActivityIndicator size="large" color={voice.brand} /> : null}
          {problem ? (
            <Card tone="warn">
              <Plain rtl={rtl}>{problem}</Plain>
              {problem === phrases.speakFirst ? <BigButton icon="mic" label={phrases.backToTalk} onPress={() => router.dismissTo("/talk")} /> : null}
            </Card>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: voice.bg },
  content: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: voice.bg },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  flex: { flex: 1, gap: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: voice.lawyerSoft, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 23, fontWeight: "700", color: voice.ink },
  line: { fontSize: 16, color: voice.muted },
  section: { fontSize: 20, fontWeight: "700", color: voice.ink },
  slots: { gap: 10 },
  slot: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingHorizontal: 16, borderRadius: 14, borderWidth: 2, borderColor: voice.lawyer, backgroundColor: voice.card },
  slotOn: { backgroundColor: voice.lawyer },
  slotText: { fontSize: 18, fontWeight: "600", color: voice.ink },
});
