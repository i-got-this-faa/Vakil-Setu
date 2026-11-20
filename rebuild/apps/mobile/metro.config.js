// Expo's default config watches the Bun workspace root and resolves hoisted
// packages, so the TypeScript sources of @legal-setu/{domain,i18n,backend}
// bundle without a web-style alias. Verified with `expo export --platform android`.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Demo mode (EXPO_PUBLIC_DEMO_MODE=1) swaps the backend and sign-in for scripted stand-ins in src/demo,
// so the real screens can be recorded for a presentation. Off by default; never enable it for users.
if (process.env.EXPO_PUBLIC_DEMO_MODE === "1") {
  const demoDir = path.join(__dirname, "src", "demo");
  const swaps = {
    "convex/react": path.join(demoDir, "convex-react.tsx"),
    "convex/react-clerk": path.join(demoDir, "convex-react-clerk.tsx"),
    "@clerk/expo": path.join(demoDir, "clerk-expo.tsx"),
  };
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const swap = swaps[moduleName];
    if (swap && !context.originModulePath.startsWith(demoDir)) return { type: "sourceFile", filePath: swap };
    // The browser can't record through expo-audio here, so the talk screen gets a scripted recorder.
    // Speech is timed from pre-made clips (public/demo-audio) so a recording lines up with its soundtrack.
    const local = { "./recorder": "recorder.ts", "./speaker": "speaker.ts" }[moduleName];
    if (local && context.originModulePath.startsWith(path.join(__dirname, "src", "voice"))) {
      return { type: "sourceFile", filePath: path.join(demoDir, local) };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
