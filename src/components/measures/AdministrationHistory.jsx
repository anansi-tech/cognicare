"use client";
import { useEffect, useState } from "react";

export function AdministrationHistory({ clientId, refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [instCache, setInstCache] = useState({});
  const [shortNameById, setShortNameById] = useState({});

  useEffect(() => {
    fetch("/api/instruments")
      .then((r) => r.ok ? r.json() : [])
      .then((list) => {
        if (Array.isArray(list)) {
          const map = {};
          for (const i of list) map[i.id] = i.shortName ?? i.name;
          setShortNameById(map);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/clients/${clientId}/measures?history=1`)
      .then((r) => r.json())
      .then((data) => { setHistory(Array.isArray(data) ? data : []); setLoading(false); });
  }, [clientId, refreshKey]);

  const toggle = async (id, instrumentId) => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      if (!instCache[instrumentId]) {
        const inst = await fetch(`/api/instruments/${instrumentId}`).then((r) => r.json());
        setInstCache((c) => ({ ...c, [instrumentId]: inst }));
      }
    }
    setExpanded(next);
  };

  if (loading || history.length === 0) return null;

  const groups = {};
  for (const adm of history) {
    const key = adm.instrumentId;
    (groups[key] ??= { name: adm.instrumentName ?? adm.instrumentId, items: [] }).items.push(adm);
  }

  const renderRow = (adm, idx, total) => {
    const id = adm._id?.toString() ?? adm.id;
    const isOpen = expanded.has(id);
    const inst = instCache[adm.instrumentId];
    const hasFlags = adm.flags?.length > 0;
    const isLast = idx === total - 1;

    return (
      <li key={id}>
        <button
          type="button"
          onClick={() => toggle(id, adm.instrumentId)}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F9FE"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          style={{
            display: "grid",
            gridTemplateColumns: "78px 30px 1fr auto 16px",
            gap: 12,
            alignItems: "center",
            width: "100%",
            padding: "13px 18px",
            borderBottom: isLast ? "none" : "1px solid #F2F6FB",
            cursor: "pointer",
            background: "transparent",
            border: "none",
            textAlign: "left",
            transition: "background .13s",
          }}
        >
          <span style={{ fontSize: 12, color: "#8298BC", fontVariantNumeric: "tabular-nums" }}>
            {new Date(adm.administeredAt).toLocaleDateString()}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0B2B6B" }}>{adm.total}</span>
          <span style={{ fontSize: 12.5, color: "#55698F" }}>{adm.severityBand}</span>
          <span style={{ display: "flex", gap: 7, flexWrap: "nowrap" }}>
            {adm.isBaseline && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#A9821F", background: "#FBF2DA", padding: "1px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>Baseline</span>
            )}
            {hasFlags && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#C0392B", background: "#FDECEC", padding: "1px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>⚠ Safety flag</span>
            )}
          </span>
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="#A6B8D4" strokeWidth="2.4" strokeLinecap="round"
            style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {isOpen && !inst && (
          <p style={{ padding: "8px 18px 12px", fontSize: 12, color: "#8298BC", margin: 0 }}>Loading…</p>
        )}
        {isOpen && inst && (
          <ul style={{ margin: 0, padding: "10px 18px 14px", listStyle: "none", borderTop: "1px solid #F2F6FB", display: "flex", flexDirection: "column", gap: 6 }}>
            {inst.items.map((item, i) => {
              const resp = adm.responses?.find((r) => r.itemId === item.id);
              const optLabel = inst.responseOptions.find(
                (o) => o.value === Number(resp?.value)
              )?.label ?? "—";
              return (
                <li key={item.id} style={{ fontSize: 12, color: "#41557A" }}>
                  <span style={{ fontWeight: 600 }}>Q{i + 1}.</span> {item.text}{" "}
                  <span style={{ color: "#8298BC" }}>— {optLabel} ({resp?.value ?? "—"})</span>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {Object.entries(groups).map(([instrumentId, group]) => (
        <div key={instrumentId}>
          <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 14, margin: "0 0 8px", color: "#0B2B6B" }}>
            {shortNameById[instrumentId] ?? group.name}{" "}
            <span style={{ fontWeight: 500, color: "#A6B8D4", fontSize: 12.5 }}>({group.items.length})</span>
          </h3>
          <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 14, boxShadow: "0 18px 40px -38px rgba(11,43,107,.4)", overflow: "hidden" }}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {group.items.map((adm, idx) => renderRow(adm, idx, group.items.length))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
