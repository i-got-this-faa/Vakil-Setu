import type { NextConfig } from "next";

const config: NextConfig = {
  // Public builds omit the engine pending the source-provenance review.
  env: {
    NEXT_PUBLIC_BUNDLED_SPEECH_ENABLED: process.env.VERCEL ? "false" : "true",
  },
  transpilePackages: [
    "@legal-setu/backend",
    "@legal-setu/domain",
    "@legal-setu/i18n",
    "@legal-setu/ui",
  ],
};

export default config;
