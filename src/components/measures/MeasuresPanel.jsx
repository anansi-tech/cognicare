"use client";
import { useEffect, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MeasureForm } from "./MeasureForm";
import { MeasureTrend } from "./MeasureTrend";
import { AdministrationHistory } from "./AdministrationHistory";

export function MeasuresPanel({ clientId, sessionId, onSaved: onSavedProp, sections = false, compact = false, hideHistory = false }) {
  const [instruments, setInstruments] = useState([]);
  const [chosenId, setChosenId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [administeredIds, setAdministeredIds] = useState(new Set());

  useEffect(() => {
    fetch("/api/instruments")
      .then((r) => r.json())
      .then((list) => {
        setInstruments(list);
        if (list.length > 0) setChosenId((id) => id || list[0].id);
      });
  }, []);

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/clients/${clientId}/measures?history=1`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) setAdministeredIds(new Set(data.map((d) => d.instrumentId)));
      })
      .catch(() => {});
  }, [clientId, refreshKey]);

  const onSaved = (instrumentId) => {
    setRefreshKey((k) => k + 1);
    onSavedProp?.(instrumentId);
  };

  const sheet = (
    <Sheet open={formOpen} onOpenChange={setFormOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:w-[28rem]">
        <SheetHeader>
          <SheetTitle>
            {instruments.find((i) => i.id === chosenId)?.name ?? "Measure"}
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-4">
          {chosenId && formOpen && (
            <MeasureForm
              clientId={clientId}
              instrumentId={chosenId}
              sessionId={sessionId}
              onSaved={() => onSaved(chosenId)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  const administerBlock = (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div>
          <span className="text-sm font-medium text-gray-700">Administer measure</span>
          <Select value={chosenId} onValueChange={setChosenId}>
            <SelectTrigger className="w-full sm:max-w-md">
              <SelectValue placeholder="Choose a measure">
                {(value) => {
                  const inst = instruments.find((i) => i.id === value);
                  return inst ? `${inst.shortName ?? inst.name} (${inst.construct})` : "Choose a measure";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {instruments.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.shortName ?? i.name} ({i.construct})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setFormOpen(true)} disabled={!chosenId}>
          Start
        </Button>
      </div>
      {sheet}
    </>
  );

  const trendsBlock = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {instruments.map((i) => (
        <MeasureTrend
          key={i.id}
          clientId={clientId}
          instrumentId={i.id}
          refreshKey={refreshKey}
        />
      ))}
    </div>
  );

  // compact: administer picker + form only — no trend cards, no history.
  if (compact) {
    return (
      <div className="space-y-3">
        {administerBlock}
      </div>
    );
  }

  if (sections) {
    const administered = instruments.filter((i) => administeredIds.has(i.id));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {/* Administer card */}
        <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 18, boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)", padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 17, letterSpacing: "-.01em", margin: "0 0 3px", color: "#0B2B6B" }}>
                Administer a measure
              </h2>
              <p style={{ fontSize: 13, color: "#8298BC", margin: "0 0 14px" }}>
                Record a standardized instrument to anchor progress tracking.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Select value={chosenId} onValueChange={setChosenId}>
                  <SelectTrigger
                    style={{ flex: 1, minWidth: 240, border: "1px solid #DCE6F3", borderRadius: 11, fontSize: 14, height: "auto", padding: "10px 14px", color: "#24344F", background: "#fff" }}
                  >
                    <SelectValue placeholder="Choose a measure">
                      {(value) => {
                        const inst = instruments.find((i) => i.id === value);
                        return inst ? `${inst.shortName ?? inst.name} (${inst.construct})` : "Choose a measure";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {instruments.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.shortName ?? i.name} ({i.construct})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  disabled={!chosenId}
                  style={{
                    border: "none",
                    cursor: chosenId ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                    background: chosenId ? "#2F80FF" : "#BCD2F0",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    padding: "10px 24px",
                    borderRadius: 11,
                    boxShadow: chosenId ? "0 16px 40px -18px rgba(47,128,255,.8)" : "none",
                    transition: "transform .16s, box-shadow .16s",
                    flexShrink: 0,
                  }}
                >
                  Start
                </button>
              </div>
            </div>
            {administered.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {administered.map((i) => (
                  <span key={i.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 999, background: "#E7F6EC", color: "#3B9E57" }}>
                    {i.shortName || i.name} ✓
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {sheet}

        {/* Trends */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", marginBottom: 12, paddingLeft: 2 }}>
            Trends
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {instruments.map((i) => (
              <MeasureTrend key={i.id} clientId={clientId} instrumentId={i.id} refreshKey={refreshKey} />
            ))}
          </div>
        </div>

        {!hideHistory && (
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", marginBottom: 12, paddingLeft: 2 }}>
              History
            </div>
            <AdministrationHistory clientId={clientId} refreshKey={refreshKey} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {administerBlock}
      {trendsBlock}
      <AdministrationHistory clientId={clientId} refreshKey={refreshKey} />
    </div>
  );
}
