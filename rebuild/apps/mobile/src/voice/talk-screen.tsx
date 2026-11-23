import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@legal-setu/backend/api";
import type { Id } from "@legal-setu/backend/data-model";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VOICE_LOCALES, type VoiceLocale } from "@legal-setu/domain";
import { formatIst } from "../lib/format";
import { convexErrorMessage } from "../lib/errors";
import { randomUUID } from "../lib/random";
import { RTL_LOCALES, phrasesFor, speechTagFor, type Phrases } from "./languages";
import { bookingStatus, failureText, lawSourceLabel, type LawSource } from "./logic";
import { useClaimGuestConversation, useVoiceAccount } from "./account";
import { useVoicePrefs } from "./prefs";
import { useVoiceRecorder, type Recording } from "./recorder";
import { useSpeaker } from "./speaker";
import { Avatar, type AvatarMood } from "./avatar";
import { BigButton, Card, IconButton, Plain, voice } from "./ui";
import { pickDocument, type DocumentSource, type PickedDocument } from "./documents";

type BookingAction = "find" | "choose_lawyer" | "choose_time" | "more_times" | "other_lawyer" | "other_time" | "yes" | "no" | "cancel";
type BookingInput = { kind: "booking"; action: BookingAction; option?: number; label: string };
type Input = { kind: "audio"; mimeType: Recording["mimeType"]; data: ArrayBuffer } | { kind: "text"; text: string } | PickedDocument | BookingInput;
/** What the server shows under a booking reply (see bookingCard in the backend). */
type BookingCardData = {
  stage: "sign_in" | "describe_first" | "lawyer" | "time" | "confirm" | "booked" | "paid" | "none_available" | "cancelled";
  lawyers?: { name: string; city: string; yearsExperience: number; locales: string[]; nextStart?: number }[];
  times?: number[]; lawyerName?: string; start?: number; summary?: string;
  bookingId?: string; fee?: number; reference?: string;
};

