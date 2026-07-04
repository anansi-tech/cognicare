"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ConsentMarkdown } from "@/components/ai/ConsentMarkdown";
import { Spinner } from "@/components/ui/Spinner";

// Public consent portal — opened from the link sent to the client. Token in
// the URL is the only authorization (no account / no session). Mobile-first:
// big tap targets, plain language, readable text.
export default function ConsentPortalPage() {
  const { token } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typedName, setTypedName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/consent-forms/${token}?token=true`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Consent link is invalid or expired.");
        } else {
          setForm(data);
        }
      } catch {
        setError("Could not load consent form.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const isMinor = form?.type === "minor";
  const nameLabel = isMinor ? "Parent / guardian full name" : "Your full name";

  const canSubmit = useMemo(() => {
    if (!typedName.trim() || !agreed || submitting) return false;
    if (isMinor && !guardianRelationship.trim()) return false;
    return true;
  }, [typedName, agreed, isMinor, guardianRelationship, submitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/consent-forms/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          typedName: typedName.trim(),
          agreed: true,
          guardianRelationship: isMinor ? guardianRelationship.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not record signature");
      // Re-fetch in signed state for confirmation + download link. The form's
      // _id is what the GET-by-signed path expects when the token is cleared.
      const followup = await fetch(`/api/consent-forms/${data.formId}?token=true`);
      if (followup.ok) setForm(await followup.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const PAGE = {
    fontFamily: "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)",
    color: "#0B2B6B",
    background: "#EEF4FB",
    minHeight: "100vh",
    padding: "24px 16px 64px",
  };

  const CARD = {
    background: "#fff",
    border: "1px solid #E9F0F9",
    borderRadius: 20,
    boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)",
    padding: "24px 22px 26px",
  };

  const INPUT_STYLE = {
    width: "100%",
    border: "1px solid #DCE6F3",
    borderRadius: 11,
    padding: "12px 14px",
    fontFamily: "inherit",
    fontSize: 15,
    color: "#0B2B6B",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
    transition: "border-color .13s, box-shadow .13s",
  };

  function onFocus(e) {
    e.target.style.borderColor = "#2F80FF";
    e.target.style.boxShadow = "0 0 0 3px rgba(47,128,255,.16)";
  }
  function onBlur(e) {
    e.target.style.borderColor = "#DCE6F3";
    e.target.style.boxShadow = "none";
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...PAGE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={40} />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error && !form) {
    return (
      <div style={PAGE}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ ...CARD, textAlign: "center", padding: "40px 28px" }}>
            <span style={{ display: "inline-grid", placeItems: "center", width: 52, height: 52, borderRadius: 14, background: "#FDECEC", marginBottom: 16 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
            <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 22, margin: 0, color: "#0B2B6B" }}>
              Link unavailable
            </h1>
            <p style={{ fontSize: 14, color: "#55698F", margin: "10px 0 0", lineHeight: 1.55 }}>{error}</p>
            <p style={{ fontSize: 12.5, color: "#8298BC", margin: "14px 0 0" }}>
              Please contact your counselor to request a new consent link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const signed = form.status === "signed";
  const downloadUrl = form.signedDocumentUrl || form.documentUrl;
  const practiceName = form.practiceName || "CogniCare";

  // ── Main (awaiting / signed) ─────────────────────────────────────────────
  return (
    <div style={PAGE}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        {/* Practice mark */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginBottom: 16 }}>
          <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, background: "#0B2B6B" }}>
            <svg width="17" height="17" viewBox="0 0 512 512">
              <path d="M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38" fill="none" stroke="#25B9C8" strokeWidth="46" strokeLinecap="round" />
            </svg>
          </span>
          <span style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 15, color: "#0B2B6B" }}>
            {practiceName}
          </span>
        </div>

        {/* Card */}
        <div style={CARD}>

          {/* Header */}
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase" }}>
            Consent form
          </div>
          <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 24, letterSpacing: "-.01em", margin: "6px 0 0", color: "#0B2B6B" }}>
            {form.title || "Consent Form"}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9 }}>
            <span style={{ fontSize: 13, color: "#8298BC" }}>Version {form.version}</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#C7D5E8", display: "inline-block" }} />
            <span style={{
              fontSize: 11.5,
              fontWeight: 700,
              padding: "3px 11px",
              borderRadius: 999,
              background: signed ? "#E7F6EC" : "#FBF2DA",
              color: signed ? "#3B9E57" : "#A9821F",
            }}>
              {signed ? "Signed" : "Awaiting signature"}
            </span>
          </div>

          {/* Body scroller — Source Serif 4 for formal document feel */}
          {form.body && (
            <div style={{
              marginTop: 18,
              maxHeight: 300,
              overflowY: "auto",
              border: "1px solid #E7EEF7",
              background: "#F7FAFE",
              borderRadius: 14,
              padding: "18px 20px",
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: 13.5,
              lineHeight: 1.62,
              color: "#33465F",
            }}>
              <ConsentMarkdown content={form.body} />
            </div>
          )}

          {/* ── Signed state ──────────────────────────────────────────────── */}
          {signed ? (
            <div style={{ marginTop: 18, background: "#EAF7EF", border: "1px solid #CDE9D6", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B9E57" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p style={{ fontSize: 13.5, color: "#2C7A46", margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                  Thank you. This form was electronically signed on{" "}
                  <strong>{form.dateSigned ? new Date(form.dateSigned).toLocaleString() : "—"}</strong>.
                </p>
              </div>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    background: "#2F80FF",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13.5,
                    padding: "10px 16px",
                    borderRadius: 10,
                    textDecoration: "none",
                    boxShadow: "0 16px 40px -18px rgba(47,128,255,.8)",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download signed copy
                </a>
              )}
            </div>

          ) : (
            /* ── Awaiting form ────────────────────────────────────────────── */
            <form onSubmit={handleSubmit} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label htmlFor="typedName" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#33465F", marginBottom: 6 }}>
                  {nameLabel}
                </label>
                <input
                  id="typedName"
                  type="text"
                  autoComplete="name"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  style={INPUT_STYLE}
                  placeholder={isMinor ? "e.g. Jane Doe" : "Type your full legal name"}
                  required
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              {isMinor && (
                <div>
                  <label htmlFor="relationship" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#33465F", marginBottom: 6 }}>
                    Relationship to minor
                  </label>
                  <input
                    id="relationship"
                    type="text"
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value)}
                    style={INPUT_STYLE}
                    placeholder="e.g. Mother, Father, Legal guardian"
                    required
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              )}

              {/* ESIGN checkbox — hidden real input + custom visual, linked via htmlFor */}
              <input
                id="agreed"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required
                style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
              />
              <label htmlFor="agreed" style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <span style={{
                  flexShrink: 0,
                  marginTop: 1,
                  display: "grid",
                  placeItems: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: agreed ? "1.5px solid #2F80FF" : "1.5px solid #C0D0E4",
                  background: agreed ? "#EAF3FF" : "#fff",
                  transition: "border-color .13s, background .13s",
                }}>
                  {agreed && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2F80FF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.5, color: "#33465F" }}>
                  I have read and agree to this consent form. I understand that
                  typing my name above constitutes a legally binding electronic
                  signature under the US ESIGN Act.
                </span>
              </label>

              {error && (
                <div style={{ background: "#FDECEC", border: "1px solid #F5C6C6", borderRadius: 11, padding: "12px 14px", fontSize: 13.5, color: "#C0392B" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  width: "100%",
                  border: "none",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  background: "#2F80FF",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: 14,
                  borderRadius: 12,
                  boxShadow: canSubmit ? "0 16px 40px -18px rgba(47,128,255,.85)" : "none",
                  opacity: canSubmit ? 1 : 0.5,
                  transition: "opacity .15s",
                }}
              >
                {submitting ? "Signing…" : "Sign electronically"}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 11.5, color: "#A6B8D4", margin: "18px 0 0" }}>
          Secured by {practiceName} · Your information is private &amp; encrypted
        </p>
      </div>
    </div>
  );
}
