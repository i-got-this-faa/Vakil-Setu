import { useUser } from "@clerk/expo";
import { router } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@legal-setu/backend/api";
import { getLanguage } from "@legal-setu/i18n";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Body, Button, Card, Chip, Heading, Loading, Notice, Screen, Small, Stack, TextField, Title } from "../../components/ui";
import { convexErrorMessage } from "../../lib/errors";
import { INTERFACE_LOCALES, type InterfaceLocale } from "../../lib/locale";
import { copyFor, useLocale } from "../../providers/locale";
import { useAccountGateState } from "../../hooks/use-account-gate";
import type { AccountView } from "../../lib/account-state";
import { STRINGS } from "../../lib/strings";

const AccountContext = createContext<AccountView | null>(null);

export function useAccount(): AccountView {
  const account = useContext(AccountContext);
  if (account === null) throw new Error("useAccount must be used inside AccountGate.");
  return account;
}

/** Private screens render only for an active user account. Everything else gets an explicit state. */
export function AccountGate({ children }: { children: ReactNode }) {
  const gate = useAccountGateState();
  const { copy } = useLocale();
  switch (gate.kind) {
    case "loading":
      return (
        <Screen>
          <Loading label={STRINGS.loading} />
        </Screen>
      );
    case "signed_out":
      return <SignedOutPrompt />;
    case "onboarding":
      return <Onboarding />;
    case "disabled":
      return (
        <Screen>
          <Notice tone="error">{copy.product.accountDisabled}</Notice>
        </Screen>
      );
    case "use_website":
      return (
        <Screen>
          <Card>
            <Heading>{STRINGS.useWebsiteTitle}</Heading>
            <Body>{STRINGS.useWebsiteBody}</Body>
          </Card>
        </Screen>
      );
    case "ready":
      return <AccountContext.Provider value={gate.account}>{children}</AccountContext.Provider>;
    default: {
      const exhaustive: never = gate;
      return exhaustive;
    }
  }
}

export function SignedOutPrompt({ title = STRINGS.signedOutTitle, body = STRINGS.signedOutBody }: { title?: string; body?: string }) {
  return (
    <Screen>
      <Card>
        <Title>{title}</Title>
        <Body muted>{body}</Body>
        <Button label={STRINGS.signIn} onPress={() => router.push("/sign-in")} />
        <Button variant="secondary" label={STRINGS.createAccount} onPress={() => router.push("/sign-up")} />
      </Card>
    </Screen>
  );
}

function Onboarding() {
  const { user } = useUser();
  const { locale, setLocale } = useLocale();
  const ensure = useMutation(api.accounts.ensure);
  const [displayName, setDisplayName] = useState(user?.fullName ?? user?.firstName ?? "");
  const [chosen, setChosen] = useState<InterfaceLocale>(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copy = copyFor(chosen);
  async function submit() {
    const name = displayName.trim();
    if (!name) {
      setError(STRINGS.onboardingNameRequired);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await ensure({ role: "user", displayName: name.slice(0, 100), locale: chosen });
      setLocale(chosen);
    } catch (failure) {
      setError(convexErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Card>
        <Title>{STRINGS.onboardingTitle}</Title>
        <Body muted>{STRINGS.onboardingBody}</Body>
        <TextField
          label={STRINGS.displayNameLabel}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={100}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
        <Stack>
          <Small>{STRINGS.languageLabel}</Small>
          <Stack>
            {INTERFACE_LOCALES.map((code) => (
              <Chip key={code} label={getLanguage(code)?.nativeName ?? code} selected={chosen === code} onPress={() => setChosen(code)} />
            ))}
          </Stack>
        </Stack>
        <Small>{copy.product.onboardingRoleFixed}</Small>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button label={STRINGS.createMyAccount} busyLabel={STRINGS.creatingAccount} busy={busy} onPress={() => void submit()} />
      </Card>
    </Screen>
  );
}

