"use client";

import { useState } from "react";

const LogoTile = () => (
  <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, background: "#0B2B6B", flexShrink: 0 }}>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11.5 5A5 5 0 1 0 11.5 11" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  </span>
);

const Chevron = ({ open }) => (
  <svg
    width="16" height="16" viewBox="0 0 16 16" fill="none"
    style={{ transition: "transform 200ms", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
  >
    <path d="M4 6l4 4 4-4" stroke="#8298BC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// One AI-section card used by ClientInsights and SessionAIInsights.
// Collapsible when `collapsible` + `summary` are both set; header row
// becomes a button that toggles the body. New optional `subtitle` and
// `badge` props are forward-compatible: existing callers without them
// keep the original behaviour.
export function Section({
  title,
  summary,
  children,
  collapsible = false,
  defaultOpen = true,
  subtitle,
  badge,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open || !summary;

  const titleBlock = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
      <LogoTile />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, color: "#0B2B6B", margin: 0 }}>
            {title}
          </h3>
          {badge && (
            <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: "#FBF2DA", color: "#A9821F" }}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p style={{ fontSize: 12, color: "#8298BC", margin: "2px 0 0" }}>{subtitle}</p>
        )}
      </div>
    </div>
  );

  return (
    <section style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.25)" }}>
      {collapsible && summary ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", padding: "18px 20px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          {titleBlock}
          <Chevron open={open} />
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 20px 12px" }}>
          {titleBlock}
        </div>
      )}
      <div style={{ padding: "0 20px 18px" }}>
        {summary && (
          <p style={{ marginBottom: 14, background: "#F2F7FD", borderRadius: 10, padding: "10px 14px", fontSize: 13.5, color: "#0B2B6B", lineHeight: 1.6, opacity: 0.85 }}>
            {summary}
          </p>
        )}
        {showBody && children}
      </div>
    </section>
  );
}

export function Empty({ children }) {
  return <p style={{ fontSize: 13, color: "#8298BC", margin: 0 }}>{children}</p>;
}
