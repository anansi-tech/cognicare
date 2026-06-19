import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// pdf-lib's standard fonts only encode WinAnsi (Latin-1). LLM-generated
// narratives routinely contain smart quotes, em/en dashes, ellipses, bullets,
// and other Unicode that would throw on drawText. Transliterate those to safe
// equivalents and strip anything else outside the printable WinAnsi range.
function sanitizeWinAnsi(input) {
  if (!input) return "";
  const map = {
    "\u2018": "'", "\u2019": "'", "\u201A": "'", "\u201B": "'",
    "\u201C": '"', "\u201D": '"', "\u201E": '"', "\u201F": '"',
    "\u2013": "-", "\u2014": "-", "\u2015": "-", "\u2212": "-",
    "\u2026": "...", "\u2022": "-", "\u00B7": "-", "\u25CF": "-", "\u25AA": "-",
    "\u00A0": " ", "\u2009": " ", "\u200A": " ", "\u202F": " ",
    "\u2122": "(TM)", "\u00AE": "(R)", "\u00A9": "(C)",
    "\u2192": "->", "\u2190": "<-", "\u2264": "<=", "\u2265": ">=",
    "\uFB01": "fi", "\uFB02": "fl",
  };
  let out = "";
  for (const ch of input.replace(/\r\n/g, "\n")) {
    if (map[ch] !== undefined) { out += map[ch]; continue; }
    const code = ch.codePointAt(0);
    // keep tab/newline + printable Latin-1; drop the rest (emoji, CJK, etc.)
    if (ch === "\n" || ch === "\t" || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
      out += ch;
    } else {
      out += " ";
    }
  }
  return out;
}

// Render a compiled clinical report as a PDF deliverable. Header, client
// + period block, narrative body (paginated), watermark for drafts, footer
// with AI-assisted disclosure + generated-on timestamp. Returns Uint8Array.
export async function buildReportPdf({
  practiceName,
  clientName,
  reportType,
  startDate,
  endDate,
  narrative,
  clinicianName,
  status,
  generatedAt = new Date(),
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612; // 8.5"
  const PAGE_H = 792; // 11"
  const MARGIN = 54; // 0.75"
  const MAX_W = PAGE_W - MARGIN * 2;
  const BODY_SIZE = 11;
  const SMALL_SIZE = 9;
  const TITLE_SIZE = 20;
  const LINE_GAP = 4;
  const PARA_GAP = 8;
  const FOOTER_RESERVE = 60;

  const isDraft = status === "draft";

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  let pageNo = 1;

  const drawFooter = () => {
    const text = sanitizeWinAnsi(`Generated ${formatStamp(generatedAt)} - ${practiceName} - Page ${pageNo}`);
    page.drawText(text, {
      x: MARGIN,
      y: MARGIN - 18,
      size: SMALL_SIZE,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    if (isDraft) {
      // Visible "DRAFT" watermark on every page.
      page.drawText("DRAFT", {
        x: PAGE_W - MARGIN - 60,
        y: PAGE_H - MARGIN - 24,
        size: 32,
        font: bold,
        color: rgb(0.85, 0.2, 0.2),
        opacity: 0.35,
      });
    }
  };

  const newPage = () => {
    drawFooter();
    page = pdf.addPage([PAGE_W, PAGE_H]);
    pageNo += 1;
    y = PAGE_H - MARGIN;
  };

  const drawLine = (text, { f = font, size = BODY_SIZE, color = rgb(0, 0, 0) } = {}) => {
    if (y - size < MARGIN + FOOTER_RESERVE) newPage();
    page.drawText(sanitizeWinAnsi(text), { x: MARGIN, y: y - size, size, font: f, color });
    y -= size + LINE_GAP;
  };

  // Header
  drawLine(practiceName || "CogniCare", { f: bold, size: 14, color: rgb(0.2, 0.25, 0.55) });
  y -= 6;
  drawLine(`${titleCase(reportType)} Report`, { f: bold, size: TITLE_SIZE });
  y -= 6;

  // Metadata block
  drawLine(`Client: ${clientName}`);
  drawLine(`Period: ${formatDay(startDate)} – ${formatDay(endDate)}`);
  drawLine(`Prepared by: ${clinicianName || "—"}`);
  drawLine(`Status: ${titleCase(status || "draft")}`);
  y -= 6;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= PARA_GAP;

  // Body — split on blank lines into paragraphs, wrap by pixel width.
  const text = sanitizeWinAnsi(narrative || "");
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) {
    drawLine("(No narrative content)", { color: rgb(0.5, 0.5, 0.5) });
  } else {
    for (const para of paragraphs) {
      const wrapped = wrap(para.replace(/\n/g, " "), font, BODY_SIZE, MAX_W);
      for (const line of wrapped) drawLine(line);
      y -= PARA_GAP;
    }
  }

  // AI-assisted disclosure pinned just above the footer on the last page.
  if (y < MARGIN + FOOTER_RESERVE + 28) newPage();
  y = Math.max(y, MARGIN + FOOTER_RESERVE + 28);
  const discY = MARGIN + FOOTER_RESERVE + 4;
  page.drawText(
    "This report was prepared with AI clinical decision support and reviewed by the clinician of record.",
    {
      x: MARGIN,
      y: discY,
      size: SMALL_SIZE,
      font,
      color: rgb(0.3, 0.3, 0.3),
    }
  );

  drawFooter();
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

function titleCase(s) {
  if (!s) return s;
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function formatDay(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(d);
  }
}

function formatStamp(d) {
  try {
    return new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return String(d);
  }
}
