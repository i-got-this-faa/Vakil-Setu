import { useAuth, useClerk, useUser } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { getLanguage } from "@legal-setu/i18n";
import { Body, Button, Card, Chip, Heading, Notice, Screen, Small, Stack, Title } from "../../components/ui";
import { useAccountGateState } from "../../hooks/use-account-gate";
import { INTERFACE_LOCALES, type InterfaceLocale } from "../../lib/locale";
import { convexErrorMessage } from "../../lib/errors";
import { useLocale } from "../../providers/locale";
import { STRINGS } from "../../lib/strings";

export function ProfileScreen() {
  const { locale, setLocale, copy, messages } = useLocale();
  const gate = useAccountGateState();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setSigningOut(true);
    setError("");
    try {
      await clerk.signOut();
    } catch (failure) {
      setError(convexErrorMessage(failure));
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen>
      <Title>{messages.navigation.profile}</Title>
      <Card>
        <Heading>{STRINGS.accountHeading}</Heading>
        {gate.kind === "ready" ? (
          <>
            <Body>{gate.account.displayName}</Body>
            <Small>{STRINGS.roleUser} · {getLanguage(gate.account.locale)?.nativeName ?? gate.account.locale}</Small>
          </>
        ) : gate.kind === "onboarding" ? (
          <>
            <Body>{user?.fullName ?? STRINGS.accountNotSetUp}</Body>
            <Button variant="secondary" label={STRINGS.finishSetup} onPress={() => router.push("/(tabs)/cases")} />
          </>
        ) : gate.kind === "use_website" ? (
          <Notice tone="info">{STRINGS.useWebsiteBody}</Notice>
        ) : gate.kind === "disabled" ? (
          <Notice tone="error">{copy.product.accountDisabled}</Notice>
        ) : isSignedIn ? (
          <Small>{STRINGS.connecting}</Small>
        ) : (
          <>
            <Body muted>{STRINGS.signedOutProfile}</Body>
            <Button label={STRINGS.signIn} onPress={() => router.push("/sign-in")} />
            <Button variant="secondary" label={STRINGS.createAccount} onPress={() => router.push("/sign-up")} />
          </>
        )}
        {isSignedIn ? (
          <Button variant="secondary" label={messages.navigation.signOut} busy={signingOut} busyLabel={STRINGS.saving} onPress={() => void signOut()} />
        ) : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
      </Card>

      <Card>
        <Heading>{messages.navigation.switchLanguage}</Heading>
        <Small>{STRINGS.languageDescription}</Small>
        <Stack>
          {INTERFACE_LOCALES.map((code: InterfaceLocale) => (
            <Chip
              key={code}
              label={getLanguage(code)?.nativeName ?? code}
              selected={locale === code}
              onPress={() => setLocale(code)}
            />
          ))}
        </Stack>
        <Notice tone="warning">{copy.qualityNotice}</Notice>
      </Card>

      <Card>
        <Heading>{STRINGS.webOnlyHeading}</Heading>
        <Body muted>{STRINGS.webOnlyBody}</Body>
      </Card>

      <Small>{STRINGS.legalFooter}</Small>
    </Screen>
  );
}
