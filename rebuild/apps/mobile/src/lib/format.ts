import { languageTagFor } from "./locale";

const IST = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 3_600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Times are shown in Indian Standard Time, like the web app. Intl is used when the
 * runtime supports the time zone; otherwise a fixed +05:30 rendering keeps the value right.
 */
export function formatIst(epochMs: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(languageTagFor(locale), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: IST,
    }).format(epochMs);
  } catch {
    return formatIstFallback(epochMs);
  }
}

export function formatIstFallback(epochMs: number): string {
  const shifted = new Date(epochMs + IST_OFFSET_MS);
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const month = MONTHS[shifted.getUTCMonth()] ?? "";
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${shifted.getUTCFullYear()}, ${hours}:${minutes} IST`;
}
