"use client";
import { useEffect, useState } from "react";

export function AdministrationHistory({ clientId, refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [instCache, setInstCache] = useState({});

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

  // Group by instrument so 10 of each type read as tidy per-instrument lists
  // instead of one giant interleaved list.
  const groups = {};
  for (const adm of history) {
    const key = adm.instrumentId;
    (groups[key] ??= { name: adm.instrumentName ?? adm.instrumentId, items: [] }).items.push(adm);
  }

  const renderRow = (adm) => {
    const id = adm._id?.toString() ?? adm.id;
    const isOpen = expanded.has(id);
    const inst = instCache[adm.instrumentId];
    const pct = inst?.scoring?.percentageFactor != null
      ? adm.total * inst.scoring.percentageFactor
      : null;
    const hasFlags = adm.flags?.length > 0;

    return (
      <li key={id}>
        <button
          onClick={() => toggle(id, adm.instrumentId)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500 text-xs">
              {new Date(adm.administeredAt).toLocaleDateString()}
            </span>
            <span className="font-semibold">
              {adm.total}{pct != null ? `/${inst.scoring.max} (${pct}%)` : ""}
            </span>
            <span className="text-xs text-gray-600">{adm.severityBand}</span>
            {adm.isBaseline && (
              <span className="text-xs font-medium text-amber-600">Baseline</span>
            )}
            {hasFlags && (
              <span className="text-xs font-medium text-red-600">⚠ Safety flag</span>
            )}
          </div>
          <span className="ml-2 text-xs text-gray-400 shrink-0">{isOpen ? "▲" : "▼"}</span>
        </button>

        {isOpen && !inst && (
          <p className="px-4 pb-3 text-xs text-muted-foreground">Loading…</p>
        )}
        {isOpen && inst && (
          <ul className="px-4 pb-3 space-y-1 border-t border-gray-100 pt-2">
            {inst.items.map((item, i) => {
              const resp = adm.responses?.find((r) => r.itemId === item.id);
              const optLabel = inst.responseOptions.find(
                (o) => o.value === Number(resp?.value)
              )?.label ?? "—";
              return (
                <li key={item.id} className="text-xs text-gray-700">
                  <span className="font-medium">Q{i + 1}.</span> {item.text}{" "}
                  <span className="text-gray-500">— {optLabel} ({resp?.value ?? "—"})</span>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([instrumentId, group]) => (
        <div key={instrumentId} className="space-y-1.5">
          <h3 className="text-sm font-semibold text-gray-700">
            {group.name} <span className="text-xs font-normal text-gray-400">({group.items.length})</span>
          </h3>
          <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
            {group.items.map(renderRow)}
          </ul>
        </div>
      ))}
    </div>
  );
}
