import Link from "next/link";
import { CalendarDays, FileText } from "lucide-react";

// Inline tokenizer: citation tokens + the deliberately small markdown subset
// LIAM uses (`**bold**`, `*italic*`, and `code`). Block rendering below adds
// only paragraphs and lists; citation grammar remains unchanged.
const TOKEN =
  /\[(session|report):([a-f0-9]{24})\]([.,;:!?])?|\*\*([^*\n]+?)\*\*|(?<![*\w])\*([^*\n]+?)\*(?!\w)|`([^`\n]+?)`/gi;

// Converts the supported LIAM formatting subset to readable clipboard text.
// List markers and line breaks remain intact so pasted responses keep their
// structure; only UI-only citations and inline Markdown delimiters are removed.
export function toClipboardText(text) {
  return String(text ?? "")
    .replace(/\s?\[(session|report):[a-f0-9]{24}\]/gi, "")
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
    .replace(/(?<![*\w])\*([^*\n]+?)\*(?!\w)/g, "$1")
    .replace(/`([^`\n]+?)`/g, "$1")
    .trim();
}

const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function renderInline(text, clientId, meta, tz, keyPrefix) {
  const out = [];
  let last = 0;
  let m;
  let i = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [, kind, id, punctuation, bold, italic, code] = m;
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
        <span
          key={`${keyPrefix}-c${i++}`}
          className="mx-0.5 inline-flex items-baseline whitespace-nowrap"
        >
          <Link
            href={href}
            className="inline-flex items-center gap-1 rounded-full bg-[#E4F0FF] px-2 py-0.5 align-baseline text-[11px] font-semibold text-primary no-underline transition-colors hover:bg-[#D3E5FF]"
          >
            <Icon className="h-3 w-3" strokeWidth={2.25} />
            {label}
          </Link>
          {punctuation}
        </span>
      );
    } else if (bold) {
      out.push(
        <strong key={`${keyPrefix}-b${i++}`} className="font-semibold text-[#172B4D]">
          {bold}
        </strong>
      );
    } else if (italic) {
      out.push(
        <em key={`${keyPrefix}-i${i++}`} className="italic">
          {italic}
        </em>
      );
    } else if (code) {
      out.push(
        <code key={`${keyPrefix}-k${i++}`} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {code}
        </code>
      );
    }
    last = TOKEN.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// `meta` (optional): { [id]: { kind, date, reportType } } from
// /api/liam/citations — enriches chip labels to "Session · Jul 9" /
// "Progress report". Unresolved ids keep the generic label (never a broken
// chip). `tz`: practice timezone for the session date.
//
// Consecutive "1. ..." / "- ..." lines render as compact semantic lists so
// prioritized clinical guidance scans cleanly instead of looking like a dump.
export function renderWithCitations(text, clientId, meta = {}, tz) {
  if (text == null) return [];
  const lines = String(text).replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let lineIndex = 0;
  let blockIndex = 0;

  while (lineIndex < lines.length) {
    if (!lines[lineIndex].trim()) {
      lineIndex++;
      continue;
    }

    const ordered = lines[lineIndex].match(/^\s*\d+[.)]\s+(.+)$/);
    const unordered = lines[lineIndex].match(/^\s*[-•]\s+(.+)$/);
    if (ordered || unordered) {
      const isOrdered = !!ordered;
      const items = [];
      while (lineIndex < lines.length) {
        const match = lines[lineIndex].match(
          isOrdered ? /^\s*(\d+)[.)]\s+(.+)$/ : /^\s*[-•]\s+(.+)$/
        );
        if (!match) break;
        items.push(
          isOrdered
            ? { content: match[2], number: Number(match[1]) }
            : { content: match[1] }
        );
        lineIndex++;

        // Models commonly put a blank line between Markdown list items. Keep
        // those items in one semantic list, but leave a blank before ordinary
        // prose for the outer block parser to handle.
        let nextLine = lineIndex;
        while (nextLine < lines.length && !lines[nextLine].trim()) nextLine++;
        const nextIsSameList = nextLine < lines.length && (
          isOrdered
            ? /^\s*\d+[.)]\s+(.+)$/.test(lines[nextLine])
            : /^\s*[-•]\s+(.+)$/.test(lines[nextLine])
        );
        if (nextIsSameList) lineIndex = nextLine;
      }
      const List = isOrdered ? "ol" : "ul";
      blocks.push(
        <List
          key={`list-${blockIndex}`}
          className={`my-1.5 space-y-2 pl-5 ${
            isOrdered
              ? "list-decimal marker:font-bold marker:text-[#2F80FF]"
              : "list-disc marker:text-[#2F80FF]"
          }`}
        >
          {items.map((item, itemIndex) => (
            <li
              key={itemIndex}
              value={isOrdered ? item.number : undefined}
              className="pl-1 leading-[1.5]"
            >
              {renderInline(item.content, clientId, meta, tz, `l${blockIndex}-${itemIndex}`)}
            </li>
          ))}
        </List>
      );
      blockIndex++;
      continue;
    }

    const paragraph = [];
    while (
      lineIndex < lines.length &&
      lines[lineIndex].trim() &&
      !/^\s*(?:\d+[.)]|[-•])\s+/.test(lines[lineIndex])
    ) {
      paragraph.push(lines[lineIndex].trim());
      lineIndex++;
    }
    const paragraphText = paragraph.join(" ");
    blocks.push(
      <p key={`p-${blockIndex}`} className={blocks.length ? "mt-2" : undefined}>
        {renderInline(paragraphText, clientId, meta, tz, `p${blockIndex}`)}
      </p>
    );
    blockIndex++;
  }

  return blocks;
}
