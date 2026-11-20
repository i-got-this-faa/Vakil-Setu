import { useClerk, useSignIn, useSignUp } from "@clerk/expo";
import { useMutation } from "convex/react";
import { api } from "@legal-setu/backend/api";
import { Stack, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { VoiceLocale } from "@legal-setu/domain";
import { authErrorCode, authErrorMessage, convexErrorMessage } from "../lib/errors";
import { RTL_LOCALES, phrasesFor } from "./languages";
import { useVoiceAccount } from "./account";
import { BigButton, Card, Plain, voice } from "./ui";
import { indianMobile } from "./logic";
import { phoneAuthCopy, phoneSignInEnabled } from "./phone-auth";

type Channel = "sms" | "whatsapp";
type Mode = "sign_in" | "sign_up";

export function SignInScreen({ locale }: { locale: VoiceLocale }) {
  const phrases = phrasesFor(locale);
  const rtl = RTL_LOCALES.includes(locale);
  const account = useVoiceAccount();
  const clerk = useClerk();
  const copy = phoneAuthCopy(locale);
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const ensure = useMutation(api.accounts.ensure);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phoneEnabled, setPhoneEnabled] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [channel, setChannel] = useState<Channel>("sms");
  const [cooldown, setCooldown] = useState(0);

  const checkSettings = useCallback(async () => {
    setChecking(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const host = clerk.frontendApi;
      const url = new URL("/v1/environment", host.startsWith("https://") ? host : `https://${host}`);
      if (Platform.OS !== "web") url.searchParams.set("_is_native", "1");
      const response = await fetch(url.toString(), { signal: controller.signal, credentials: "omit" });
      if (!response.ok) throw new Error("Sign-in settings could not be loaded.");
      const environment: unknown = await response.json();
      const enabled = phoneSignInEnabled(environment);
      setPhoneEnabled(enabled);
      return enabled;
    } catch {
      setPhoneEnabled(false);
      return false;
    } finally {
      clearTimeout(timeout);
      setChecking(false);
    }
  }, [clerk.frontendApi]);

  useEffect(() => { void checkSettings(); }, [checkSettings]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (account.kind === "ready") router.dismissTo("/talk");
  }, [account.kind]);

  async function sendCode(channel: Channel) {
    const phoneNumber = indianMobile(phone);
    if (!phoneNumber || busy || checking || cooldown > 0) return;
    setBusy(true);
    setError("");
    try {
      if (!await checkSettings()) return;
      if (mode === "sign_up") {
        const resent = await signUp.verifications.sendPhoneCode({ channel });
        if (resent.error) setError(authErrorMessage(resent.error, phrases.error));
        else { setChannel(channel); setCooldown(30); }
        return;
      }
      const sent = await signIn.phoneCode.sendCode({ phoneNumber, channel });
      if (!sent.error) {
        setMode("sign_in");
        setChannel(channel);
        setCooldown(30);
        return;
      }
      if (authErrorCode(sent.error) !== "form_identifier_not_found") {
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
      else { setMode("sign_up"); setChannel(channel); setCooldown(30); }
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
        if (signUp.status !== "complete") return setError(copy.incomplete);
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
        <BigButton icon="chatbox-ellipses" label={phrases.sendSms} busy={busy || checking} disabled={!valid || phoneEnabled !== true || cooldown > 0} onPress={() => void sendCode("sms")} />
        <BigButton icon="logo-whatsapp" label={phrases.sendWhatsApp} tone="plain" busy={busy || checking} disabled={!valid || phoneEnabled !== true || cooldown > 0} onPress={() => void sendCode("whatsapp")} />
      </>
    );
  } else {
    body = (
      <>
        <Text style={[styles.label, rtl && styles.rtl]}>{phrases.enterCode}</Text>
        <TextInput style={[styles.input, styles.code]} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} autoFocus autoComplete="one-time-code" textContentType="oneTimeCode" accessibilityLabel={phrases.enterCode} />
        <BigButton icon="checkmark" label={phrases.continue} busy={busy} disabled={code.trim().length < 4} onPress={() => void verify()} />
        <BigButton icon="refresh" label={`${copy.resend}${cooldown > 0 ? ` (${cooldown}s)` : ""}`} tone="plain" busy={busy} disabled={cooldown > 0} onPress={() => void sendCode(channel)} />
        <BigButton icon="create-outline" label={copy.change} tone="plain" disabled={busy} onPress={() => { setMode(null); setCode(""); setError(""); }} />
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior="padding">
      <Stack.Screen options={{ title: phrases.signIn }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {body}
        {account.kind === "guest" && phoneEnabled === false ? <Card tone="warn">
          <Plain rtl={rtl}>{copy.unavailable}</Plain>
          <BigButton icon="refresh" label={copy.retry} tone="plain" busy={checking} onPress={() => void checkSettings()} />
          <BigButton icon="mic" label={phrases.backToTalk} tone="plain" onPress={() => router.dismissTo("/talk")} />
        </Card> : null}
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
