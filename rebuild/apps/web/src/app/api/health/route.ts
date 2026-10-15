import { serviceConfig } from "@/lib/config";

export function GET() {
  const config = serviceConfig();
  return Response.json(
    {
      status: "ok",
      components: {
        identityAndPersistence: config.kind,
        clerk:
          config.kind === "configured" ||
          !config.missing.some((item) => item.startsWith("Clerk"))
            ? "configured"
            : "unconfigured",
        convex:
          config.kind === "configured" ||
          !config.missing.includes("Convex deployment URL")
            ? "configured"
            : "unconfigured",
        ai: "not_verified",
        browserSpeech: {
          recognition: "browser_vendor_dependent",
          englishPlayback: "local_device_voice",
          hindiPunjabiPlayback: "bundled_local_engine",
          pronunciation: "unverified",
        },
      },
      note: "Configuration status does not establish live connectivity.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
