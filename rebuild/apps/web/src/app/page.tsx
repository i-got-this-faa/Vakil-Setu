"use client";
import { useLocale } from "@/components/locale";
import Link from "next/link";
import {
  ArrowRight,
  FilePenLine,
  Languages,
  LockKeyhole,
  Scale,
  ShieldCheck,
  UserRoundCheck,
  CalendarDays,
} from "lucide-react";

export default function Home() {
  const { copy, messages } = useLocale();
  return (
    <main id="main" className="container">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Clarity begins with a conversation</div>
          <h1>
            {copy.headline}
            <br />
            <em>{copy.headlineAccent}</em>
          </h1>
          <p>{copy.heroDescription}</p>
          <div className="actions">
            <Link href="/workspace/intake" className="btn">
              {copy.startIntake} <ArrowRight size={16} />
            </Link>
            <Link href="/discover" className="text-link small-text">
              Explore advocates ↗
            </Link>
          </div>
          <div className="hero-foot">
            <LockKeyhole size={13} />
            You choose what to share, and with whom.
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="arch" />
          <Scale className="art-scale" />
          <div className="art-caption">
            <strong>A bridge, built around you.</strong>
            <p>From the first words to a considered next step.</p>
          </div>
        </div>
      </section>
      <div className="principles">
        <div className="principle">
          <Languages size={23} strokeWidth={1.4} />
          <div>
            Choose your language
            <span>English · हिन्दी · ਪੰਜਾਬੀ interface pilot</span>
          </div>
        </div>
        <div className="principle">
          <ShieldCheck size={23} strokeWidth={1.4} />
          <div>
            Reviewed advocate profiles
            <span>Approval follows private credential review</span>
          </div>
        </div>
        <div className="principle">
          <LockKeyhole size={23} strokeWidth={1.4} />
          <div>
            Private until you decide
            <span>Approve a specific summary before sharing</span>
          </div>
        </div>
      </div>
      <section className="section" id="workflow">
        <div className="section-head">
          <div>
            <div className="eyebrow">A thoughtful way forward</div>
            <h2>From concern to connection.</h2>
          </div>
          <p>
            A clear workflow, with room to read, edit, and decide at every step.
          </p>
        </div>
        <div className="steps">
          <article className="step">
            <div className="step-number">
              01 / YOUR WORDS
              <FilePenLine size={27} strokeWidth={1.2} />
            </div>
            <h3>Tell your story.</h3>
            <p>
              Type your concern, or try browser voice input where available.
              Review and edit the text before saving it to your private
              workspace.
            </p>
          </article>
          <article className="step">
            <div className="step-number">
              02 / YOUR UNDERSTANDING
              <UserRoundCheck size={27} strokeWidth={1.2} />
            </div>
            <h3>Make it clear.</h3>
            <p>
              Write and revise a private summary. AI assistance is shown only if
              a real provider returns a validated result; you remain in control.
            </p>
          </article>
          <article className="step">
            <div className="step-number">
              03 / YOUR NEXT STEP
              <CalendarDays size={27} strokeWidth={1.2} />
            </div>
            <h3>Choose an advocate.</h3>
            <p>
              Browse approved profiles and open slots. Approve sharing your
              summary, then request a consultation. The advocate confirms
              acceptance.
            </p>
          </article>
        </div>
      </section>
      <section className="cta-panel">
        <div>
          <h2>A place to begin.</h2>
          <p>You don’t need all the answers to take the first step.</p>
        </div>
        <Link href="/workspace/intake" className="btn">
          {copy.startIntake} <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}
