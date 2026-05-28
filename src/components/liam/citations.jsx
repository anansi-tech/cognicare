import Link from "next/link";
import { CalendarDays, FileText } from "lucide-react";

// Single tokenizer that catches citation tokens + minimal markdown
// (`**bold**`, `*italic*`, `` `code` ``). Newlines inside the bubble are kept
// with whitespace-pre-wrap on the container, so no paragraph splitting needed.
const TOKEN =
  /\[(session|report):([a-f0-9]{24})\]|\*\*([^*\n]+?)\*\*|(?<![*\w])\*([^*\n]+?)\*(?!\w)|`([^`\n]+?)`/gi;

export function renderWithCitations(text, clientId) {
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
      out.push(
        <Link
          key={`c${i++}`}
          href={href}
          className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 align-baseline text-xs font-medium text-accent-foreground no-underline transition-colors hover:bg-accent/90"
        >
          <Icon className="h-3 w-3" strokeWidth={2.25} />
          {kind === "session" ? "Session" : "Report"}
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
