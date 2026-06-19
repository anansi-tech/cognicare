// Lightweight renderer for the consent templates' markdown-ish content.
// Same parsing contract as src/lib/consent-pdf.js (headings #/##/###, "- " bullets,
// **bold** inline, blank-line paragraphs) so the on-screen preview, the client
// portal, and the generated PDF all read identically. No markdown library needed.

function renderInline(text, keyPrefix) {
  // Split on **bold** spans; render those bold, the rest plain.
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    const m = p.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={`${keyPrefix}-b-${i}`}>{m[1]}</strong>;
    // strip any stray single-asterisk emphasis markers
    return <span key={`${keyPrefix}-t-${i}`}>{p.replace(/\*(.+?)\*/g, "$1")}</span>;
  });
}

export function ConsentMarkdown({ content, className = "" }) {
  if (!content) return null;
  const blocks = [];
  const paragraphs = content.split(/\n\s*\n/);

  paragraphs.forEach((para, pi) => {
    const lines = para.split(/\n/).map((l) => l.replace(/^\s+/, "")).filter(Boolean);
    let bullets = [];

    const flushBullets = () => {
      if (bullets.length) {
        blocks.push(
          <ul key={`ul-${pi}-${blocks.length}`} className="list-disc pl-5 space-y-1 my-2">
            {bullets.map((b, bi) => (
              <li key={bi} className="text-sm leading-relaxed">{renderInline(b, `li-${pi}-${bi}`)}</li>
            ))}
          </ul>
        );
        bullets = [];
      }
    };

    lines.forEach((line, li) => {
      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        flushBullets();
        const level = heading[1].length;
        const text = heading[2];
        if (level === 1) {
          blocks.push(<h2 key={`h-${pi}-${li}`} className="text-lg font-semibold mt-4 mb-1">{renderInline(text, `h-${pi}-${li}`)}</h2>);
        } else {
          blocks.push(<h3 key={`h-${pi}-${li}`} className="text-base font-semibold mt-3 mb-1">{renderInline(text, `h-${pi}-${li}`)}</h3>);
        }
      } else if (line.startsWith("- ")) {
        bullets.push(line.slice(2));
      } else {
        flushBullets();
        blocks.push(<p key={`p-${pi}-${li}`} className="text-sm leading-relaxed my-1">{renderInline(line, `p-${pi}-${li}`)}</p>);
      }
    });
    flushBullets();
  });

  return <div className={className}>{blocks}</div>;
}
