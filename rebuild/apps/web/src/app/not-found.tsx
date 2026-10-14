import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="container section">
      <div className="eyebrow">Page unavailable</div>
      <h1>Let’s find your next step.</h1>
      <p className="page-description">
        This address does not point to a page in the portal.
      </p>
      <div className="actions" style={{ marginTop: 24 }}>
        <Link className="btn" href="/">
          Return home
        </Link>
        <Link className="btn secondary" href="/workspace">
          Open workspace
        </Link>
      </div>
    </main>
  );
}
