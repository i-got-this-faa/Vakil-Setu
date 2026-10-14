"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { SetupNotice, useServices } from "./providers";

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <main id="main" className="auth-page">
      {useServices().kind === "configured" ? (
        mode === "sign-in" ? (
          <SignIn routing="path" path="/sign-in" />
        ) : (
          <SignUp routing="path" path="/sign-up" />
        )
      ) : (
        <div style={{ maxWidth: 650 }}>
          <h1 style={{ fontSize: 42 }}>Account setup</h1>
          <SetupNotice />
        </div>
      )}
    </main>
  );
}
