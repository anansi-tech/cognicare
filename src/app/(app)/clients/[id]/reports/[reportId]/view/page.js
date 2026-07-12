"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { ageFromDob, genderLabel } from "@/lib/age";
import { parseReportSections } from "@/lib/reports/sections";
import { Spinner } from "@/components/ui/Spinner";
import { SaveIndicator } from "@/components/ai/editable";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftRestoredNotice } from "@/components/ui/DraftRestoredNotice";

const titleCase = (s) =>
  typeof s === "string" && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export default function ReportViewPage() {
  const params = useParams();
  const [report, setReport] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [narrative, setNarrative] = useState("");
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const saveRequest = useRef(0);
  const localDraft = useMemo(() => ({ narrative }), [narrative]);
  const applyLocalDraft = useCallback((updater) => {
    const next = typeof updater === "function" ? updater({ narrative: "" }) : updater;
    if (next.narrative !== undefined) setNarrative(next.narrative);
  }, []);
  const {
    draftRestored,
    dismissRestored,
    clearDraft,
  } = useFormDraft(
    `compiled-report-draft-${params.id}-${params.reportId}`,
    localDraft,
    applyLocalDraft,
    !!report && report.status !== "completed"
  );

  const [pdfLoading, setPdfLoading] = useState(null); // "preview" | "download" | null
  const [pdfError, setPdfError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await fetch(`/api/clients/${params.id}/reports/${params.reportId}`);
        if (!r.ok) throw new Error("Failed to fetch report");
        const data = await r.json();
        setReport(data.report);
        setNarrative(extractNarrative(data.report));

        const c = await fetch(`/api/clients/${params.id}`);
        if (!c.ok) throw new Error("Failed to fetch client information");
        const cdata = await c.json();
        setClient(cdata.client);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id, params.reportId]);

  const sources = useMemo(() => {
    if (!report?.content || typeof report.content !== "object") return [];
    if (Array.isArray(report.content.sources)) return report.content.sources;
    if (Array.isArray(report.content)) return report.content;
    return [];
  }, [report]);

  const isDraft = report?.status !== "completed";

  useEffect(() => {
    if (!report || !isDraft || saving || finalizing) return;
    if (narrative === extractNarrative(report)) return;
    setSaveState("saving");
    const timer = setTimeout(async () => {
      const request = ++saveRequest.current;
      try {
        const res = await fetch(`/api/clients/${params.id}/reports/${params.reportId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ narrative }),
        });
        if (!res.ok) throw new Error("Autosave failed");
        const data = await res.json();
        if (request !== saveRequest.current) return;
        setReport(data.report);
        clearDraft();
        setSaveState("saved");
      } catch {
        if (request === saveRequest.current) setSaveState("error");
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [narrative, report, isDraft, saving, finalizing, params.id, params.reportId, clearDraft]);

  const save = async (nextStatus) => {
    const setBusy = nextStatus === "completed" ? setFinalizing : setSaving;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/clients/${params.id}/reports/${params.reportId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            narrative,
            ...(nextStatus ? { status: nextStatus } : {}),
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      const data = await res.json();
      setReport(data.report);
      setNarrative(extractNarrative(data.report));
      clearDraft();
      setSaveState("saved");
      toast.success(nextStatus === "completed" ? "Report finalized." : "Draft saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openPdf = async (download = false) => {
    setPdfError(null);
    setPdfLoading(download ? "download" : "preview");
    try {
      const url = `/api/clients/${params.id}/reports/${params.reportId}/pdf${download ? "?download=1" : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${report?.type ?? "report"}-${params.reportId}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } else {
        window.open(blobUrl, "_blank");
      }
    } catch {
      setPdfError(download ? "download" : "preview");
    } finally {
      setPdfLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, gap: 14 }}>
        <Spinner size={40} />
        <span style={{ fontSize: 13.5, color: "#8298BC" }}>Loading report…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ maxWidth: 520, margin: "40px auto", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, padding: "18px 20px" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#C0392B", margin: "0 0 6px" }}>Error</p>
        <p style={{ fontSize: 13.5, color: "#7B2020", margin: 0 }}>{error}</p>
      </div>
    );
  }
  if (!report) {
    return (
      <div style={{ maxWidth: 520, margin: "40px auto", background: "#FFFBF0", border: "1px solid #F5E0A0", borderRadius: 14, padding: "18px 20px" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#A9821F", margin: "0 0 6px" }}>Report not found</p>
        <p style={{ fontSize: 13.5, color: "#6D5100", margin: 0 }}>This report may have been deleted or you may not have access.</p>
      </div>
    );
  }

  const sections = parseReportSections(narrative);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "30px 32px 64px" }}>
      {/* Back link */}
      <Link
        href={`/clients/${params.id}`}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "#55698F", textDecoration: "none", marginBottom: 16 }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to client
      </Link>

      {/* Main card */}
      <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)", padding: "26px 28px" }}>
        {/* Card header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase" }}>Compiled report</div>
            <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 28, letterSpacing: "-.02em", margin: "6px 0 0", color: "#0B2B6B" }}>
              {titleCase(report.type)} Report
            </h1>
            <p style={{ fontSize: 14, color: "#55698F", margin: "6px 0 0" }}>
              Prepared by {report.createdBy?.name ?? "Unknown clinician"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => openPdf(false)}
              disabled={!!pdfLoading}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #DCE6F3", cursor: pdfLoading ? "not-allowed" : "pointer", fontFamily: "inherit", background: "#fff", color: "#55698F", fontWeight: 600, fontSize: 13.5, padding: "9px 14px", borderRadius: 10, opacity: pdfLoading ? 0.6 : 1 }}
            >
              {pdfLoading === "preview" ? <Spinner size={14} /> : null}
              {pdfLoading === "preview" ? "Generating…" : "Preview PDF"}
            </button>
            <button
              type="button"
              onClick={() => openPdf(true)}
              disabled={!!pdfLoading}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: pdfLoading ? "not-allowed" : "pointer", fontFamily: "inherit", background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "9px 16px", borderRadius: 10, boxShadow: "0 16px 40px -18px rgba(47,128,255,.8)", opacity: pdfLoading ? 0.6 : 1 }}
            >
              {pdfLoading === "download" ? <Spinner size={14} color="#fff" /> : null}
              {pdfLoading === "download" ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>

        {/* PDF error banner */}
        {pdfError && (
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, background: "#FDECEC", border: "1px solid #F5C6C6", borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "#C0392B", margin: "0 0 3px" }}>PDF generation failed</p>
                <p style={{ fontSize: 13, color: "#7B2020", margin: 0 }}>
                  This is usually a temporary issue. Try again in a moment, or{" "}
                  <Link href={`/clients/${params.id}`} style={{ color: "#C0392B", fontWeight: 600 }}>go back to the client</Link>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPdfError(null)}
              aria-label="Dismiss"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#C0392B", flexShrink: 0, lineHeight: 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}

        {/* Metadata panel */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px 20px", background: "#F4F8FD", border: "1px solid #E3ECF7", borderRadius: 14, padding: "16px 18px", marginTop: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#8298BC", margin: "0 0 4px" }}>Client</p>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "#0B2B6B", margin: "0 0 1px" }}>{client?.name || "Unknown"}</p>
            <p style={{ fontSize: 11.5, color: "#55698F", margin: 0 }}>
              {[ageFromDob(client?.dateOfBirth) ? `${ageFromDob(client.dateOfBirth)} yrs` : null, genderLabel(client?.gender)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#8298BC", margin: "0 0 4px" }}>Period</p>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "#0B2B6B", margin: "0 0 1px" }}>{format(new Date(report.startDate), "MMM d, yyyy")}</p>
            <p style={{ fontSize: 11.5, color: "#55698F", margin: 0 }}>to {format(new Date(report.endDate), "MMM d, yyyy")}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#8298BC", margin: "0 0 4px" }}>Generated</p>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "#0B2B6B", margin: "0 0 1px" }}>{format(new Date(report.createdAt), "MMM d, yyyy")}</p>
            <p style={{ fontSize: 11.5, color: "#55698F", margin: 0 }}>{format(new Date(report.createdAt), "p")}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#8298BC", margin: "0 0 4px" }}>Status</p>
            <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 999, background: isDraft ? "#FBF2DA" : "#E7F6EC", color: isDraft ? "#A9821F" : "#3B9E57", marginTop: 5 }}>
              {isDraft ? "Draft" : "Completed"}
            </span>
            <p style={{ fontSize: 11.5, color: "#8298BC", margin: "5px 0 0" }}>{sources.length} source record{sources.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* Draft banner */}
        {isDraft && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 11, background: "#FEF9EC", border: "1px solid #F6E6BC", borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#A9821F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#8A7328", margin: 0 }}>
              This narrative is an AI-generated draft. Please review and edit before marking it completed. Drafts export with a watermark.
            </p>
          </div>
        )}

        {/* Narrative section */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 12px" }}>
          <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 17, margin: 0, color: "#0B2B6B" }}>Narrative</h2>
          {isDraft && <SaveIndicator state={saveState} />}
        </div>

        {isDraft ? (
          /* Draft edit mode — serif textarea */
          <div>
            {draftRestored && (
              <DraftRestoredNotice
                onDismiss={dismissRestored}
                onDiscard={() => {
                  const next = extractNarrative(report);
                  clearDraft({ narrative: next });
                  setNarrative(next);
                }}
              />
            )}
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={18}
              className="focus:ring-2 focus:ring-ring"
              style={{
                width: "100%", minHeight: 300, resize: "vertical",
                border: "1px solid #DCE6F3", borderRadius: 12, padding: "16px",
                fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 14,
                lineHeight: 1.65, color: "#33465F", outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="Narrative will appear here…"
            />
          </div>
        ) : (
          /* Completed read mode — formatted prose */
          <div style={{ background: "#FBFDFF", border: "1px solid #EEF3FA", borderRadius: 14, padding: "22px 24px" }}>
            {sections.length === 0 ? (
              <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 14, lineHeight: 1.65, color: "#33465F", margin: 0 }}>
                {narrative || "(No narrative content)"}
              </p>
            ) : (
              sections.map((sec, i) => (
                <div key={i} style={{ marginTop: i === 0 ? 0 : 18 }}>
                  {sec.title && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 4, height: 14, borderRadius: 2, background: "#2F80FF", flexShrink: 0 }} />
                      <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 13, letterSpacing: ".01em", textTransform: "uppercase", color: "#0B2B6B", margin: 0 }}>
                        {sec.title}
                      </h3>
                    </div>
                  )}
                  {sec.body.split(/\n\n+/).filter(Boolean).map((para, j) => (
                    <p key={j} style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 14, lineHeight: 1.65, color: "#33465F", margin: j === 0 ? 0 : "8px 0 0" }}>
                      {para.replace(/\n/g, " ").trim()}
                    </p>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* Action row */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          {isDraft && (
            <>
              <button
                type="button"
                onClick={() => save()}
                disabled={saving || finalizing}
                style={{ border: "1px solid #DCE6F3", cursor: "pointer", fontFamily: "inherit", background: "#fff", color: "#55698F", fontWeight: 600, fontSize: 13.5, padding: "9px 16px", borderRadius: 10, opacity: (saving || finalizing) ? 0.6 : 1 }}
              >
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                onClick={() => save("completed")}
                disabled={saving || finalizing || !narrative.trim()}
                style={{ border: "none", cursor: "pointer", fontFamily: "inherit", background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "9px 18px", borderRadius: 10, boxShadow: "0 16px 40px -18px rgba(47,128,255,.8)", opacity: (saving || finalizing || !narrative.trim()) ? 0.6 : 1 }}
              >
                {finalizing ? "Finalizing…" : "Mark as completed"}
              </button>
            </>
          )}
          {!isDraft && (
            <button
              type="button"
              onClick={() => save("draft")}
              disabled={saving || finalizing}
              style={{ border: "1px solid #DCE6F3", cursor: "pointer", fontFamily: "inherit", background: "#fff", color: "#55698F", fontWeight: 600, fontSize: 13.5, padding: "9px 16px", borderRadius: 10, opacity: (saving || finalizing) ? 0.6 : 1 }}
            >
              Re-open as draft
            </button>
          )}
        </div>

        {/* Source records */}
        {sources.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 15, margin: "0 0 4px", color: "#0B2B6B" }}>Source records</h2>
            <p style={{ fontSize: 13, color: "#8298BC", margin: "0 0 12px" }}>
              The narrative was synthesized from {sources.length} agent record{sources.length === 1 ? "" : "s"} in the chart:
            </p>
            <div style={{ border: "1px solid #E9F0F9", borderRadius: 13, overflow: "hidden" }}>
              {sources.map((s, i) => (
                <div
                  key={s.id ?? s._id ?? i}
                  style={{ padding: "14px 18px", borderBottom: i < sources.length - 1 ? "1px solid #F2F6FB" : "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0B2B6B" }}>{titleCase(s.agentType)}</span>
                    {s.createdAt && (
                      <span style={{ fontSize: 12, color: "#8298BC" }}>{format(new Date(s.createdAt), "PPp")}</span>
                    )}
                  </div>
                  {s.summary && (
                    <p style={{ fontSize: 12.5, color: "#55698F", lineHeight: 1.5, margin: "4px 0 0" }}>{s.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function extractNarrative(report) {
  if (!report?.content) return "";
  if (typeof report.content === "string") return report.content;
  if (Array.isArray(report.content)) return "";
  if (typeof report.content === "object" && report.content !== null) {
    return report.content.narrative || "";
  }
  return "";
}