export function TalkScreen({ locale }: { locale: VoiceLocale }) {
  const { phrases, guestToken, conversationId, resumeLatest, setConversationId } = useVoicePrefs();
  const account = useVoiceAccount();
  useClaimGuestConversation(account);
  const rtl = RTL_LOCALES.includes(locale);
  const speaker = useSpeaker(locale);
  const send = useAction(api.voice.send);
  const startNew = useMutation(api.conversations.startNew);
  const asGuest = account.kind !== "ready";
  const guestSignInRequired = account.kind === "guest" && guestToken === null;
  const tokenArg = asGuest && guestToken ? { guestToken } : {};

  const latest = useQuery(api.conversations.latest, resumeLatest && !conversationId && account.kind !== "loading" ? tokenArg : "skip");
  const data = useQuery(api.conversations.get, conversationId && account.kind !== "loading" ? { conversationId: conversationId as Id<"conversations">, ...tokenArg } : "skip");

  // Resume the newest conversation, and forget one this device can no longer open.
  useEffect(() => {
    if (resumeLatest && !conversationId && latest) setConversationId(latest._id);
  }, [resumeLatest, conversationId, latest, setConversationId]);
  useEffect(() => {
    if (conversationId && data === null && (account.kind === "guest" || account.kind === "ready")) setConversationId(null);
  }, [conversationId, data, account.kind, setConversationId]);

  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState("");
  const [guestLimit, setGuestLimit] = useState(false);
  const [typing, setTyping] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [draft, setDraft] = useState("");
  const awaitingSpeech = useRef<string | null>(null);
  const greeted = useRef(false);

  const submit = useCallback(async (input: Input) => {
    if (sending || starting || guestSignInRequired) return;
    setSending(true);
    setNotice("");
    speaker.stop();
    const requestId = randomUUID();
    awaitingSpeech.current = requestId;
    try {
      const result = await send({
        ...(conversationId ? { conversationId: conversationId as Id<"conversations"> } : {}),
        ...(asGuest && guestToken ? { guestToken } : {}),
        locale, requestId, input, consent: true,
      });
      if (result.conversationId) setConversationId(result.conversationId);
      if (result.kind === "unavailable") {
        awaitingSpeech.current = null;
        if (result.reason === "guest_limit") setGuestLimit(true);
        else {
          // A failed turn already shows its message under the question; only show a separate notice otherwise.
          if (!result.turnId) setNotice(failureText(result.reason, phrases));
          speaker.speak("notice", failureText(result.reason, phrases));
        }
      }
    } catch (error) {
      awaitingSpeech.current = null;
      const code = error instanceof ConvexError && typeof error.data === "object" && error.data !== null && "code" in error.data ? String(error.data.code) : "";
      if (code === "NOT_FOUND") setConversationId(null);
      if (code === "ONBOARDING_REQUIRED") router.push("/sign-in");
      setNotice(phrases.error);
    } finally {
      setSending(false);
    }
  }, [asGuest, conversationId, guestSignInRequired, guestToken, locale, phrases, send, setConversationId, speaker, sending, starting]);

  const recorder = useVoiceRecorder((recording) => {
    if (recording) void submit({ kind: "audio", mimeType: recording.mimeType, data: recording.data });
    else setNotice(phrases.sayAgain);
  });

  // Speak each new answer once it arrives.
  useEffect(() => {
    const id = awaitingSpeech.current;
    if (!id || !data) return;
    const turn = data.turns.find((entry) => entry.requestId === id);
    if (turn?.reply.kind === "reply") {
      awaitingSpeech.current = null;
      speaker.speak(turn._id, turn.reply.text);
    } else if (turn?.reply.kind === "unavailable") {
      awaitingSpeech.current = null;
    }
  }, [data, speaker]);

  const turns = data?.turns ?? [];
  // Only the newest booking card can be tapped; older ones are a record of what was said.
  const lastTurnId = turns.at(-1)?._id;
  const empty = turns.length === 0;
  useEffect(() => {
    if (greeted.current || !speaker.ready || !empty || (conversationId && data === undefined)) return;
    greeted.current = true;
    speaker.speak("greeting", phrases.greeting);
  }, [speaker, empty, conversationId, data, phrases.greeting]);

  const outOfGuestTurns = guestLimit || (data?.isGuest === true && data.guestTurnsLeft === 0);
  useEffect(() => {
    if (account.kind === "ready") setGuestLimit(false);
  }, [account.kind]);

  const scroll = useRef<ScrollViewInstance>(null);
  const suggestLawyer = data?.profile.suggestLawyer === true;
  const recording = recorder.state === "recording";
  const busy = sending || starting || recorder.state === "stopping";
  const waitingForReply = busy || turns.some((turn) => turn.reply.kind === "pending");
  const mood: AvatarMood = speaker.speakingId ? "speaking" : recording ? "listening" : waitingForReply ? "thinking" : "idle";

  function onMic() {
    if (recording) void recorder.stop();
    else {
      // Stop the voice and give the speaker a moment to fall silent, so the recording starts with the person, not the app.
      const wasSpeaking = speaker.speakingId !== null;
      speaker.stop();
      setNotice("");
      void new Promise((resolve) => setTimeout(resolve, wasSpeaking ? 350 : 0)).then(() => recorder.start()).then((started) => {
        if (!started && recorder.permissionDenied) setNotice(phrases.micPermission);
      });
    }
  }

  async function attachFrom(source: DocumentSource) {
    setAttaching(false);
    speaker.stop();
    setNotice("");
    const picked = await pickDocument(source);
    if (picked.kind === "ok") void submit(picked.input);
    else if (picked.kind === "too_big") setNotice(phrases.documentTooBig);
    else if (picked.kind === "failed") setNotice(phrases.documentProblem);
  }

  function sendTyped() {
    if (busy) return;
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void submit({ kind: "text", text });
  }

  async function newProblem() {
    if ((account.kind !== "ready" && account.kind !== "guest") || busy || recording || waitingForReply) return;
    setStarting(true);
    setNotice("");
    speaker.stop();
    try {
      // Guest sends already create conversations; retain the guest token and its server-side allowance.
      const id = account.kind === "ready" ? await startNew({ locale, consent: true }) : null;
      awaitingSpeech.current = null;
      greeted.current = false;
      setDraft("");
      setGuestLimit(account.kind === "guest" && outOfGuestTurns);
      setConversationId(id);
    } catch (error) {
      setNotice(convexErrorMessage(error));
    } finally {
      setStarting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={phrases.language} onPress={() => router.push("/language")} style={styles.langPill}>
          <Ionicons name="globe-outline" size={22} color={voice.brand} />
          <Text style={styles.langText}>{phrases.name}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={phrases.emergency} onPress={() => { speaker.stop(); router.push("/emergency"); }} style={({ pressed }) => [styles.sos, pressed && { opacity: 0.85 }]}>
          <Ionicons name="alert-circle" size={22} color="#fff" />
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>
        <View style={styles.headerRight}>
          {account.kind === "ready"
            ? <IconButton icon="albums-outline" label={phrases.myConversations} onPress={() => router.push("/history")} showLabel />
            : <IconButton icon="person-circle-outline" label={phrases.signIn} onPress={() => router.push("/sign-in")} showLabel />}
        </View>
      </View>

      {speaker.notice ? <View style={styles.newProblem}><Plain muted rtl={rtl}>{speaker.notice}</Plain></View> : null}
      {account.kind === "ready" || (account.kind === "guest" && !guestSignInRequired) ? <View style={styles.newProblem}>
        <BigButton icon="add-circle-outline" label={phrases.newProblem} tone="plain" busy={starting}
          disabled={busy || recording || waitingForReply} onPress={() => void newProblem()} />
      </View> : null}

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.stage}>
          <Avatar
            mood={mood}
            size={typing ? 76 : 132}
            onWord={speaker.onWord}
            onPress={speaker.speakingId ? speaker.stop : undefined}
            label={speaker.speakingId ? phrases.stop : undefined}
          />
        </View>
        <ScrollView ref={scroll} style={styles.flex} contentContainerStyle={styles.thread} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {(data?.bookings ?? []).map((booking) => (
            <Card key={booking._id} tone={booking.state === "accepted" ? "ok" : "lawyer"}>
              <View style={styles.row}>
                <Ionicons name="calendar" size={26} color={voice.lawyer} />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{phrases.appointment}: {booking.advocateName}</Text>
                  <Text style={styles.cardText}>{formatIst(booking.start, speechTagFor(locale))}</Text>
                  <Text style={styles.cardStatus}>{bookingStatus(booking.state, phrases)}</Text>
                  {"paid" in booking && booking.paid ? <Text style={styles.cardText}>✓ {phrases.paidLabel} · ₹{booking.paid.amount}</Text> : null}
                </View>
              </View>
            </Card>
          ))}

          {empty ? (
            <Bubble side="assistant" rtl={rtl} text={phrases.greeting} speaking={speaker.speakingId === "greeting"} canSpeak={speaker.canSpeak}
              onSpeak={() => (speaker.speakingId === "greeting" ? speaker.stop() : speaker.speak("greeting", phrases.greeting))} phrases={phrases} />
          ) : null}
          {empty && asGuest && !guestSignInRequired ? <Plain muted rtl={rtl}>{phrases.consent}</Plain> : null}

          {turns.map((turn) => (
            <View key={turn._id} style={styles.turn}>
              <Bubble side="user" rtl={rtl} phrases={phrases}
                text={turn.attachment ? `📄 ${turn.attachment.fileName}${turn.transcript ? `\n${turn.transcript}` : ""}` : turn.transcript || (turn.inputKind === "audio" ? "🎤 …" : "")} />
              {turn.reply.kind === "pending" ? <Thinking label={phrases.thinking} /> : null}
              {turn.reply.kind === "reply" ? (
                <Bubble side="assistant" rtl={rtl} text={turn.reply.text} phrases={phrases} canSpeak={speaker.canSpeak} speaking={speaker.speakingId === turn._id}
                  onSpeak={() => (speaker.speakingId === turn._id ? speaker.stop() : turn.reply.kind === "reply" && speaker.speak(turn._id, turn.reply.text))} />
              ) : null}
              {turn.reply.kind === "reply" && turn.reply.sources?.length ? <Sources sources={turn.reply.sources} label={phrases.lawSource} /> : null}
              {turn.reply.kind === "reply" && turn.reply.booking ? (
                <BookingCard card={turn.reply.booking} active={turn._id === lastTurnId && !busy} rtl={rtl} locale={locale} phrases={phrases} onChoose={(input) => void submit(input)} />
              ) : null}
              {turn.reply.kind === "unavailable" ? <Plain muted rtl={rtl}>{failureText(turn.reply.reason, phrases)}</Plain> : null}
            </View>
          ))}
          {notice ? <Card tone="warn"><Plain rtl={rtl}>{notice}</Plain></Card> : null}
        </ScrollView>

        <View style={styles.dock}>
          {guestSignInRequired ? null : <BigButton icon="briefcase" label={phrases.talkToLawyer} tone={suggestLawyer ? "lawyer" : "plain"} disabled={busy}
            onPress={() => void submit({ kind: "booking", action: "find", label: phrases.bookLawyer })} />}
          {guestSignInRequired || outOfGuestTurns ? (
            <Card tone="warn">
              <Plain rtl={rtl}>{phrases.guestLimit}</Plain>
              <BigButton icon="call" label={phrases.signIn} onPress={() => router.push("/sign-in")} />
            </Card>
          ) : typing ? (
            <View style={styles.typeRow}>
              <IconButton icon="mic" label={phrases.tapToSpeak} onPress={() => setTyping(false)} />
              <TextInput
                style={[styles.input, rtl && styles.rtlInput]}
                value={draft}
                onChangeText={setDraft}
                placeholder={phrases.typeHere}
                multiline
                maxLength={2000}
                editable={!busy}
                accessibilityLabel={phrases.typeHere}
              />
              <IconButton icon="send" label={phrases.send} onPress={sendTyped} />
            </View>
          ) : (
            <View style={styles.micRow}>
              <View style={styles.side}>
                {recording
                  ? <IconButton icon="close-circle" label={phrases.cancelRecording} onPress={() => void recorder.cancel()} showLabel />
                  : busy ? null : <IconButton icon="attach" label={phrases.attach} onPress={() => setAttaching(true)} />}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={recording ? phrases.listening : phrases.tapToSpeak}
                accessibilityState={{ busy, disabled: busy }}
                disabled={busy}
                onPress={onMic}
                style={({ pressed }) => [styles.mic, recording && styles.micOn, (pressed || busy) && { opacity: 0.8 }]}
              >
                <Ionicons name={recording ? "stop" : busy ? "hourglass-outline" : "mic"} size={52} color="#fff" />
              </Pressable>
              <View style={styles.side}>
                {recording ? null : <IconButton icon="create-outline" label={phrases.typeInstead} onPress={() => setTyping(true)} />}
              </View>
            </View>
          )}
          {!guestSignInRequired && !outOfGuestTurns && !typing ? (
            <Text style={styles.micLabel}>
              {recording ? `${phrases.listening}  ${Math.floor(recorder.elapsedMs / 1000)}s` : busy ? phrases.thinking : phrases.tapToSpeak}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <Modal visible={attaching} transparent animationType="slide" onRequestClose={() => setAttaching(false)}>
        <Pressable style={styles.sheetBackdrop} accessibilityRole="button" accessibilityLabel={phrases.cancelRecording} onPress={() => setAttaching(false)} />
        <View style={styles.sheet}>
          <Plain rtl={rtl}>{phrases.attachHint}</Plain>
          <BigButton icon="camera" label={phrases.takePhoto} onPress={() => void attachFrom("camera")} />
          <BigButton icon="images" label={phrases.choosePhoto} tone="plain" onPress={() => void attachFrom("photo")} />
          <BigButton icon="document-text" label={phrases.choosePdf} tone="plain" onPress={() => void attachFrom("pdf")} />
          <BigButton icon="close" label={phrases.cancelRecording} tone="plain" onPress={() => setAttaching(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Bubble({ side, text, rtl, phrases, canSpeak = false, speaking = false, onSpeak }: {
  side: "user" | "assistant"; text: string; rtl: boolean; phrases: Phrases; canSpeak?: boolean; speaking?: boolean; onSpeak?: () => void;
}) {
  if (!text) return null;
  const assistant = side === "assistant";
  return (
    <View style={[styles.bubble, assistant ? styles.assistant : styles.user]}>
      <Text style={[assistant ? styles.assistantText : styles.userText, rtl && styles.rtlText]}>{text}</Text>
      {assistant && canSpeak && onSpeak ? (
        <Pressable accessibilityRole="button" accessibilityLabel={speaking ? phrases.stop : phrases.listenAgain} onPress={onSpeak} style={styles.speak}>
          <Ionicons name={speaking ? "stop-circle" : "volume-high"} size={26} color={voice.brand} />
          <Text style={styles.speakLabel}>{speaking ? phrases.stop : phrases.listenAgain}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** The law excerpts an answer was based on. Tap one to read the exact words, or open the official page. */
function Sources({ sources, label }: { sources: LawSource[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={styles.sources}>
      <View style={styles.row}>
        <Ionicons name="book" size={18} color={voice.lawyer} />
        <Text style={styles.sourcesTitle}>{label}</Text>
      </View>
      {sources.map((source, index) => (
        <View key={`${source.url}-${index}`} style={styles.source}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === index }} onPress={() => setOpen(open === index ? null : index)} style={styles.sourceHead}>
            <Text style={styles.sourceLabel}>{lawSourceLabel(source)}</Text>
            <Ionicons name={open === index ? "chevron-up" : "chevron-down"} size={20} color={voice.muted} />
          </Pressable>
          {open === index ? (
            <>
              <Text style={styles.sourceQuote}>{source.quote}</Text>
              <Pressable accessibilityRole="link" accessibilityLabel={source.title} onPress={() => void Linking.openURL(source.url)} style={styles.sourceLink}>
                <Ionicons name="open-outline" size={18} color={voice.brand} />
                <Text style={styles.sourceLinkText}>{source.url.replace(/^https:\/\//, "").split("/")[0]}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/**
 * The lawyers, times or question from a booking reply, so they can be seen and tapped as well as spoken.
 * A tap sends the same step a spoken answer would ("number 2", "yes"), straight to the server.
 */
function BookingCard({ card, active, rtl, locale, phrases, onChoose }: {
  card: BookingCardData; active: boolean; rtl: boolean; locale: VoiceLocale; phrases: Phrases; onChoose: (input: BookingInput) => void;
}) {
  const tag = speechTagFor(locale);
  const languageName = (code: string) => (VOICE_LOCALES as readonly string[]).includes(code) ? phrasesFor(code as VoiceLocale).name : code;
  const choice = (key: string, number: number, title: string, lines: string[], input: BookingInput) => (
    <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${number}. ${title}`} accessibilityState={{ disabled: !active }} disabled={!active}
      onPress={() => onChoose(input)} style={({ pressed }) => [styles.choice, pressed && styles.pressed, !active && styles.inactive]}>
      <View style={styles.choiceNumber}><Text style={styles.choiceNumberText}>{number}</Text></View>
      <View style={styles.flex}>
        <Text style={[styles.cardTitle, rtl && styles.rtlText]}>{title}</Text>
        {lines.map((line) => <Text key={line} style={[styles.cardText, rtl && styles.rtlText]}>{line}</Text>)}
      </View>
    </Pressable>
  );
  switch (card.stage) {
    case "lawyer":
      return (
        <View style={styles.booking}>
          {(card.lawyers ?? []).map((lawyer, index) => choice(lawyer.name, index + 1, lawyer.name, [
            `${lawyer.city} · ${lawyer.yearsExperience} ${phrases.yearsExperience}`,
            lawyer.locales.map(languageName).join(", "),
            ...(lawyer.nextStart ? [`🕑 ${formatIst(lawyer.nextStart, tag)}`] : []),
          ], { kind: "booking", action: "choose_lawyer", option: index + 1, label: lawyer.name }))}
          <Pressable accessibilityRole="link" onPress={() => router.push("/lawyers")} style={styles.sourceLink}>
            <Ionicons name="list" size={18} color={voice.brand} />
            <Text style={styles.sourceLinkText}>{phrases.seeAllLawyers}</Text>
          </Pressable>
        </View>
      );
    case "time":
      return (
        <View style={styles.booking}>
          {card.lawyerName ? <Text style={[styles.cardTitle, rtl && styles.rtlText]}>{card.lawyerName}</Text> : null}
          {(card.times ?? []).map((start, index) => {
            const when = formatIst(start, tag);
            return choice(String(start), index + 1, when, [], { kind: "booking", action: "choose_time", option: index + 1, label: when });
          })}
        </View>
      );
    case "confirm":
      return (
        <View style={styles.booking}>
          <Text style={[styles.cardTitle, rtl && styles.rtlText]}>{card.lawyerName}{card.start ? ` · ${formatIst(card.start, tag)}` : ""}</Text>
          {card.summary ? <Text style={[styles.summary, rtl && styles.rtlText]}>{card.summary}</Text> : null}
          {active ? (
            <>
              <BigButton icon="checkmark-circle" label={phrases.yesBook} tone="lawyer" onPress={() => onChoose({ kind: "booking", action: "yes", label: phrases.yesBook })} />
              <BigButton icon="close-circle" label={phrases.no} tone="plain" onPress={() => onChoose({ kind: "booking", action: "no", label: phrases.no })} />
            </>
          ) : null}
        </View>
      );
    case "booked":
      return (
        <Card tone="ok">
          <View style={styles.row}>
            <Ionicons name="checkmark-circle" size={28} color={voice.lawyer} />
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, rtl && styles.rtlText]}>{phrases.appointment}: {card.lawyerName}</Text>
              {card.start ? <Text style={styles.cardText}>{formatIst(card.start, tag)}</Text> : null}
              <Text style={styles.cardStatus}>{phrases.statusPending}</Text>
            </View>
          </View>
          {card.fee && card.bookingId ? (
            <BigButton icon="card" label={`${phrases.payFee} · ₹${card.fee}`} tone="lawyer"
              onPress={() => router.push({ pathname: "/payment", params: { bookingId: card.bookingId! } })} />
          ) : null}
        </Card>
      );
    case "paid":
      return (
        <Card tone="ok">
          <View style={styles.row}>
            <Ionicons name="checkmark-done-circle" size={30} color={voice.lawyer} />
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, rtl && styles.rtlText]}>{phrases.paidLabel} · ₹{card.fee}</Text>
              <Text style={styles.cardText}>{card.lawyerName}{card.start ? ` · ${formatIst(card.start, tag)}` : ""}</Text>
              {card.reference ? <Text style={styles.cardText}>{card.reference}</Text> : null}
              <Text style={styles.demoNote}>{phrases.demoPaymentNote}</Text>
            </View>
          </View>
        </Card>
      );
    case "sign_in":
      return active ? <BigButton icon="call" label={phrases.signIn} onPress={() => router.push("/sign-in")} /> : null;
    default:
      return null;
  }
}

function Thinking({ label }: { label: string }) {
  return (
    <View style={[styles.bubble, styles.assistant, styles.row]}>
      <Ionicons name="ellipsis-horizontal" size={26} color={voice.muted} />
      <Text style={styles.cardText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  newProblem: { paddingHorizontal: 16, paddingBottom: 8 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { gap: 12, padding: 20, paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: voice.bg },
  sources: { alignSelf: "stretch", marginRight: "8%", gap: 6, padding: 12, borderRadius: 16, backgroundColor: voice.lawyerSoft },
  booking: { alignSelf: "stretch", gap: 8 },
  choice: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 64, borderRadius: 16, borderWidth: 2, borderColor: voice.lawyer, backgroundColor: voice.card },
  choiceNumber: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: voice.lawyer },
  choiceNumberText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  pressed: { opacity: 0.7 },
  inactive: { opacity: 0.5, borderColor: voice.line },
  demoNote: { fontSize: 13, color: voice.muted, fontStyle: "italic" },
  summary: { fontSize: 17, lineHeight: 25, color: voice.ink, padding: 12, borderRadius: 12, backgroundColor: voice.lawyerSoft },
  sourcesTitle: { fontSize: 15, fontWeight: "700", color: voice.lawyer },
  source: { gap: 6, paddingVertical: 4 },
  sourceHead: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36 },
  sourceLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: voice.ink },
  sourceQuote: { fontSize: 15, lineHeight: 22, color: voice.ink },
  sourceLink: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36 },
  sourceLinkText: { fontSize: 15, color: voice.brand, textDecorationLine: "underline" },
  safe: { flex: 1, backgroundColor: voice.bg },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 },
  headerRight: { flexDirection: "row", alignItems: "center" },
  sos: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, minHeight: 48, borderRadius: 24, backgroundColor: voice.mic },
  sosText: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  langPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, minHeight: 48, borderRadius: 24, backgroundColor: voice.brandSoft },
  langText: { fontSize: 18, fontWeight: "700", color: voice.brand },
  stage: { alignItems: "center", paddingBottom: 4 },
  thread: { padding: 16, gap: 14 },
  turn: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  bubble: { borderRadius: 20, padding: 16, maxWidth: "92%", gap: 10 },
  assistant: { alignSelf: "flex-start", backgroundColor: voice.card, borderWidth: 1, borderColor: voice.line, borderTopLeftRadius: 6 },
  user: { alignSelf: "flex-end", backgroundColor: voice.brandSoft, borderTopRightRadius: 6 },
  assistantText: { fontSize: 22, lineHeight: 32, color: voice.ink },
  userText: { fontSize: 18, lineHeight: 26, color: voice.ink },
  rtlText: { writingDirection: "rtl", textAlign: "right" },
  speak: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, alignSelf: "flex-start" },
  speakLabel: { fontSize: 16, fontWeight: "600", color: voice.brand },
  cardTitle: { fontSize: 18, fontWeight: "700", color: voice.ink },
  cardText: { fontSize: 17, color: voice.ink },
  cardStatus: { fontSize: 17, fontWeight: "700", color: voice.lawyer },
  dock: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 10, borderTopWidth: 1, borderTopColor: voice.line, backgroundColor: voice.bg },
  micRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  side: { width: 64, alignItems: "center" },
  mic: { width: 112, height: 112, borderRadius: 56, backgroundColor: voice.brand, alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  micOn: { backgroundColor: voice.mic },
  micLabel: { textAlign: "center", fontSize: 18, fontWeight: "600", color: voice.ink },
  typeRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  input: { flex: 1, minHeight: 56, maxHeight: 140, fontSize: 19, borderRadius: 16, borderWidth: 2, borderColor: voice.line, backgroundColor: voice.card, paddingHorizontal: 14, paddingVertical: 12, color: voice.ink },
  rtlInput: { writingDirection: "rtl", textAlign: "right" },
});
