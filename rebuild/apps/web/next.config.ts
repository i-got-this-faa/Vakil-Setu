import type { NextConfig } from "next";

const config: NextConfig = {
  // Public builds omit the engine pending the source-provenance review.
  env: {
    NEXT_PUBLIC_BUNDLED_SPEECH_ENABLED: process.env.VERCEL ? "false" : "true",
  },
  transpilePackages: [
    "@vakil/backend",
    "@vakil/domain",
    "@vakil/i18n",
    "@vakil/ui",
  ],
};

export default config;
