import { useAuth, useClerk, useSignIn, useSignUp } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { authErrorCode, authErrorMessage, convexErrorMessage } from "../lib/errors";
import { randomUUID, secureRandomHex } from "../lib/random";
import { BigButton, voice } from "../voice/ui";

const EMAIL_KEY = "legal-setu.development-demo-email";

function Status({ error, retry }: { error: string; retry?: () => void }) {
  return <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16, backgroundColor: voice.bg }}>
    {error ? <Text style={{ fontSize: 18, color: voice.warn }}>{error}</Text> : <><ActivityIndicator size="large" color={voice.brand} /><Text style={{ textAlign: "center" }}>Connecting the development demo account…</Text></>}
    {error && retry ? <BigButton icon="refresh" label="Retry demo sign-in" onPress={retry} /> : null}
  </View>;
}

/** Uses Clerk's documented test-email flow, never a fabricated backend identity. Development only. */
export function LiveDemoSession({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const started = useRef(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isLoaded || isSignedIn || started.current) return;
    started.current = true;
    void (async () => {
      if (!__DEV__ || !clerk.publishableKey.startsWith("pk_test_")) throw new Error("Automatic demo sign-in is available only with a development Clerk instance.");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      let environment: unknown;
      try {
        const host = clerk.frontendApi;
        const url = new URL("/v1/environment", host.startsWith("https://") ? host : `https://${host}`);
        if (Platform.OS !== "web") url.searchParams.set("_is_native", "1");
        const response = await fetch(url.toString(), { signal: controller.signal, credentials: "omit" });
        if (!response.ok) throw new Error(`Could not verify development authentication settings (HTTP ${response.status}).`);
        environment = await response.json();
      } finally { clearTimeout(timer); }
      if (typeof environment !== "object" || environment === null || !("auth_config" in environment)
        || typeof environment.auth_config !== "object" || environment.auth_config === null
        || !("test_mode" in environment.auth_config) || environment.auth_config.test_mode !== true) {
        throw new Error("Clerk test mode must be enabled for the development demo account.");
      }
      let emailAddress = await AsyncStorage.getItem(EMAIL_KEY);
      if (!emailAddress) {
        emailAddress = `legalsetu-${randomUUID()}+clerk_test@example.com`;
        await AsyncStorage.setItem(EMAIL_KEY, emailAddress);
      }
      const sent = await signIn.emailCode.sendCode({ emailAddress });
      if (!sent.error) {
        const verified = await signIn.emailCode.verifyCode({ code: "424242" });
        if (verified.error) throw verified.error;
        if (signIn.status !== "complete") throw new Error("The demo sign-in has additional requirements.");
        const finalized = await signIn.finalize();
        if (finalized.error) throw finalized.error;
        return;
      }
      if (authErrorCode(sent.error) !== "form_identifier_not_found") throw sent.error;
      const secret = secureRandomHex(16);
      if (!secret) throw new Error("Creating a demo account requires secure randomness. Use a development build.");
      const created = await signUp.create({ emailAddress, password: `${secret}Aa9!`, firstName: "Demo", lastName: "User" });
      if (created.error) throw created.error;
      const prepared = await signUp.verifications.sendEmailCode();
      if (prepared.error) throw prepared.error;
      const verified = await signUp.verifications.verifyEmailCode({ code: "424242" });
      if (verified.error) throw verified.error;
      if (signUp.status !== "complete") throw new Error(`The demo account requires: ${signUp.missingFields.join(", ")}.`);
      const finalized = await signUp.finalize();
      if (finalized.error) throw finalized.error;
    })().catch((failure: unknown) => setError(authErrorMessage(failure)));
  }, [isLoaded, isSignedIn, clerk, signIn, signUp, attempt]);

  if (isSignedIn) return children;
  return <Status error={error} retry={() => { started.current = false; setError(""); setAttempt(attempt + 1); }} />;
}

/** Complete normal backend onboarding with the authenticated test user. */
export function LiveDemoAccount({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.accounts.me, isAuthenticated ? {} : "skip");
  const ensure = useMutation(api.accounts.ensure);
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isAuthenticated) {
      const timer = setTimeout(() => setError("Clerk signed in, but Convex did not accept its token. Check the convex JWT template and the deployment's Clerk issuer."), 20000);
      return () => clearTimeout(timer);
    }
    setError("");
    if (me === null && !started.current) {
      started.current = true;
      void ensure({ role: "user", displayName: "Development demo user", locale: "en" }).catch((failure: unknown) => setError(convexErrorMessage(failure)));
    }
  }, [isAuthenticated, me, ensure]);
  if (me && me.role === "user" && !me.disabled) return children;
  return <Status error={me && (me.role !== "user" || me.disabled) ? "This signed-in account cannot use the user demo." : error} />;
}
