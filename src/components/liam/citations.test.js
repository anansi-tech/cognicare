import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderWithCitations, toClipboardText } from "./citations.jsx";

const render = (text) => renderToStaticMarkup(
  React.createElement("div", null, renderWithCitations(text, "client-1"))
);

describe("LIAM response rendering", () => {
  it("renders prioritized numbered guidance as a semantic list", () => {
    const html = render(
      "Key takeaway first.\n\n1. **Assess immediate risk** before planning.\n2. Confirm protective factors."
    );

    expect(html).toContain("<p>Key takeaway first.</p>");
    expect(html).toContain("<ol");
    expect(html).toContain("<strong");
    expect(html).toContain("Assess immediate risk");
    expect(html.match(/<li/g)).toHaveLength(2);
  });

  it("keeps numbered items in one list when Markdown has blank lines", () => {
    const html = render("1. First priority.\n\n2. Second priority.\n\n3. Third priority.");

    expect(html.match(/<ol/g)).toHaveLength(1);
    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html).toContain('<li value="1"');
    expect(html).toContain('<li value="2"');
    expect(html).toContain('<li value="3"');
  });

  it("renders legacy dash responses as bullets instead of literal scaffolding", () => {
    const html = render("- First point\n- Second point");

    expect(html).toContain("<ul");
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html).not.toContain("- First point");
  });

  it("preserves the existing citation token contract inside list items", () => {
    const id = "aaaaaaaaaaaaaaaaaaaaaaaa";
    const html = render(`1. Review the latest session [session:${id}]`);

    expect(html).toContain(`href="/sessions/${id}"`);
    expect(html).toContain("Session");
    expect(html).not.toContain(`[session:${id}]`);
  });

  it("keeps terminal punctuation attached to its citation chip", () => {
    const id = "aaaaaaaaaaaaaaaaaaaaaaaa";
    const html = render(`A grounded statement [session:${id}].`);

    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("</a>.</span>");
  });

  it("copies readable plain text while preserving list structure", () => {
    const id = "aaaaaaaaaaaaaaaaaaaaaaaa";
    const text = [
      `**Key focus:** Use *paced breathing* and review \`PHQ-9\` [report:${id}].`,
      "",
      "1. Keep **the first step** concrete.",
      "2. Preserve the numbered structure.",
    ].join("\n");

    expect(toClipboardText(text)).toBe([
      "Key focus: Use paced breathing and review PHQ-9.",
      "",
      "1. Keep the first step concrete.",
      "2. Preserve the numbered structure.",
    ].join("\n"));
  });
});
