import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: [
    "@vakil/backend",
    "@vakil/domain",
    "@vakil/i18n",
    "@vakil/ui",
  ],
};

export default config;
