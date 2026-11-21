import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { Id } from "@legal-setu/backend/data-model";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { VoiceLocale } from "@legal-setu/domain";
import { formatIst } from "../lib/format";
import { DEMO_SCRIPT, markPaid, pendingBooking } from "../demo/store";
import { phrasesFor, speechTagFor } from "./languages";
import { useSpeaker } from "./speaker";
import { BigButton, Big, Card, Plain, voice } from "./ui";

/**
 * Consultation-fee payment after a lawyer is booked. DEMO ONLY: no money moves and no payment details are collected.
 * With a `bookingId` it shows that real appointment and records a test payment on the server (PAYMENTS_MODE=demo);
 * without one (EXPO_PUBLIC_DEMO_MODE) it uses the scripted demo booking.
 */
type PaymentText = Record<"title" | "fee" | "method" | "upi" | "card" | "net" | "pay" | "paying" | "paid" | "receipt" | "secure", string>;
const TEXT: Record<"doi" | "hi" | "en", PaymentText> = {
  doi: {
    title: "फीस भरो", fee: "वकील कन्नै सलाह दी फीस", method: "भुगतान दा तरीका", upi: "UPI", card: "डेबिट / क्रेडिट कार्ड", net: "नेट बैंकिंग",
    pay: "भरो", paying: "भुगतान होआ दा ऐ…", paid: "भुगतान होई गेआ। तुंʼदी वकील कन्नै मुलाकात पक्की होई गेई ऐ।", receipt: "रसीद नंबर", secure: "तुंʼदा भुगतान सुरक्षत ऐ",
  },
  hi: {
    title: "फ़ीस भरें", fee: "वकील से सलाह की फ़ीस", method: "भुगतान का तरीका", upi: "UPI", card: "डेबिट / क्रेडिट कार्ड", net: "नेट बैंकिंग",
    pay: "भरें", paying: "भुगतान हो रहा है…", paid: "भुगतान हो गया। आपकी वकील से मुलाक़ात पक्की हो गई है।", receipt: "रसीद नंबर", secure: "आपका भुगतान सुरक्षित है",
  },
  en: {
    title: "Pay fee", fee: "Lawyer consultation fee", method: "Payment method", upi: "UPI", card: "Debit / credit card", net: "Net banking",
    pay: "Pay", paying: "Paying…", paid: "Payment done. Your appointment with the lawyer is confirmed.", receipt: "Receipt no.", secure: "Your payment is secure",
  },
};

type Method = "upi" | "card" | "net";
const METHODS: { id: Method; icon: "qr-code" | "card" | "business" }[] = [
  { id: "upi", icon: "qr-code" },
  { id: "card", icon: "card" },
  { id: "net", icon: "business" },
];

