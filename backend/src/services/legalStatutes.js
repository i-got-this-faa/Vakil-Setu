import { chunkPages, digest } from "./legalCorpus.js";

export function parseBnsSections(markdown, expectedCount = 358) {
  // NCRB has two formatting variants: **342.(** 1) and **343.** ...
  const markers = [...markdown.matchAll(/^\*\*(\d{1,3})\.(?:\*\*|\(\*\*)/gm)];
  if (markers.length !== expectedCount || markers.some((match, i) => Number(match[1]) !== i + 1)) {
    throw new Error(`Incomplete or duplicate BNS sections: expected ordered sections 1-${expectedCount}, found ${markers.length}`);
  }
  const starts = markers.map((marker, i) => {
    const priorEnd = i ? markers[i - 1].index + markers[i - 1][0].length : 0;
    const prefix = markdown.slice(priorEnd, marker.index);
    const headings = prefix.match(/((?:\*\*[^\n]+\*\*[ \t]*\n\s*)+)$/);
    const title = headings ? [...headings[1].matchAll(/^\*\*([^\n]+)\*\*/gm)].at(-1)?.[1] : undefined;
    return { boundary: headings ? priorEnd + headings.index : marker.index, title: title || `Section ${marker[1]}` };
  });
  return markers.map((marker, i) => {
    const text = markdown.slice(starts[i].boundary, starts[i + 1]?.boundary || markdown.length).trim();
    const body = markdown.slice(marker.index + marker[0].length, starts[i + 1]?.boundary || markdown.length).trim();
    if (body.length < 40) throw new Error(`Missing substantive text for BNS section ${marker[1]}`);
    return { sectionNumber: Number(marker[1]), title: starts[i].title, text };
  });
}

export function validateFirecrawlStatute(response, expectedUrl) {
  if (!response?.success || response.data?.metadata?.statusCode !== 200 || typeof response.data?.markdown !== "string") throw new Error("Firecrawl did not return a successful text scrape");
  const metadata = response.data.metadata;
  if (metadata.sourceURL !== expectedUrl || (metadata.url && metadata.url !== expectedUrl)) throw new Error("Firecrawl response source does not match the statute source");
  if (metadata.totalPages && (!metadata.numPages || metadata.numPages < metadata.totalPages)) throw new Error("Truncated Firecrawl PDF response; refusing to index");
  return response.data.markdown;
}

export function buildBnsDocument(source, markdown, scrapeMetadata) {
  const sections = parseBnsSections(markdown);
  const contentHash = digest(markdown);
  const id = digest(source.url).slice(0, 24);
  const chunks = sections.flatMap((section) => chunkPages(section.text).map((chunk, i) => ({
    ...chunk,
    page: null, // HTML is cited by section, never by invented PDF page numbers.
    sectionNumber: section.sectionNumber,
    sectionTitle: section.title,
    id: `${id}-${contentHash.slice(0, 12)}-s${section.sectionNumber}-${i + 1}`
  })));
  return { id, source, contentHash, fetchedAt: new Date().toISOString(), scrapeMetadata, sectionCount: sections.length, sections, chunks };
}
