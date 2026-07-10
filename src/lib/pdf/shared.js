import fs from "fs";
import path from "path";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

// ---------------------------------------------------------------------------
// Font data — base64-encode TTFs once per process; avoids network dependency
// ---------------------------------------------------------------------------
let _fonts = null;
export function getFonts() {
  if (!_fonts) {
    const b64 = (f) => fs.readFileSync(path.join(FONTS_DIR, f)).toString("base64");
    _fonts = {
      bricolage700: b64("BricolageGrotesque-700.ttf"),
      serif400:     b64("SourceSerif4-400.ttf"),
      serif400i:    b64("SourceSerif4-400-italic.ttf"),
    };
  }
  return _fonts;
}

// @font-face declarations shared by both documents.
export function fontFaceCss() {
  const fonts = getFonts();
  return `
  @font-face {
    font-family: 'Bricolage Grotesque';
    font-weight: 700;
    src: url('data:font/ttf;base64,${fonts.bricolage700}') format('truetype');
  }
  @font-face {
    font-family: 'Source Serif 4';
    font-weight: 400;
    font-style: normal;
    src: url('data:font/ttf;base64,${fonts.serif400}') format('truetype');
  }
  @font-face {
    font-family: 'Source Serif 4';
    font-weight: 400;
    font-style: italic;
    src: url('data:font/ttf;base64,${fonts.serif400i}') format('truetype');
  }`;
}

// ---------------------------------------------------------------------------
// HTML-escape — applied to every piece of user/clinical data
// ---------------------------------------------------------------------------
export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Letterhead — logo tile + practice identity, navy rule, right-aligned eyebrow
// ---------------------------------------------------------------------------
export function renderLetterhead({ practiceName, practiceAddress, eyebrow }) {
  return `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:18px;border-bottom:2px solid #0B2B6B;">
  <div style="display:flex;align-items:center;gap:12px;">
    <span style="display:grid;place-items:center;width:44px;height:44px;border-radius:11px;background:#0B2B6B;flex-shrink:0;">
      <svg width="26" height="26" viewBox="0 0 512 512"><path d="M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38" fill="none" stroke="#25B9C8" stroke-width="46" stroke-linecap="round"></path></svg>
    </span>
    <div>
      <div style="font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:700;font-size:19px;color:#0B2B6B;letter-spacing:-.01em;">${esc(practiceName || "CogniCare")}</div>
      ${practiceAddress ? `<div style="font-size:11px;color:#55698F;margin-top:2px;">${esc(practiceAddress)}</div>` : ""}
    </div>
  </div>
  <div style="flex-shrink:0;">
    <div style="font-size:10.5px;font-weight:700;letter-spacing:.12em;color:#2F80FF;text-transform:uppercase;">${esc(eyebrow)}</div>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// Puppeteer → PDF
// ---------------------------------------------------------------------------
export async function htmlToPdfBuffer(html, footerTemplate) {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = (await import("puppeteer-core")).default;

  const localChrome = process.env.CHROME_PATH;
  const executablePath = localChrome || (await chromium.executablePath());

  // Local Chrome needs plain sandbox args; @sparticuz/chromium.args are
  // Lambda-specific and only apply to its bundled binary.
  const browser = await puppeteer.launch(
    localChrome
      ? { executablePath, headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
      : { executablePath, headless: chromium.headless, args: chromium.args }
  );

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    // Data-URI @font-face fonts have no network event, so networkidle0 fires
    // before they're parsed. Explicitly wait for font readiness or the PDF
    // renders in fallback fonts (Arial/Georgia) — the "not as nice" symptom.
    await page.evaluateHandle("document.fonts.ready");
    return await page.pdf({
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate,
      margin: { top: "0.75in", bottom: "0.65in", left: "0.75in", right: "0.75in" },
    });
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
export function formatDay(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return String(d);
  }
}

export function formatStamp(d) {
  try {
    return new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return String(d);
  }
}
