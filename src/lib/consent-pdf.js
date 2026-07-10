import {
  fontFaceCss,
  esc,
  renderLetterhead,
  htmlToPdfBuffer,
} from "@/lib/pdf/shared";

// Builds a signed-consent PDF: Sky letterhead, parsed consent body, and the
// electronic-signature record. This is a legal document — the signature panel
// carries the typed name, UTC timestamp, form version, IP address, and the
// ESIGN attestation verbatim.
//
// `body` is the markdown-ish template (`#`/`##` headings, `- ` bullets,
// `**bold**` inline, blank-line paragraphs) — same grammar as ConsentMarkdown.jsx.

// ---------------------------------------------------------------------------
// Inline markup: **bold** → <strong>, stray *emphasis* markers stripped.
// Escaping happens first; asterisks survive esc() untouched.
// ---------------------------------------------------------------------------
function renderInline(text) {
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight:600;color:#24344F;">$1</strong>')
    .replace(/\*(.+?)\*/g, "$1");
}

const P_STYLE =
  "font-family:'Source Serif 4',Georgia,serif;font-size:12.5px;line-height:1.62;color:#33465F;margin:8px 0 0;";

function renderHeading(text) {
  return `<div style="margin-top:20px;break-inside:avoid;">
  <div style="display:flex;align-items:center;gap:9px;">
    <span style="display:inline-block;width:4px;height:14px;border-radius:2px;background:#2F80FF;flex-shrink:0;"></span>
    <h2 style="font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:700;font-size:13.5px;color:#0B2B6B;margin:0;text-transform:uppercase;letter-spacing:.01em;">${renderInline(text)}</h2>
  </div>
</div>`;
}

function renderBullets(items) {
  const lis = items
    .map(
      (b) =>
        `<li style="${P_STYLE}margin:4px 0 0;">${renderInline(b)}</li>`
    )
    .join("\n");
  return `<ul style="margin:6px 0 0;padding-left:20px;">${lis}</ul>`;
}

// ---------------------------------------------------------------------------
// Body parser — same grammar as ConsentMarkdown.jsx (`#`/`##` headings, `- `
// bullets, `**bold**`, blank-line paragraph breaks).
//
// Soft-wrapped source lines are rejoined for print: a blank line ends a
// paragraph, and a line indented under an open bullet continues that bullet.
// Same words, same order — only the line breaks the template author inserted
// for source readability are dropped.
// ---------------------------------------------------------------------------
function renderBody(body, title) {
  const out = [];
  const paragraphs = String(body).split(/\n\s*\n/);

  for (const para of paragraphs) {
    const rawLines = para.split(/\n/).filter((l) => l.trim());
    let bullets = [];
    let text = [];

    const flushBullets = () => {
      if (bullets.length) {
        out.push(renderBullets(bullets));
        bullets = [];
      }
    };
    const flushText = () => {
      if (text.length) {
        out.push(`<p style="${P_STYLE}">${renderInline(text.join(" "))}</p>`);
        text = [];
      }
    };

    for (const raw of rawLines) {
      const wasIndented = /^\s+/.test(raw);
      const line = raw.replace(/^\s+/, "");

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        flushText();
        flushBullets();
        const level = heading[1].length;
        const headingText = heading[2];
        // The document title is rendered in the title row above; skip a
        // leading `# Title` that duplicates it.
        if (level === 1 && headingText.trim() === String(title).trim()) continue;
        out.push(renderHeading(headingText));
      } else if (line.startsWith("- ")) {
        flushText();
        bullets.push(line.slice(2));
      } else if (bullets.length && wasIndented) {
        // Wrapped continuation of the open bullet.
        bullets[bullets.length - 1] += ` ${line}`;
      } else {
        flushBullets();
        text.push(line);
      }
    }
    flushText();
    flushBullets();
  }

  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Signature record — green panel, typed name as italic serif, label/value grid
