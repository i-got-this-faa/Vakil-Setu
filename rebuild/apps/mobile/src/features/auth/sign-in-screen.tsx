import { useSignIn } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { Body, Button, Card, Notice, Screen, Small, TextField, Title } from "../../components/ui";
import { authErrorMessage } from "../../lib/errors";
import { STRINGS } from "../../lib/strings";

type Step = "credentials" | "code";
type Method = "password" | "email_code";

/** Native sign-in. Password is the default; an email code is available for users who prefer it. */
export function SignInScreen() {
  const { signIn } = useSignIn();
  const [method, setMethod] = useState<Method>("password");
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function finish() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/discover");
  }

  async function submitPassword() {
    setBusy(true);
    setError("");
    try {
      const attempt = await signIn.password({ emailAddress: email.trim(), password });
      if (attempt.error) {
        setError(authErrorMessage(attempt.error));
        return;
      }
      if (signIn.status !== "complete") {
        setError(STRINGS.signInNeedsWebsite);
        return;
      }
      const finalized = await signIn.finalize();
      if (finalized.error) setError(authErrorMessage(finalized.error));
      else finish();
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function sendCode() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await signIn.create({ identifier: email.trim() });
      if (created.error) {
        setError(authErrorMessage(created.error));
        return;
      }
      const sent = await signIn.emailCode.sendCode();
      if (sent.error) setError(authErrorMessage(sent.error));
      else {
        setStep("code");
        setNotice(STRINGS.codeSentNotice);
      }
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    setError("");
    try {
      const verified = await signIn.emailCode.verifyCode({ code: code.trim() });
      if (verified.error) {
        setError(authErrorMessage(verified.error));
        return;
      }
      if (signIn.status !== "complete") {
        setError(STRINGS.signInNeedsWebsite);
        return;
      }
      const finalized = await signIn.finalize();
      if (finalized.error) setError(authErrorMessage(finalized.error));
      else finish();
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  return (
    <Screen>
      <Card>
        <Title>{STRINGS.signInTitle}</Title>
        <Body muted>{STRINGS.signInBody}</Body>
        <TextField
          label={STRINGS.emailLabel}
          value={email}
          onChangeText={setEmail}
          editable={!busy && step === "credentials"}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          maxLength={254}
        />
        {method === "password" ? (
          <TextField
            label={STRINGS.passwordLabel}
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            maxLength={256}
          />
        ) : null}
        {method === "email_code" && step === "code" ? (
          <TextField
            label={STRINGS.codeLabel}
            value={code}
            onChangeText={setCode}
            editable={!busy}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
            hint={STRINGS.codeHint}
          />
        ) : null}
        {notice ? <Notice tone="success">{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        {method === "password" ? (
          <Button
            label={STRINGS.signIn}
            busyLabel={STRINGS.signingIn}
            busy={busy}
            disabled={!emailValid || password.length === 0}
            onPress={() => void submitPassword()}
          />
        ) : step === "credentials" ? (
          <Button label={STRINGS.sendCode} busyLabel={STRINGS.sendingCode} busy={busy} disabled={!emailValid} onPress={() => void sendCode()} />
        ) : (
          <Button label={STRINGS.verifyCode} busyLabel={STRINGS.signingIn} busy={busy} disabled={code.trim().length < 4} onPress={() => void verifyCode()} />
        )}
        <Button
          variant="secondary"
          label={method === "password" ? STRINGS.useEmailCodeInstead : STRINGS.usePasswordInstead}
          disabled={busy}
          onPress={() => {
            setMethod(method === "password" ? "email_code" : "password");
            setStep("credentials");
            setCode("");
            setError("");
            setNotice("");
          }}
        />
        <Button variant="secondary" label={STRINGS.createAccount} disabled={busy} onPress={() => router.replace("/sign-up")} />
        <Small>{STRINGS.authTermsNote}</Small>
      </Card>
    </Screen>
  );
}
