"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [practice, setPractice] = useState(null);
  const [practiceName, setPracticeName] = useState("");
  const [practiceAddress, setPracticeAddress] = useState("");
  const [practicePhone, setPracticePhone] = useState("");
  const [practiceTimezone, setPracticeTimezone] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState("");

  const TZ_OPTIONS = [
    { value: "America/New_York", label: "Eastern (ET)" },
    { value: "America/Chicago", label: "Central (CT)" },
    { value: "America/Denver", label: "Mountain (MT)" },
    { value: "America/Los_Angeles", label: "Pacific (PT)" },
    { value: "America/Phoenix", label: "Arizona (no DST)" },
    { value: "America/Anchorage", label: "Alaska (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Central Europe (CET)" },
    { value: "Europe/Moscow", label: "Moscow (MSK)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Asia/Kolkata", label: "India (IST)" },
    { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Asia/Shanghai", label: "China (CST)" },
    { value: "Asia/Tokyo", label: "Japan (JST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST)" },
    { value: "Pacific/Auckland", label: "New Zealand (NZST)" },
    { value: "America/Sao_Paulo", label: "Brazil (BRT)" },
  ];

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        const res = await fetch("/api/practice");
        if (!res.ok) return;
        const data = await res.json();
        setPractice(data.practice);
        setPracticeName(data.practice?.name || "");
        setPracticeAddress(data.practice?.address || "");
        setPracticePhone(data.practice?.phone || "");
        setPracticeTimezone(data.practice?.timezone || "America/New_York");
      } catch {
        // Non-fatal — Practice card stays hidden until we can load it.
      }
    })();
  }, [status]);

  const savePracticeSettings = async (e) => {
    e?.preventDefault();
    const nameChanged = practiceName.trim() && practiceName.trim() !== practice?.name;
    const tzChanged = practiceTimezone && practiceTimezone !== practice?.timezone;
    const addressChanged = practiceAddress.trim() !== (practice?.address || "");
    const phoneChanged = practicePhone.trim() !== (practice?.phone || "");
    if (!nameChanged && !tzChanged && !addressChanged && !phoneChanged) return;
    setSaving(true);
    setSaveError("");
    try {
      const body = {};
      if (nameChanged) body.name = practiceName.trim();
      if (tzChanged) body.timezone = practiceTimezone;
      if (addressChanged) body.address = practiceAddress.trim();
      if (phoneChanged) body.phone = practicePhone.trim();
      const res = await fetch("/api/practice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setPractice((p) => ({ ...p, ...data }));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!practice?.isOwner || saving) return;
    const changed =
      (practiceName.trim() && practiceName.trim() !== practice.name) ||
      practiceTimezone !== practice.timezone ||
      practiceAddress.trim() !== (practice.address || "") ||
      practicePhone.trim() !== (practice.phone || "");
    if (!changed) return;
    const timer = setTimeout(() => savePracticeSettings(), 800);
    return () => clearTimeout(timer);
    // savePracticeSettings uses the same render's field values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice, practiceName, practiceAddress, practicePhone, practiceTimezone, saving]);

  if (status === "loading") {
    return <div className="text-center p-4 text-muted-foreground">Loading...</div>;
  }
  if (!session) return null;

  const CARD_STYLE = {
    background: "#fff",
    border: "1px solid #E3ECF7",
    borderRadius: 20,
    padding: "22px 26px",
    boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)",
  };

  const INPUT_STYLE = {
    display: "block",
    width: "100%",
    border: "1px solid #DCE6F3",
    borderRadius: 10,
    padding: "9px 13px",
    fontSize: 14,
    fontFamily: "inherit",
    color: "#0B2B6B",
    outline: "none",
    marginTop: 5,
    boxSizing: "border-box",
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>
          Settings
        </p>
        <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
          Practice settings
        </h1>
      </div>

      <div className="flex flex-col gap-5 max-w-2xl">
        {/* Card A — Practice */}
        {practice && (
          <div style={CARD_STYLE}>
            <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, margin: 0, color: "#0B2B6B" }}>
              Practice
            </h3>
            {practice.isOwner ? (
              <form onSubmit={savePracticeSettings} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="practiceName" style={{ fontSize: 13.5, fontWeight: 500, color: "#55698F" }}>
                    Practice name
                  </label>
                  <input
                    id="practiceName"
                    type="text"
                    value={practiceName}
                    onChange={(e) => setPracticeName(e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label htmlFor="practiceAddress" style={{ fontSize: 13.5, fontWeight: 500, color: "#55698F" }}>
                    Address
                  </label>
                  <input
                    id="practiceAddress"
                    type="text"
                    value={practiceAddress}
                    onChange={(e) => setPracticeAddress(e.target.value)}
                    placeholder="123 Main St, Suite 4, City, ST 00000"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label htmlFor="practicePhone" style={{ fontSize: 13.5, fontWeight: 500, color: "#55698F" }}>
                    Phone
                  </label>
                  <input
                    id="practicePhone"
                    type="tel"
                    value={practicePhone}
                    onChange={(e) => setPracticePhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label htmlFor="practiceTimezone" style={{ fontSize: 13.5, fontWeight: 500, color: "#55698F" }}>
                    Timezone
                  </label>
                  <select
                    id="practiceTimezone"
                    value={practiceTimezone}
                    onChange={(e) => setPracticeTimezone(e.target.value)}
                    style={{ ...INPUT_STYLE, background: "#fff" }}
                  >
                    {TZ_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  {savedFlash && <span className="text-sm text-muted-foreground">Saved.</span>}
                </div>
              </form>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Practice: <span className="font-medium text-foreground">{practice.name}</span>
              </p>
            )}
          </div>
        )}

        {/* Card B — Subscription */}
        <div style={CARD_STYLE}>
          <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, margin: 0, color: "#0B2B6B" }}>
            Subscription
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your plan, seats, and payment method.
          </p>
          <div className="mt-4">
            <Link
              href="/billing"
              className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Manage subscription
            </Link>
          </div>
        </div>

        {/* Card C — Data Management */}
        <div style={CARD_STYLE}>
          <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, margin: 0, color: "#0B2B6B" }}>
            Data management
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Download all your data in JSON format. This includes clients, sessions, reports, and AI analyses.
          </p>
          <div className="mt-4">
            <button
              onClick={async () => {
                try {
                  const response = await fetch("/api/export");
                  if (!response.ok) {
                    throw new Error("Failed to export data");
                  }
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `cognicare_export_${new Date().toISOString().split("T")[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  console.error("Error exporting data:", error);
                  alert("Failed to export data. Please try again.");
                }
              }}
              className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Export all data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
