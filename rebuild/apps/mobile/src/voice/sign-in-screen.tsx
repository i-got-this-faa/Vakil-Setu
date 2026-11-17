import { useSignIn, useSignUp } from "@clerk/expo";
import { useMutation } from "convex/react";
import { api } from "@legal-setu/backend/api";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { VoiceLocale } from "@legal-setu/domain";
import { authErrorMessage, convexErrorMessage } from "../lib/errors";
import { RTL_LOCALES, phrasesFor } from "./languages";
import { useVoiceAccount } from "./account";
import { BigButton, Card, Plain, voice } from "./ui";
import { indianMobile } from "./logic";

type Channel = "sms" | "whatsapp";
type Mode = "sign_in" | "sign_up";

function errorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) return "";
  if ("code" in error && typeof error.code === "string") return error.code;
  if ("errors" in error && Array.isArray(error.errors) && typeof error.errors[0]?.code === "string") return error.errors[0].code;
  return "";
}

export function SignInScreen({ locale }: { locale: VoiceLocale }) {
  const phrases = phrasesFor(locale);
  const rtl = RTL_LOCALES.includes(locale);
  const account = useVoiceAccount();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const ensure = useMutation(api.accounts.ensure);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (account.kind === "ready") router.dismissTo("/talk");
  }, [account.kind]);

  async function sendCode(channel: Channel) {
    const phoneNumber = indianMobile(phone);
    if (!phoneNumber) return;
    setBusy(true);
    setError("");
    try {
      const sent = await signIn.phoneCode.sendCode({ phoneNumber, channel });
      if (!sent.error) {
        setMode("sign_in");
        return;
      }
      if (errorCode(sent.error) !== "form_identifier_not_found") {
        setError(authErrorMessage(sent.error, phrases.error));
        return;
      }
      // New number: create the account with the same one-time code.
      const created = await signUp.create({ phoneNumber });
      if (created.error) {
        setError(authErrorMessage(created.error, phrases.error));
        return;
      }
      const signUpSent = await signUp.verifications.sendPhoneCode({ channel });
      if (signUpSent.error) setError(authErrorMessage(signUpSent.error, phrases.error));
      else setMode("sign_up");
    } catch (failure) {
      setError(authErrorMessage(failure, phrases.error));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      if (mode === "sign_in") {
        const verified = await signIn.phoneCode.verifyCode({ code: code.trim() });
        if (verified.error) return setError(authErrorMessage(verified.error, phrases.error));
        if (signIn.status !== "complete") return setError(phrases.error);
        const finalized = await signIn.finalize();
        if (finalized.error) setError(authErrorMessage(finalized.error, phrases.error));
      } else {
        const verified = await signUp.verifications.verifyPhoneCode({ code: code.trim() });
        if (verified.error) return setError(authErrorMessage(verified.error, phrases.error));
        if (signUp.status !== "complete") return setError(phrases.error);
        const finalized = await signUp.finalize();
        if (finalized.error) setError(authErrorMessage(finalized.error, phrases.error));
      }
    } catch (failure) {
      setError(authErrorMessage(failure, phrases.error));
    } finally {
      setBusy(false);
    }
  }

  async function saveName() {
    const displayName = name.trim();
    if (!displayName) return;
    setBusy(true);
    setError("");
    try {
      await ensure({ role: "user", displayName: displayName.slice(0, 100), locale });
    } catch (failure) {
      setError(convexErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  let body;
  if (account.kind === "loading" || account.kind === "ready") {
    body = <ActivityIndicator size="large" color={voice.brand} />;
  } else if (account.kind === "not_user") {
    body = <Card tone="warn"><Plain rtl={rtl}>{phrases.error}</Plain></Card>;
  } else if (account.kind === "needs_name") {
    body = (
      <>
        <Text style={[styles.label, rtl && styles.rtl]}>{phrases.yourName}</Text>
        <TextInput style={[styles.input, rtl && styles.rtl]} value={name} onChangeText={setName} maxLength={100} autoFocus autoComplete="name" textContentType="name" accessibilityLabel={phrases.yourName} />
        <BigButton icon="checkmark" label={phrases.continue} busy={busy} disabled={!name.trim()} onPress={() => void saveName()} />
      </>
    );
  } else if (mode === null) {
    const valid = indianMobile(phone) !== null;
    body = (
      <>
        <Text style={[styles.label, rtl && styles.rtl]}>{phrases.phoneNumber}</Text>
        <View style={styles.phoneRow}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput style={[styles.input, styles.flex]} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={14} autoComplete="tel" textContentType="telephoneNumber" accessibilityLabel={phrases.phoneNumber} />
        </View>
        <BigButton icon="logo-whatsapp" label={phrases.sendWhatsApp} tone="lawyer" busy={busy} disabled={!valid} onPress={() => void sendCode("whatsapp")} />
        <BigButton icon="chatbox-ellipses" label={phrases.sendSms} busy={busy} disabled={!valid} onPress={() => void sendCode("sms")} />
      </>
    );
  } else {
    body = (
      <>
        <Text style={[styles.label, rtl && styles.rtl]}>{phrases.enterCode}</Text>
        <TextInput style={[styles.input, styles.code]} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} autoFocus autoComplete="one-time-code" textContentType="oneTimeCode" accessibilityLabel={phrases.enterCode} />
        <BigButton icon="checkmark" label={phrases.continue} busy={busy} disabled={code.trim().length < 4} onPress={() => void verify()} />
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior="padding">
      <Stack.Screen options={{ title: phrases.signIn }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {body}
        {error ? <Card tone="warn"><Plain>{error}</Plain></Card> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: voice.bg },
  content: { padding: 20, gap: 16 },
  flex: { flex: 1 },
  label: { fontSize: 21, fontWeight: "700", color: voice.ink },
  rtl: { writingDirection: "rtl", textAlign: "right" },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prefix: { fontSize: 24, fontWeight: "700", color: voice.ink },
  input: { minHeight: 64, fontSize: 26, borderRadius: 16, borderWidth: 2, borderColor: voice.line, backgroundColor: voice.card, paddingHorizontal: 16, color: voice.ink },
  code: { letterSpacing: 8, textAlign: "center" },
});
