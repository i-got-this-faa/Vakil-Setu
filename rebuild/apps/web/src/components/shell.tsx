"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Scale,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { LocaleSelect, useLocale } from "./locale";
import { useServices } from "./providers";

export function Brand() {
  const { copy } = useLocale();
  return (
    <Link href="/" className="brand" aria-label="Vakil Setu home">
      <span className="brand-mark">
        <Scale size={25} strokeWidth={1.3} />
      </span>
      <span>
        <span className="brand-name">Vakil Setu</span>
        <span className="brand-note">{copy.tagline}</span>
      </span>
    </Link>
  );
}

export function Header() {
  const { messages, copy } = useLocale();
  const configured = useServices().kind === "configured";
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav aria-label="Main navigation" className="header-nav">
          <Link href="/discover">{messages.navigation.findAdvocate}</Link>
          <Link href="/workspace/advocate">{copy.advocateDesk}</Link>
          <LocaleSelect />
          <Link className="btn secondary small" href="/workspace">
            {copy.workspace} <ArrowUpRight size={14} />
          </Link>
          {configured && <UserButton />}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Brand />
        <p>
          Legal information supports your next step. It does not replace advice
          from an advocate. Consultation requests need advocate acceptance; no
          emergency connection is guaranteed.
        </p>
        <Link className="text-link small-text" href="/how-it-works">
          How it works ↗
        </Link>
      </div>
    </footer>
  );
}

const navigation = [
  { href: "/workspace", label: "Overview", icon: LayoutDashboard },
  { href: "/workspace/intake", label: "New intake", icon: FileText },
  { href: "/workspace/cases", label: "My cases", icon: FileText },
  { href: "/workspace/bookings", label: "Consultations", icon: CalendarDays },
  { href: "/workspace/notifications", label: "Notifications", icon: Bell },
  { href: "/workspace/advocate", label: "Advocate desk", icon: UserRound },
  { href: "/workspace/admin", label: "Review queue", icon: ShieldCheck },
];

export function Sidebar() {
  const { messages, copy } = useLocale();
  const labels: Record<string, string> = {
    "/workspace": messages.navigation.dashboard,
    "/workspace/intake": messages.navigation.intake,
    "/workspace/cases": copy.cases,
    "/workspace/bookings": messages.navigation.consultations,
    "/workspace/notifications": copy.notifications,
    "/workspace/advocate": copy.advocateDesk,
    "/workspace/admin": messages.navigation.admin,
  };
  const path = usePathname();
  return (
    <aside className="sidebar">
      <p className="sidebar-label">Your legal workspace</p>
      <nav aria-label="Workspace navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/workspace" ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={17} strokeWidth={1.5} />
              {labels[href] ?? label}
            </Link>
          );
        })}
        <Link href="/discover" className="nav-item">
          <Scale size={17} strokeWidth={1.5} />
          {messages.navigation.findAdvocate}
        </Link>
      </nav>
      <p className="sidebar-note">
        Your intake stays private until you approve sharing a summary with a
        specific advocate. Role permissions are checked by the service.
      </p>
    </aside>
  );
}
