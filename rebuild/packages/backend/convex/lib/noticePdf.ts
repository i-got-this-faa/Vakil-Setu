// Minimal dependency-free PDF writer for English draft notices.
// Uses the standard Times / Helvetica fonts (no embedding), so text is limited to printable ASCII.

// Glyph widths (1/1000 em) for characters 32..126 of the standard PDF fonts.
const WIDTHS = {
  R: "250,333,408,500,500,833,778,180,333,333,500,564,250,333,250,278,500,500,500,500,500,500,500,500,500,500,278,278,564,564,564,444,921,722,667,667,722,611,556,722,722,333,389,722,611,889,722,722,556,722,667,556,611,722,722,944,722,722,611,333,278,333,469,500,333,444,500,444,500,444,333,500,500,278,278,500,278,778,500,500,500,500,333,389,278,500,500,722,500,500,444,480,200,480,541",
  B: "250,333,555,500,500,1000,833,278,333,333,500,570,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,570,570,570,500,930,722,667,722,722,667,611,778,778,389,500,778,667,944,722,778,611,778,722,556,667,722,722,1000,722,722,667,333,278,333,581,500,333,500,556,444,556,444,333,500,556,278,333,556,278,833,556,500,556,556,444,389,333,556,500,722,500,500,444,394,220,394,520",
  H: "278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584",
} as const;
type Font = keyof typeof WIDTHS;
const TABLE: Record<Font, number[]> = { R: WIDTHS.R.split(",").map(Number), B: WIDTHS.B.split(",").map(Number), H: WIDTHS.H.split(",").map(Number) };
const FONT_NAMES: Record<Font, string> = { R: "Times-Roman", B: "Times-Bold", H: "Helvetica-Bold" };

// Map common typography to ASCII and drop anything the standard fonts cannot show.
export function toPdfText(text: string): string {
  return text
    .replace(/₹\s?/gu, "Rs. ").replace(/[‘’‚′]/gu, "'").replace(/[“”„″]/gu, "\"").replace(/[–—−]/gu, "-").replace(/…/gu, "...").replace(/[  ]/gu, " ")
    .normalize("NFKD").replace(/[^\n\x20-\x7e]/gu, "");
}

export function textWidth(text: string, font: Font, size: number): number {
  let width = 0;
  for (const ch of text) width += TABLE[font][ch.charCodeAt(0) - 32] ?? 500;
  return (width * size) / 1000;
}

export function wrapText(text: string, font: Font, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (let word of paragraph.split(/\s+/u).filter(Boolean)) {
      // Hard-split words longer than a full line (e.g. long reference numbers).
      while (textWidth(word, font, size) > maxWidth) {
        let cut = word.length - 1;
        while (cut > 1 && textWidth(word.slice(0, cut), font, size) > maxWidth) cut--;
        if (line) { lines.push(line); line = ""; }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, font, size) <= maxWidth) line = next;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

export type PdfBlock = { text: string; font?: Font; size?: number; align?: "left" | "center" | "right"; indent?: number; gapAfter?: number };

const PAGE = { width: 595.28, height: 841.89, left: 64, right: 64, top: 78, bottom: 72 };
const escape = (s: string) => s.replace(/[\\()]/gu, ch => `\\${ch}`);

export function buildPdf(blocks: PdfBlock[], options: { title: string; banner: string; footer: string }): Uint8Array {
  const maxWidth = PAGE.width - PAGE.left - PAGE.right;
  const pages: string[][] = [[]];
  let y = PAGE.height - PAGE.top;
  for (const block of blocks) {
    const font = block.font ?? "R";
    const size = block.size ?? 11;
    const indent = block.indent ?? 0;
    const leading = size * 1.4;
    for (const line of wrapText(toPdfText(block.text), font, size, maxWidth - indent)) {
      if (y - leading < PAGE.bottom) { pages.push([]); y = PAGE.height - PAGE.top; }
      y -= leading;
      const width = textWidth(line, font, size);
      const x = block.align === "center" ? PAGE.left + (maxWidth - width) / 2 : block.align === "right" ? PAGE.width - PAGE.right - width : PAGE.left + indent;
      if (line) pages.at(-1)!.push(`BT /F${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escape(line)}) Tj ET`);
    }
    y -= block.gapAfter ?? size * 0.6;
  }

  const banner = toPdfText(options.banner);
  const bannerX = (PAGE.width - textWidth(banner, "H", 9)) / 2;
  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const catalog = add(""), pagesId = add("");
  const fonts = (Object.keys(FONT_NAMES) as Font[]).map(f => `/F${f} ${add(`<< /Type /Font /Subtype /Type1 /BaseFont /${FONT_NAMES[f]} /Encoding /WinAnsiEncoding >>`)} 0 R`).join(" ");
  const kids: number[] = [];
  pages.forEach((ops, index) => {
    const footer = toPdfText(`${options.footer}  |  Page ${index + 1} of ${pages.length}`);
    const footerX = (PAGE.width - textWidth(footer, "R", 8)) / 2;
    const stream = [
      `0.72 0.05 0.05 rg BT /FH 9 Tf ${bannerX.toFixed(2)} ${(PAGE.height - 40).toFixed(2)} Td (${escape(banner)}) Tj ET`,
      `0.72 0.05 0.05 RG 0.8 w ${PAGE.left} ${(PAGE.height - 48).toFixed(2)} m ${(PAGE.width - PAGE.right).toFixed(2)} ${(PAGE.height - 48).toFixed(2)} l S`,
      `0.4 0.4 0.4 rg BT /FR 8 Tf ${footerX.toFixed(2)} 36 Td (${escape(footer)}) Tj ET`,
      "0 0 0 rg", ...ops,
    ].join("\n");
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << ${fonts} >> >> /Contents ${content} 0 R >>`));
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  const info = add(`<< /Title (${escape(toPdfText(options.title))}) /Producer (Legal-Setu) >>`);

  // Everything is ASCII, so string length equals byte length for the xref offsets.
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => { const at = pdf.length; pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; return at; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
