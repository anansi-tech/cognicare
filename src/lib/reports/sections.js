// Parse a clinical report markdown string into sections.
// Splits on ## headings using the fixed vocabulary from the synthesis prompt.
// Back-compat: if no ## headings are present, returns a single untitled block
// so old plain-prose reports continue to render without modification.
export function parseReportSections(md) {
  if (!md?.trim()) return [];
  const lines = md.split("\n");
  const sections = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)/);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].trim(), body: "" };
    } else {
      if (!current) current = { title: "", body: "" };
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);

  return sections
    .map((s) => ({ title: s.title, body: s.body.trim() }))
    .filter((s) => s.body.length > 0);
}
