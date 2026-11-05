import { fetchOfficial } from "../src/services/legalSourceFetch.js";
import { discoverJudgmentLinks } from "../src/services/legalDiscovery.js";

// Discovery only: candidates must be reviewed before being added to the ingestion manifest.
const pageUrl = process.argv[2] || "https://jkhighcourt.nic.in/";
const { bytes, finalUrl } = await fetchOfficial(pageUrl, { maxBytes: 5 * 1024 * 1024 });
console.log(JSON.stringify(discoverJudgmentLinks(bytes.toString("utf8"), finalUrl), null, 2));
