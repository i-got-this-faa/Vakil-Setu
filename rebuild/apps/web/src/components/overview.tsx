"use client";
import { Card, Badge } from "@vakil/ui";

import Link from "next/link";
import {
  ArrowRight,
  FilePenLine,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { useAccount } from "./workspace-gate";

export function Overview() {
  const account = useAccount();
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">Room to think. Space to act.</div>
          <h1>
            {account
              ? `Welcome, ${account.displayName}.`
              : "Your legal workspace."}
          </h1>
          <p className="page-description">
            {account?.role === "advocate"
              ? "Keep your profile current, publish availability, and respond to consultation requests."
              : account?.role === "admin"
                ? "Review private credentials before approving an advocate application."
                : "Begin with your concern. You can review every word before sharing a summary."}
          </p>
        </div>
        {account && (
          <Badge className="badge neutral">{account.role} account</Badge>
        )}
      </div>
      <div className="card-grid">
        <Card className="card">
          <FilePenLine size={26} strokeWidth={1.4} />
          <h2 style={{ marginTop: 20 }}>Put it into words.</h2>
          <p className="page-description">
            Create a private intake in your chosen language, then write an
            editable summary.
          </p>
          <Link
            href="/workspace/intake"
            className="btn"
            style={{ marginTop: 23 }}
          >
            Start an intake <ArrowRight size={15} />
          </Link>
        </Card>
        <Card className="card">
          <CalendarDays size={26} strokeWidth={1.4} />
          <h2 style={{ marginTop: 20 }}>Keep track of next steps.</h2>
          <p className="page-description">
            Check pending requests, accepted consultations, cancellations, and
            expiry.
          </p>
          <Link
            href="/workspace/bookings"
            className="btn secondary"
            style={{ marginTop: 23 }}
          >
            View consultations <ArrowRight size={15} />
          </Link>
        </Card>
        {account?.role === "advocate" && (
          <Card className="card">
            <h2>Your advocate desk</h2>
            <p className="page-description">
              Submit your profile and credentials for approval, then manage
              availability.
            </p>
            <Link
              className="btn"
              href="/workspace/advocate"
              style={{ marginTop: 20 }}
            >
              Open advocate desk
            </Link>
          </Card>
        )}
        {account?.role === "admin" && (
          <Card className="card">
            <ShieldCheck size={26} />
            <h2 style={{ marginTop: 20 }}>Review applications</h2>
            <p className="page-description">
              Read the private credential evidence and record a review decision.
            </p>
            <Link
              className="btn"
              href="/workspace/admin"
              style={{ marginTop: 20 }}
            >
              Open review queue
            </Link>
          </Card>
        )}
      </div>
    </>
  );
}
