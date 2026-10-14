import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header, Footer } from "@/components/shell";
import { Providers } from "@/components/providers";
import { serviceConfig } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vakil Setu — A bridge to legal clarity",
    template: "%s | Vakil Setu",
  },
  description:
    "Review your legal intake, discover approved advocates, and request a consultation in English, Hindi, or Punjabi.",
};
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers config={serviceConfig()}>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
