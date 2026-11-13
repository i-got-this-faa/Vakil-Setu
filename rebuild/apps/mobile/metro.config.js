// Expo's default config watches the Bun workspace root and resolves hoisted
// packages, so the TypeScript sources of @legal-setu/{domain,i18n,backend}
// bundle without a web-style alias. Verified with `expo export --platform android`.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = config;
