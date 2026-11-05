import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Optional maintainer refresh. Runtime pages load bundled assets without contacting Google.
const families = ["Devanagari", "Bengali", "Gujarati", "Gurmukhi", "Kannada", "Malayalam", "Oriya", "Tamil", "Telugu", "Arabic", "MeeteiMayek", "OlChiki"];
const destination = path.resolve("apps/web/public/fonts");
await mkdir(destination, { recursive: true });
for (const family of families) {
  const directory = `notosans${family.toLowerCase()}`;
  const listing = await fetch(`https://api.github.com/repos/google/fonts/contents/ofl/${directory}`, { headers: { "User-Agent": "Vakil-Setu-font-sync" } });
  if (!listing.ok) throw new Error(`Font listing failed: ${family} (${listing.status})`);
  const entries: unknown = await listing.json();
  if (!Array.isArray(entries)) throw new Error("Invalid font listing");
  for (const suffix of [".ttf", "OFL.txt"]) {
    const entry: unknown = entries.find(value => typeof value === "object" && value !== null && "name" in value && typeof value.name === "string" && value.name.endsWith(suffix));
    if (typeof entry !== "object" || entry === null || !("download_url" in entry) || typeof entry.download_url !== "string" || !entry.download_url.startsWith("https://raw.githubusercontent.com/google/fonts/")) throw new Error(`Missing official font asset: ${family}`);
    const response = await fetch(entry.download_url);
    if (!response.ok) throw new Error(`Font download failed: ${family}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 4 * 1024 * 1024 || !bytes.length) throw new Error("Font asset size invalid");
    await writeFile(path.join(destination, `${family}${suffix === ".ttf" ? ".ttf" : "-OFL.txt"}`), bytes);
  }
}
await writeFile(path.join(destination, "README.md"), "# Bundled Noto script fonts\n\nUnmodified font files and their SIL Open Font License notices from https://github.com/google/fonts/tree/main/ofl. Refresh with `bun scripts/sync-fonts.ts` from the workspace root. Font presence is not proof of translation quality or complete shaping/rendering validation.\n");
console.log(`Bundled ${families.length} script font families with licenses.`);
