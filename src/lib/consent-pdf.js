import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Builds a signed-consent PDF: title + consent body + signature block.
// Plain layout — this is a legal record, not a brochure. Returns Uint8Array.
//
// Template `body` is markdown-ish (`#` headings, `-` bullets, blank-line
// paragraph breaks). We render it as plain text with light bolding on
// `#`-prefixed lines and a `•` prefix on `-` lines.
export async function buildSignedConsentPdf({
  title,
  body,
  version,
  typedName,
  agreedAt,
  ip,
  guardianRelationship,
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612; // 8.5" * 72
  const PAGE_H = 792; // 11"  * 72
  const MARGIN = 54; // 0.75"
  const MAX_W = PAGE_W - MARGIN * 2;
  const BODY_SIZE = 11;
  const HEADING_SIZE = 14;
  const TITLE_SIZE = 18;
  const LINE_GAP = 4;
  const PARA_GAP = 6;
  const FOOTER_RESERVE = 180; // leave room for signature block on the last page

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const drawLine = (text, { f = font, size = BODY_SIZE, color = rgb(0, 0, 0) } = {}) => {
    if (y - size < MARGIN + (atFooter ? FOOTER_RESERVE : 0)) {
      newPage();
    }
    page.drawText(text, { x: MARGIN, y: y - size, size, font: f, color });
    y -= size + LINE_GAP;
  };

  let atFooter = false;

  // Title.
  drawLine(title, { f: bold, size: TITLE_SIZE });
  y -= 6;

  // Body.
  const paragraphs = body.split(/\n\s*\n/);
  for (const para of paragraphs) {
    const lines = para.split(/\n/);
    for (const raw of lines) {
      const trimmed = raw.replace(/^\s+/, "");
      if (!trimmed) continue;

      // Strip inline emphasis markers (**bold**, *italic*) — pdf-lib draws plain
      // text, so we remove the markup rather than print it literally.
      const stripInline = (s) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");

      // Headings: support #, ##, ### (template sections use ##). The document
      // title is rendered separately above, so a leading "# Title" line that
      // duplicates the title is skipped.
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = stripInline(headingMatch[2]);
        if (level === 1 && text.trim() === title.trim()) continue; // skip duplicate title
        const size = level === 1 ? HEADING_SIZE + 1 : HEADING_SIZE;
        y -= 2; // a little breathing room before a heading
        const wrapped = wrap(text, bold, size, MAX_W);
        for (const w of wrapped) drawLine(w, { f: bold, size });
      } else if (trimmed.startsWith("- ")) {
        const wrapped = wrap(`• ${stripInline(trimmed.slice(2))}`, font, BODY_SIZE, MAX_W - 12);
        for (let i = 0; i < wrapped.length; i++) {
          drawLine((i === 0 ? "" : "  ") + wrapped[i]);
        }
      } else {
        const wrapped = wrap(stripInline(trimmed), font, BODY_SIZE, MAX_W);
        for (const w of wrapped) drawLine(w);
      }
    }
    y -= PARA_GAP;
  }

  // Signature block — pinned to bottom-ish of the last page; force a new page
  // if there isn't room for the full block.
  atFooter = true;
  if (y < MARGIN + FOOTER_RESERVE) newPage();

  const sigTop = MARGIN + FOOTER_RESERVE - 20;
  page.drawLine({
    start: { x: MARGIN, y: sigTop + 24 },
    end: { x: PAGE_W - MARGIN, y: sigTop + 24 },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });

  let sy = sigTop;
  const sig = (text, { f = font, size = BODY_SIZE, color = rgb(0, 0, 0) } = {}) => {
    page.drawText(text, { x: MARGIN, y: sy, size, font: f, color });
    sy -= size + LINE_GAP;
  };

  sig("Electronic Signature", { f: bold, size: HEADING_SIZE });
  sy -= 4;
  if (guardianRelationship) {
    sig(`Signed by parent/guardian: ${typedName}`, { f: bold });
    sig(`Relationship to minor: ${guardianRelationship}`);
  } else {
    sig(`Signed by: ${typedName}`, { f: bold });
  }
  sig(`Timestamp (UTC): ${new Date(agreedAt).toISOString()}`);
  sig(`Form version: ${version}`);
  sig(`IP address: ${ip}`);
  sy -= 6;
  sig(
    "This typed name plus the recorded timestamp and IP address constitute a",
    { size: 9, color: rgb(0.3, 0.3, 0.3) }
  );
  sig(
    "legally binding electronic signature under the US ESIGN Act.",
    { size: 9, color: rgb(0.3, 0.3, 0.3) }
  );

  return await pdf.save();
}

function wrap(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}
