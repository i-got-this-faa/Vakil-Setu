"use client";

import { Button, Input, Label } from "@vakil/ui";

import { useState, type FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@vakil/backend/api";
import type { Doc, Id } from "@vakil/backend/data-model";
import { LIMITS } from "@vakil/domain";
import { errorMessage } from "@/lib/errors";

export type CredentialMetadata = Omit<Doc<"credentials">, "storageId">;

export function CredentialDownload({
  credentialId,
}: {
  credentialId: Id<"credentials">;
}) {
  const read = useAction(api.credentials.read);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setPending(true);
    setError("");
    try {
      const file = await read({ credentialId });
      const url = URL.createObjectURL(
        new Blob([file.content], { type: file.contentType }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      // Keep the in-memory URL alive briefly so the browser can start its download.
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <Button
        type="button"
        className="btn secondary small"
        disabled={pending}
        onClick={download}
      >
        {pending ? "Reading private file…" : "Download for private review"}
      </Button>
      {error && (
        <p
          className="status-message error"
          role="alert"
          style={{ marginTop: 10 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function CredentialsPanel() {
  const credentials = useQuery(api.credentials.mine, {});
  const upload = useAction(api.credentials.upload);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file) return;
    if (file.size > LIMITS.credentialBytes || file.size < 8) {
      setMessage("Choose a nonempty PDF, JPEG, or PNG up to 5 MiB.");
      return;
    }
    const contentType = file.type;
    if (
      contentType !== "application/pdf" &&
      contentType !== "image/jpeg" &&
      contentType !== "image/png"
    ) {
      setMessage("Only PDF, JPEG, and PNG credentials are accepted.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      await upload({
        content: await file.arrayBuffer(),
        contentType,
        fileName: file.name,
      });
      setFile(null);
      form.reset();
      setMessage(
        "Credential saved privately for administrator review. Approval requires review again.",
      );
    } catch (failure) {
      setMessage(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="card">
      <h2>Private credential evidence</h2>
      <p className="muted" style={{ marginBlock: 14 }}>
        Upload your Bar Council credential or supporting registration evidence.
        Only you and active administrators can read these files. Uploading or
        removing evidence invalidates profile approval.
      </p>
      <form className="form-stack" onSubmit={submit}>
        <div className="field">
          <Label htmlFor="credential-file">
            PDF, JPEG, or PNG · maximum 5 MiB
          </Label>
          <Input
            id="credential-file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            required
            disabled={pending}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button className="btn secondary" disabled={pending || !file}>
          {pending
            ? "Uploading private evidence…"
            : "Upload credential for review"}
        </Button>
      </form>
      {message && (
        <p role="status" className="status-message" style={{ marginTop: 15 }}>
          {message}
        </p>
      )}
      {credentials === undefined ? (
        <p className="loading">Loading private credentials…</p>
      ) : credentials.length ? (
        credentials.map((credential) => (
          <OwnedCredential key={credential._id} credential={credential} />
        ))
      ) : (
        <p className="muted" style={{ marginTop: 20 }}>
          No credential evidence uploaded.
        </p>
      )}
    </article>
  );
}

function OwnedCredential({ credential }: { credential: CredentialMetadata }) {
  const remove = useMutation(api.credentials.remove);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function deleteCredential() {
    setPending(true);
    try {
      await remove({ credentialId: credential._id });
    } catch (failure) {
      setError(errorMessage(failure));
      setPending(false);
    }
  }
  return (
    <div className="list-row">
      <div>
        <strong>{credential.fileName}</strong>
        <p className="muted small-text">
          {Math.round(credential.size / 1024)} KiB · {credential.review.kind}
        </p>
        {credential.review.kind !== "pending" && (
          <p className="muted">Review note: {credential.review.reason}</p>
        )}
        <Label className="checkbox-line" style={{ marginTop: 10 }}>
          <Input
            type="checkbox"
            checked={confirm}
            onChange={(event) => setConfirm(event.target.checked)}
          />
          Remove this evidence and require profile review again.
        </Label>
        {error && (
          <p className="status-message error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="actions">
        <CredentialDownload credentialId={credential._id} />
        <Button
          className="btn danger small"
          disabled={!confirm || pending}
          onClick={deleteCredential}
        >
          {pending ? "Removing…" : "Remove"}
        </Button>
      </div>
    </div>
  );
}
