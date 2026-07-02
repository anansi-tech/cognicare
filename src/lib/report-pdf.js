import fs from "fs";
import path from "path";
import { parseReportSections } from "@/lib/reports/sections";
import { ageFromDob, genderLabel } from "@/lib/age";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

// ---------------------------------------------------------------------------
// Font data — base64-encode TTFs once per process; avoids network dependency
// ---------------------------------------------------------------------------
let _fonts = null;
function getFonts() {
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

// ---------------------------------------------------------------------------
// HTML-escape — applied to every piece of user/clinical data
// ---------------------------------------------------------------------------
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Section renderers (match CogniCare Report Deliverable.dc.html exactly)
// ---------------------------------------------------------------------------
function renderSection(title, body) {
  const paras = body
    .split(/\n\n+/)
    .filter(Boolean)
    .map((p) =>
      `<p style="font-family:'Source Serif 4',Georgia,serif;font-size:12.5px;line-height:1.62;color:#33465F;margin:9px 0 0;">${esc(p.replace(/\n/g, " ").trim())}</p>`
    )
    .join("\n");

  return `<div style="margin-top:22px;break-inside:avoid;">
  <div style="display:flex;align-items:center;gap:9px;">
    <span style="display:inline-block;width:4px;height:15px;border-radius:2px;background:#2F80FF;flex-shrink:0;"></span>
    <h2 style="font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:700;font-size:14px;letter-spacing:-.005em;color:#0B2B6B;margin:0;text-transform:uppercase;">${esc(title)}</h2>
  </div>
  ${paras}
</div>`;
}

function renderRisk(body) {
  const paras = body
    .split(/\n\n+/)
    .filter(Boolean)
    .map((p) =>
      `<p style="font-family:'Source Serif 4',Georgia,serif;font-size:12.5px;line-height:1.62;color:#6B4340;margin:9px 0 0;">${esc(p.replace(/\n/g, " ").trim())}</p>`
    )
    .join("\n");

  return `<div style="margin-top:22px;break-inside:avoid;background:#FDF6F5;border:1px solid #F0D9D6;border-left:4px solid #C0392B;border-radius:10px;padding:14px 16px;">
  <div style="display:flex;align-items:center;gap:8px;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4M12 17h.01"></path></svg>
    <h2 style="font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:700;font-size:14px;color:#A6322A;margin:0;text-transform:uppercase;">Risk assessment</h2>
  </div>
  ${paras}
</div>`;
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
function renderReportHtml({
  practiceName, practiceAddress,
  clientName, clientDob, clientGender,
  reportType, startDate, endDate,
  narrative, clinicianName, clinicianLicense,
  sourcesCount, status, generatedAt,
}) {
  const fonts = getFonts();
  const isDraft = status === "draft";
  const sections = parseReportSections(narrative || "");
  const clientAge = ageFromDob(clientDob);
  const clientGenderStr = genderLabel(clientGender);
  const ageSub = [clientAge ? `${clientAge} yrs` : null, clientGenderStr].filter(Boolean).join(" · ");

  const sectionsHtml = sections.length === 0
    ? `<p style="font-family:'Source Serif 4',Georgia,serif;font-size:12.5px;line-height:1.62;color:#33465F;margin:20px 0 0;">(No narrative content)</p>`
    : sections.map((sec) =>
        sec.title.toLowerCase() === "risk"
          ? renderRisk(sec.body)
          : renderSection(sec.title || "Summary", sec.body)
      ).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
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
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #24344F; }
  h1, h2 { font-weight: 700; }
  ${isDraft ? `
  .draft-watermark {
    position: fixed;
    top: 42%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-family: 'Bricolage Grotesque', Arial, sans-serif;
    font-weight: 700;
    font-size: 110px;
    color: rgba(192, 57, 43, 0.07);
    white-space: nowrap;
    z-index: 0;
    pointer-events: none;
  }` : ""}
</style>
</head>
<body>
${isDraft ? '<div class="draft-watermark">DRAFT</div>' : ""}

<!-- LETTERHEAD -->
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:18px;border-bottom:2px solid #0B2B6B;">
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
    <div style="font-size:10.5px;font-weight:700;letter-spacing:.12em;color:#2F80FF;text-transform:uppercase;">Clinical Documentation</div>
  </div>
</div>

<!-- TITLE -->
<h1 style="font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:700;font-size:27px;letter-spacing:-.02em;color:#0B2B6B;margin:22px 0 0;">${esc(titleCase(reportType))} Report</h1>

<!-- METADATA PANEL -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px 20px;background:#F4F8FD;border:1px solid #E3ECF7;border-radius:12px;padding:16px 18px;margin-top:16px;">
  <div>
    <div style="font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8298BC;">Client</div>
    <div style="font-size:13px;font-weight:600;color:#0B2B6B;margin-top:4px;">${esc(clientName)}</div>
    ${ageSub ? `<div style="font-size:11px;color:#55698F;margin-top:1px;">${esc(ageSub)}</div>` : ""}
  </div>
  <div>
    <div style="font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8298BC;">Reporting period</div>
    <div style="font-size:13px;font-weight:600;color:#0B2B6B;margin-top:4px;">${esc(formatDay(startDate))}</div>
    <div style="font-size:11px;color:#55698F;margin-top:1px;">to ${esc(formatDay(endDate))}</div>
  </div>
  <div>
    <div style="font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8298BC;">Prepared by</div>
    <div style="font-size:13px;font-weight:600;color:#0B2B6B;margin-top:4px;">${esc(clinicianName || "—")}</div>
    ${sourcesCount != null ? `<div style="font-size:11px;color:#55698F;margin-top:1px;">${sourcesCount} source record${sourcesCount === 1 ? "" : "s"}</div>` : ""}
  </div>
  <div>
    <div style="font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8298BC;">Status</div>
    ${isDraft
      ? `<span style="display:inline-block;margin-top:5px;font-size:10.5px;font-weight:700;padding:2px 10px;border-radius:999px;background:#FBF2DA;color:#A9821F;">Draft</span>`
      : `<span style="display:inline-block;margin-top:5px;font-size:10.5px;font-weight:700;padding:2px 10px;border-radius:999px;background:#E7F6EC;color:#3B9E57;">Completed</span>`
    }
  </div>
</div>

<!-- SECTIONS -->
${sectionsHtml}

<!-- SIGNATURE BLOCK -->
<div style="margin-top:30px;break-inside:avoid;display:grid;grid-template-columns:1fr 1fr;gap:32px;">
  <div>
    <div style="border-top:1.5px solid #0B2B6B;padding-top:7px;">
      <div style="font-family:'Bricolage Grotesque',Arial,sans-serif;font-size:14px;font-weight:700;color:#0B2B6B;">${esc(clinicianName || "—")}</div>
      <div style="font-size:11px;color:#55698F;margin-top:2px;">Clinician of record${clinicianLicense ? ` · License #${esc(clinicianLicense)}` : ""}</div>
    </div>
  </div>
  <div>
    <div style="border-top:1.5px solid #C7D5E8;padding-top:7px;">
      <div style="font-size:11px;color:#8298BC;">Date signed</div>
      <div style="font-size:13px;font-weight:600;color:#0B2B6B;margin-top:3px;">${esc(formatDay(generatedAt))}</div>
    </div>
  </div>
</div>

<!-- AI DISCLOSURE -->
<p style="font-family:'Source Serif 4',Georgia,serif;font-size:10px;color:#8298BC;font-style:italic;margin:22px 0 0;padding-top:12px;border-top:1px solid #EEF3FA;">This report was prepared with AI clinical decision support and reviewed by the clinician of record. It reflects available documentation for the stated period and should be read alongside the complete clinical record.</p>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Puppeteer → PDF
// ---------------------------------------------------------------------------
async function htmlToPdfBuffer(html, footerTemplate) {
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
// Public API — signature unchanged
// ---------------------------------------------------------------------------
export async function buildReportPdf({
  practiceName,
  practiceAddress,
  clientName,
  clientDob,
  clientGender,
  reportType,
  startDate,
  endDate,
  narrative,
  clinicianName,
  clinicianLicense,
  sourcesCount,
  status,
  generatedAt = new Date(),
}) {
  const props = {
    practiceName, practiceAddress,
    clientName, clientDob, clientGender,
    reportType, startDate, endDate,
    narrative, clinicianName, clinicianLicense,
    sourcesCount, status, generatedAt,
  };
  const html = renderReportHtml(props);
  const stamp = formatStamp(generatedAt);
  const footerTemplate = `<div style="width:100%;padding:6px 0.75in;border-top:1px solid #E3ECF7;font-family:Arial,sans-serif;font-size:9.5px;color:#8298BC;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
    <span>Generated ${esc(stamp)}</span>
    <span>${esc(practiceName || "CogniCare")} · Confidential clinical record · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;
  return htmlToPdfBuffer(html, footerTemplate);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function titleCase(s) {
  if (!s) return s;
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function formatDay(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
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
