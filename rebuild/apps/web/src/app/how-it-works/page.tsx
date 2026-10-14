import Link from "next/link";

export default function HowItWorks() {
  return (
    <main id="main" className="container section">
      <div className="eyebrow">Before you begin</div>
      <h1>Know what happens next.</h1>
      <div className="stack" style={{ marginTop: 35, maxWidth: 780 }}>
        <article className="card">
          <h2>Review, then save</h2>
          <p className="page-description">
            Create an account and type your legal concern in English, Hindi, or
            Punjabi. Browser speech capture is optional and may use browser
            vendor servers. Only final text that you explicitly review is added
            to your intake; saving always requires your action.
          </p>
        </article>
        <article className="card">
          <h2>Keep the summary yours</h2>
          <p className="page-description">
            Create or edit a manual summary and review its language, category,
            and urgency. AI assistance needs separate consent and a configured
            provider. AI and speech accuracy are not guaranteed. A summary is
            information for your consultation, not legal advice.
          </p>
        </article>
        <article className="card">
          <h2>Request a real consultation</h2>
          <p className="page-description">
            Select an approved advocate and an available slot. Approve sharing
            the chosen summary version with that advocate. A request reserves a
            slot while it awaits acceptance and expires at the earlier of the
            slot start or 24 hours. Either participant can cancel a pending or
            accepted request.
          </p>
        </article>
        <article className="card">
          <h2>Clear limits</h2>
          <p className="page-description">
            There are no payments, reviews, or emergency matching guarantees in
            this pilot. Interface translations do not imply browser speech
            support or verified AI understanding in that language. Unshared
            drafts can be deleted; shared consultation snapshots remain
            immutable.
          </p>
        </article>
        <div className="actions">
          <Link href="/workspace/intake" className="btn">
            Start your intake
          </Link>
          <Link href="/discover" className="btn secondary">
            Browse advocates
          </Link>
        </div>
      </div>
    </main>
  );
}