// ---------------------------------------------------------------------------
function renderSignature({ typedName, agreedAt, version, ip, guardianRelationship }) {
  const meta = guardianRelationship
    ? [
        ["Signed by parent/guardian", typedName],
        ["Relationship to minor", guardianRelationship],
        ["Timestamp (UTC)", stampSeconds(agreedAt)],
        ["Form version", version],
        ["IP address", ip],
      ]
    : [
        ["Signed by", typedName],
        ["Timestamp (UTC)", stampSeconds(agreedAt)],
        ["Form version", version],
        ["IP address", ip],
      ];

  const cells = meta
    .map(
      ([k, v]) => `<div>
      <div style="font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7FA98C;">${esc(k)}</div>
      <div style="font-size:12px;font-weight:600;color:#24344F;margin-top:3px;">${esc(v ?? "—")}</div>
    </div>`
    )
    .join("\n");

  return `<div style="margin-top:28px;break-inside:avoid;border:1.5px solid #CDE9D6;background:#F4FBF6;border-radius:14px;overflow:hidden;">
  <div style="display:flex;align-items:center;gap:9px;background:#E7F6EC;padding:11px 18px;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B9E57" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    <span style="font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:700;font-size:13px;color:#2C7A46;text-transform:uppercase;letter-spacing:.02em;">Electronic signature</span>
  </div>
  <div style="padding:16px 18px;">
    <div style="font-family:'Source Serif 4',Georgia,serif;font-size:22px;font-style:italic;color:#0B2B6B;">${esc(typedName)}</div>
    <div style="display:grid;grid-template-columns:repeat(4,auto);justify-content:start;gap:8px 36px;margin-top:14px;">
${cells}
    </div>
    <p style="font-size:10px;color:#6E8F7A;font-style:italic;margin:14px 0 0;line-height:1.5;">This typed name plus the recorded timestamp and IP address constitute a legally binding electronic signature under the US ESIGN Act.</p>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
function renderConsentHtml({
  title, body, version, typedName, agreedAt, ip, guardianRelationship,
  practiceName, practiceAddress,
}) {
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
</style>
</head>
<body>

${renderLetterhead({ practiceName, practiceAddress, eyebrow: "Consent Record" })}

<!-- TITLE + STATUS -->
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-top:22px;">
  <div>
    <h1 style="font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:700;font-size:26px;letter-spacing:-.02em;color:#0B2B6B;margin:0;">${esc(title)}</h1>
    <div style="font-size:12px;color:#55698F;margin-top:6px;">Form version ${esc(version)} · Presented to the client via secure portal link</div>
  </div>
  <span style="flex-shrink:0;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;background:#E7F6EC;color:#3B9E57;margin-top:4px;">Signed</span>
</div>

<!-- BODY -->
${renderBody(body, title)}

<!-- SIGNATURE RECORD -->
${renderSignature({ typedName, agreedAt, version, ip, guardianRelationship })}

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API — signature unchanged; practice identity is optional
// ---------------------------------------------------------------------------
export async function buildSignedConsentPdf({
  title,
  body,
  version,
  typedName,
  agreedAt,
  ip,
  guardianRelationship,
  practiceName,
  practiceAddress,
}) {
  const props = {
    title, body, version, typedName, agreedAt, ip, guardianRelationship,
    practiceName, practiceAddress,
  };
  const html = renderConsentHtml(props);
  const footerTemplate = `<div style="width:100%;padding:6px 0.75in;border-top:1px solid #E3ECF7;font-family:Arial,sans-serif;font-size:9.5px;color:#8298BC;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
    <span>Signed ${esc(footerStamp(agreedAt))}</span>
    <span>${esc(practiceName || "CogniCare")} · Confidential clinical record</span>
  </div>`;
  return htmlToPdfBuffer(html, footerTemplate);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// "2026-07-02 18:41:07" — the signed instant, UTC, second precision.
function stampSeconds(d) {
  try {
    return new Date(d).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return String(d);
  }
}

// "Jul 2, 2026 · 18:41 UTC"
function footerStamp(d) {
  try {
    const date = new Date(d);
    const day = date.toLocaleDateString("en-US", {
      timeZone: "UTC", year: "numeric", month: "short", day: "numeric",
    });
    const time = date.toISOString().slice(11, 16);
    return `${day} · ${time} UTC`;
  } catch {
    return String(d);
  }
}
