import { useSignUp } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { Body, Button, Card, Notice, Screen, Small, TextField, Title } from "../../components/ui";
import { authErrorMessage } from "../../lib/errors";
import { STRINGS } from "../../lib/strings";

type Step = "details" | "verify";

/** Native sign-up: email + password, then a one-time email code before the session starts. */
export function SignUpScreen() {
  const { signUp } = useSignUp();
  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function finish() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/discover");
  }

  async function createAccount() {
    setBusy(true);
    setError("");
    try {
      const created = await signUp.password({ emailAddress: email.trim(), password });
      if (created.error) {
        setError(authErrorMessage(created.error));
        return;
      }
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) setError(authErrorMessage(sent.error));
      else setStep("verify");
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const verified = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verified.error) {
        setError(authErrorMessage(verified.error));
        return;
      }
      const finalized = await signUp.finalize();
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
        <Title>{STRINGS.signUpTitle}</Title>
        <Body muted>{STRINGS.signUpBody}</Body>
        {step === "details" ? (
          <>
            <TextField
              label={STRINGS.emailLabel}
              value={email}
              onChangeText={setEmail}
              editable={!busy}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              maxLength={254}
            />
            <TextField
              label={STRINGS.newPasswordLabel}
              value={password}
              onChangeText={setPassword}
              editable={!busy}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              maxLength={256}
              hint={STRINGS.passwordHint}
            />
          </>
        ) : (
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
        )}
        {error ? <Notice tone="error">{error}</Notice> : null}
        {step === "details" ? (
          <Button
            label={STRINGS.createAccount}
            busyLabel={STRINGS.creatingAccount}
            busy={busy}
            disabled={!emailValid || password.length < 8}
            onPress={() => void createAccount()}
          />
        ) : (
          <Button label={STRINGS.verifyCode} busyLabel={STRINGS.signingIn} busy={busy} disabled={code.trim().length < 4} onPress={() => void verify()} />
        )}
        <Button variant="secondary" label={STRINGS.haveAccount} disabled={busy} onPress={() => router.replace("/sign-in")} />
        <Small>{STRINGS.authTermsNote}</Small>
      </Card>
    </Screen>
  );
}
