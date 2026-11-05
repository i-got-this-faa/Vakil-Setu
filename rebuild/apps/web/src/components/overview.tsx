"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAccount } from "./workspace-gate";
import { useLocale } from "./locale";
import { chatNavigationLabel } from "@/lib/chat-navigation";

export function Overview() {
  const account = useAccount();
  const { locale } = useLocale();
  const role = account?.role;
  return (
    <div lang="en-IN" dir="ltr">
      <div className="workspace-heading">
        <div>
          <h1>{account ? `Welcome, ${account.displayName}.` : "Your legal workspace"}</h1>
          <p className="page-description">
            {role === "advocate"
              ? "Manage your profile, availability, and consultation requests."
              : role === "admin"
                ? "Review advocate credentials and manage applications."
                : "Create an intake, review your summary, and keep track of consultations."}
          </p>
        </div>
      </div>
      <div className="workspace-actions">
        {role === "user" && <section className="workspace-action">
          <div><h2 lang={["hi", "pa"].includes(locale) ? locale : "en-IN"}>{chatNavigationLabel(locale)}</h2><p>Ask a legal-information question and continue with follow-up messages. You can attach documents in your conversation.</p></div>
          <Link className="btn" href="/workspace/chat" lang={["hi", "pa"].includes(locale) ? locale : "en-IN"}>{chatNavigationLabel(locale)} <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>}
        {role === "advocate" && (
          <section className="workspace-action">
            <div>
              <h2>Manage your advocate profile</h2>
              <p>Submit credentials for approval, publish availability, and respond to requests.</p>
            </div>
            <Link className="btn" href="/workspace/advocate">
              Open advocate desk <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        )}
        {role === "admin" && (
          <section className="workspace-action">
            <div>
              <h2>Review advocate applications</h2>
              <p>Check private credential evidence and record your review decision.</p>
            </div>
            <Link className="btn" href="/workspace/admin">
              Open review queue <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        )}
        <section className="workspace-action">
          <div>
            <h2>Create a private intake</h2>
            <p>Describe your concern in your chosen language, then review an editable summary.</p>
          </div>
          <Link href="/workspace/intake" className={role === "user" || !role ? "btn" : "btn secondary"}>
            Start an intake <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
        <section className="workspace-action">
          <div>
            <h2>Track your consultations</h2>
            <p>Check pending requests, accepted consultations, cancellations, and expiry.</p>
          </div>
          <Link href="/workspace/bookings" className="btn secondary">
            View consultations <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
