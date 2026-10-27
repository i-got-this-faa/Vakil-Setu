import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="container section" lang="en-IN" dir="ltr">
      <h1>Page not found</h1>
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
