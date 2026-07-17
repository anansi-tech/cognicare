"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SaveDot, InlineEditScope, InlineField, InlineInput } from "@/components/ai/editable";
import { useAutosaveRecord } from "@/components/ai/useAutosaveRecord";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [practice, setPractice] = useState(null);
  const [practiceName, setPracticeName] = useState("");
  const [practiceAddress, setPracticeAddress] = useState("");
  const [practicePhone, setPracticePhone] = useState("");
  const [practiceTimezone, setPracticeTimezone] = useState("");

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

  // Autosave owns persistence — there is no Save button. It must whisper: a
  // quiet SaveDot, never a toast, consistent with every other surface.
  // Only changed fields are PATCHed, so a settled form is a no-op (the R53
  // contract, preserved through the shared engine).
  const valuesRef = useRef({});
  valuesRef.current = {
    name: practiceName.trim(),
    address: practiceAddress.trim(),
    phone: practicePhone.trim(),
    timezone: practiceTimezone,
  };
  const practiceRef = useRef(practice);
  practiceRef.current = practice;

  const { touch, saveState, savedAt, problems, markSaved } = useAutosaveRecord({
    getBody: () => ({ ...valuesRef.current }),
    validate: () => (valuesRef.current.name ? [] : ["Practice name is required"]),
    save: async (full) => {
      // Changed-fields-only PATCH, exactly as before.
      const p = practiceRef.current;
      const body = {};
      if (full.name && full.name !== p?.name) body.name = full.name;
      if (full.timezone && full.timezone !== p?.timezone) body.timezone = full.timezone;
      if (full.address !== (p?.address || "")) body.address = full.address;
      if (full.phone !== (p?.phone || "")) body.phone = full.phone;
      if (Object.keys(body).length === 0) return true;
      const res = await fetch("/api/practice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
      if (!res.ok) return false;
      const data = await res.json();
      setPractice((prev) => ({ ...prev, ...data }));
      return true;
    },
  });

  // Seed the no-op baseline once the practice loads.
  useEffect(() => {
    if (!practice) return;
    markSaved({
      name: practice.name || "",
      address: practice.address || "",
      phone: practice.phone || "",
      timezone: practice.timezone || "America/New_York",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice?._id]);

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
            <div className="flex items-center justify-between gap-3">
              <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, margin: 0, color: "#0B2B6B" }}>
                Practice
              </h3>
              {practice.isOwner && <SaveDot state={saveState} savedAt={savedAt} updatedAt={practice.updatedAt} />}
            </div>
            {practice.isOwner ? (
              <div className="mt-3">
                {problems.length > 0 && (
                  <p className="text-xs text-destructive" style={{ margin: "0 0 6px" }}>{problems.join(" · ")} — changes aren&apos;t saved until fixed.</p>
                )}
                <InlineEditScope>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", columnGap: 28 }}>
                    <InlineField
                      id="practiceName"
                      label="Practice name"
                      value={practiceName}
                      onChange={(v) => { setPracticeName(v); touch(); }}
                      read={<p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#41557A", margin: 0 }}>{practiceName || "—"}</p>}
                      editor={<InlineInput value={practiceName} onChange={(v) => { setPracticeName(v); touch(); }} placeholder="Practice name" />}
                    />
                    <InlineField
                      id="practicePhone"
                      label="Phone"
                      value={practicePhone}
                      onChange={(v) => { setPracticePhone(v); touch(); }}
                      read={<p style={{ fontSize: 13.5, lineHeight: 1.6, color: practicePhone ? "#41557A" : "#8298BC", margin: 0 }}>{practicePhone || "Not set"}</p>}
                      editor={<InlineInput type="tel" value={practicePhone} onChange={(v) => { setPracticePhone(v); touch(); }} placeholder="(555) 000-0000" />}
                    />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <InlineField
                        id="practiceAddress"
                        label="Address"
                        value={practiceAddress}
                        onChange={(v) => { setPracticeAddress(v); touch(); }}
                        read={<p style={{ fontSize: 13.5, lineHeight: 1.6, color: practiceAddress ? "#41557A" : "#8298BC", margin: 0 }}>{practiceAddress || "Not set"}</p>}
                        editor={<InlineInput value={practiceAddress} onChange={(v) => { setPracticeAddress(v); touch(); }} placeholder="123 Main St, Suite 4, City, ST 00000" />}
                      />
                    </div>
                    <InlineField
                      id="practiceTimezone"
                      label="Timezone"
                      value={practiceTimezone}
                      onChange={(v) => { setPracticeTimezone(v); touch(); }}
                      read={
                        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#41557A", margin: 0 }}>
                          {TZ_OPTIONS.find((o) => o.value === practiceTimezone)?.label ?? practiceTimezone}
                        </p>
                      }
                      editor={
                        <select
                          autoFocus
                          value={practiceTimezone}
                          onChange={(e) => { setPracticeTimezone(e.target.value); touch(); }}
                          style={{ ...INPUT_STYLE, marginTop: 0, background: "#fff" }}
                        >
                          {TZ_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      }
                    />
                  </div>
                </InlineEditScope>
              </div>
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
