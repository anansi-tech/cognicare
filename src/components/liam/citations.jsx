import Link from "next/link";
import { CalendarDays, FileText } from "lucide-react";

// Single tokenizer that catches citation tokens + minimal markdown
// (`**bold**`, `*italic*`, `` `code` ``). Newlines inside the bubble are kept
// with whitespace-pre-wrap on the container, so no paragraph splitting needed.
const TOKEN =
  /\[(session|report):([a-f0-9]{24})\]|\*\*([^*\n]+?)\*\*|(?<![*\w])\*([^*\n]+?)\*(?!\w)|`([^`\n]+?)`/gi;

// Strips citation tokens for plain-text copy of an assistant message.
export function stripCitationTokens(text) {
  return String(text ?? "")
    .replace(/\s?\[(session|report):[a-f0-9]{24}\]/gi, "")
    .trim();
}

const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// `meta` (optional): { [id]: { kind, date, reportType } } from
// /api/liam/citations — enriches chip labels to "Session · Jul 9" /
// "Progress report". Unresolved ids keep the generic label (never a broken
// chip). `tz`: practice timezone for the session date.
export function renderWithCitations(text, clientId, meta = {}, tz) {
  if (text == null) return [];
  const out = [];
  let last = 0;
  let m;
  let i = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [, kind, id, bold, italic, code] = m;
    if (kind && id) {
      const href =
        kind === "session"
          ? `/sessions/${id}`
          : `/clients/${clientId}/ai-reports/${id}`;
      const Icon = kind === "session" ? CalendarDays : FileText;
      const info = meta[id];
      let label = kind === "session" ? "Session" : "Report";
      if (info?.kind === "session" && info.date) {
        const d = new Date(info.date).toLocaleDateString("en-US", {
          ...(tz ? { timeZone: tz } : {}),
          month: "short",
          day: "numeric",
        });
        label = `Session · ${d}`;
      } else if (info?.kind === "report" && info.reportType) {
        label = `${titleCase(info.reportType)} report`;
      }
      out.push(
        <Link
          key={`c${i++}`}
          href={href}
          className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-[#E4F0FF] px-2 py-0.5 align-baseline text-[11px] font-semibold text-primary no-underline transition-colors hover:bg-[#D3E5FF]"
        >
          <Icon className="h-3 w-3" strokeWidth={2.25} />
          {label}
        </Link>
      );
    } else if (bold) {
      out.push(
        <strong key={`b${i++}`} className="font-semibold">
          {bold}
        </strong>
      );
    } else if (italic) {
      out.push(
        <em key={`i${i++}`} className="italic">
          {italic}
        </em>
      );
    } else if (code) {
      out.push(
        <code key={`k${i++}`} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {code}
        </code>
      );
    }
    last = TOKEN.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
