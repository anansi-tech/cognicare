import { parseReportSections } from "@/lib/reports/sections";
import { ageFromDob, genderLabel } from "@/lib/age";
import {
  fontFaceCss,
  esc,
  renderLetterhead,
  htmlToPdfBuffer,
  formatDay,
  formatStamp,
} from "@/lib/pdf/shared";

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
${fontFaceCss()}
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
${renderLetterhead({ practiceName, practiceAddress, eyebrow: "Clinical Documentation" })}

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
