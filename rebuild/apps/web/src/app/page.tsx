"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/components/locale";
import { chatNavigationLabel } from "@/lib/chat-navigation";

export default function Home() {
  const { copy, messages, locale } = useLocale();
  return (
    <main id="main" className="container">
      <section className="hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <h1 id="home-title">{copy.concernTitle}</h1>
          <p>{copy.heroDescription}</p>
          <div className="actions">
            <Link href="/workspace/chat" className="btn" lang={["hi", "pa"].includes(locale) ? locale : "en-IN"}>{chatNavigationLabel(locale)} <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/workspace/intake" className="btn">
              {copy.startIntake} <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/discover" className="text-link">
              {messages.navigation.findAdvocate}
            </Link>
          </div>
        </div>
        <aside className="intake-guide" aria-labelledby="intake-guide-title">
          <h2 id="intake-guide-title" lang="en-IN" dir="ltr">What to include</h2>
          <p>{copy.concernDescription}</p>
          <p className="intake-guide-note">{copy.intakeStaysNote}</p>
        </aside>
      </section>

      <section className="home-workflow" aria-labelledby="workflow-title" lang="en-IN" dir="ltr">
        <div className="workflow-intro">
          <h2 id="workflow-title">How it works</h2>
          <Link href="/how-it-works" className="text-link">
            Read the full guide <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <ol className="workflow-list">
          <li>
            <h3>Write down your concern</h3>
            <p>
              Type what happened, or use browser voice input where available.
              Review and edit the text before saving it to your private workspace.
            </p>
          </li>
          <li>
            <h3>Review your summary</h3>
            <p>
              Write or edit a summary for your consultation. AI assistance is
              optional and needs your consent. Check the facts before sharing.
            </p>
          </li>
          <li>
            <h3>Request a consultation</h3>
            <p>
              Choose an approved advocate and an available time. Share the
              summary you reviewed. Your request needs the advocate's acceptance.
            </p>
          </li>
        </ol>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-title" lang="en-IN" dir="ltr">
        <h2 id="privacy-title">You decide what to share.</h2>
        <dl className="privacy-facts">
          <div>
            <dt>Private drafts</dt>
            <dd>Only the summary version you approve is shared with your chosen advocate.</dd>
          </div>
          <div>
            <dt>Reviewed profiles</dt>
            <dd>Advocate approval follows a private credential review.</dd>
          </div>
          <div>
            <dt>Your choice</dt>
            <dd>Choose the advocate, the summary version, and the consultation time.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