export function PaymentScreen({ locale, bookingId }: { locale: VoiceLocale; bookingId?: string }) {
  const text = TEXT[locale === "doi" || locale === "hi" ? locale : "en"];
  const phrases = phrasesFor(locale);
  const speaker = useSpeaker(locale);
  const real = useQuery(api.payments.forBooking, bookingId ? { bookingId: bookingId as Id<"bookings"> } : "skip");
  const payDemo = useMutation(api.payments.payDemo);
  const scripted = bookingId ? null : pendingBooking();
  const booking = bookingId ? (real ? { name: real.advocateName, start: real.start } : null) : scripted;
  const [method, setMethod] = useState<Method>("upi");
  const [stage, setStage] = useState<"choose" | "paying" | "paid">("choose");
  const [receipt, setReceipt] = useState(bookingId ? "" : "LS-7Q4D2K");
  const [failed, setFailed] = useState("");
  const fee = `₹${bookingId ? (real?.fee ?? "") : DEMO_SCRIPT.fee}`;

  // Already paid (for example by voice): show the receipt straight away.
  useEffect(() => {
    if (real?.payment && stage === "choose") { setReceipt(real.payment.reference); setStage("paid"); }
  }, [real, stage]);

  useEffect(() => {
    if (stage !== "paying") return;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (bookingId) setReceipt((await payDemo({ bookingId: bookingId as Id<"bookings">, method })).reference);
          else markPaid();
          setStage("paid");
          speaker.speak("paid", text.paid);
        } catch {
          setFailed(phrases.error);
          setStage("choose");
        }
      })();
    }, 2200);
    return () => clearTimeout(timer);
  }, [stage, speaker, text.paid, bookingId, method, payDemo, phrases.error]);

  if (bookingId && real === undefined) return <View style={styles.paying}><ActivityIndicator size="large" color={voice.brand} /></View>;
  if (bookingId && (!real || !real.enabled)) return <ScrollView style={styles.page} contentContainerStyle={styles.content}><Card tone="warn"><Plain>{phrases.error}</Plain></Card></ScrollView>;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: text.title }} />
      <Card tone="lawyer">
        <View style={styles.row}>
          <View style={styles.avatar}><Ionicons name="person" size={34} color={voice.lawyer} /></View>
          <View style={styles.flex}>
            <Text style={styles.name}>{booking?.name ?? ""}</Text>
            {booking ? <Text style={styles.line}><Ionicons name="time" size={16} /> {formatIst(booking.start, speechTagFor(locale))}</Text> : null}
          </View>
        </View>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>{text.fee}</Text>
          <Text style={styles.feeValue}>{fee}</Text>
        </View>
      </Card>

      {stage === "paid" ? (
        <Card tone="ok">
          <View style={styles.row}>
            <Ionicons name="checkmark-circle" size={44} color={voice.ok} />
            <View style={styles.flex}><Big>{text.paid}</Big></View>
          </View>
          <Plain muted>{text.receipt}: {receipt} · {fee} · {text[method]}</Plain>
          <Text style={styles.demoNote}>{phrases.demoPaymentNote}</Text>
          <BigButton icon="mic" label={phrases.backToTalk} onPress={() => router.dismissTo("/talk")} />
        </Card>
      ) : (
        <>
          <Text style={styles.section}>{text.method}</Text>
          {METHODS.map((entry) => {
            const selected = entry.id === method;
            return (
              <Pressable key={entry.id} accessibilityRole="button" accessibilityState={{ selected }} disabled={stage !== "choose"} onPress={() => setMethod(entry.id)}
                style={[styles.method, selected && styles.methodOn]}>
                <Ionicons name={entry.icon} size={26} color={selected ? voice.brand : voice.muted} />
                <Text style={styles.methodText}>{text[entry.id]}</Text>
                <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={24} color={selected ? voice.brand : voice.muted} />
              </Pressable>
            );
          })}
          {method === "upi" ? <Plain muted>ramesh@upi</Plain> : null}
          {stage === "paying" ? (
            <View style={styles.paying}><ActivityIndicator size="large" color={voice.brand} /><Text style={styles.payingText}>{text.paying}</Text></View>
          ) : (
            <BigButton icon="lock-closed" label={`${fee} ${text.pay}`} onPress={() => setStage("paying")} />
          )}
          {failed ? <Card tone="warn"><Plain>{failed}</Plain></Card> : null}
          <View style={styles.secure}><Ionicons name="shield-checkmark" size={18} color={voice.ok} /><Text style={styles.secureText}>{text.secure}</Text></View>
          <Text style={styles.demoNote}>{phrases.demoPaymentNote}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: voice.bg },
  content: { padding: 16, gap: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  flex: { flex: 1, gap: 4 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: voice.card, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 21, fontWeight: "700", color: voice.ink },
  line: { fontSize: 16, color: voice.muted },
  feeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#99f6e4" },
  feeLabel: { fontSize: 17, color: voice.ink, flexShrink: 1 },
  feeValue: { fontSize: 26, fontWeight: "800", color: voice.lawyer },
  section: { fontSize: 20, fontWeight: "700", color: voice.ink },
  method: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 60, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, borderColor: voice.line, backgroundColor: voice.card },
  methodOn: { borderColor: voice.brand, backgroundColor: voice.brandSoft },
  methodText: { flex: 1, fontSize: 19, fontWeight: "600", color: voice.ink },
  paying: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 64 },
  payingText: { fontSize: 19, fontWeight: "600", color: voice.ink },
  secure: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secureText: { fontSize: 15, color: voice.ok },
  demoNote: { fontSize: 13, color: voice.muted, fontStyle: "italic", textAlign: "center" },
});
