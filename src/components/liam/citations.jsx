import Link from "next/link";

const TOKEN = /\[(session|report):([a-f0-9]{24})\]/gi;

export function renderWithCitations(text, clientId) {
  const out = [];
  let last = 0, m, i = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [, kind, id] = m;
    const href = kind === "session" ? `/sessions/${id}` : `/clients/${clientId}/reports/${id}`;
    out.push(
      <Link key={`c${i++}`} href={href}
        className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground hover:underline">
        {kind === "session" ? "Session" : "Report"}
      </Link>
    );
    last = TOKEN.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
