import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", include: ["src/test/**/*.test.{js,jsx}"], restoreMocks: true },
  resolve: { dedupe: ["react", "react-dom", "convex"], alias: { "@convex-api": fileURLToPath(new URL("../rebuild/packages/backend/convex/_generated/api.js", import.meta.url)) } }
});
