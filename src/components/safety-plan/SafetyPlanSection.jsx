"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Section } from "@/components/ai/Section";
import { SaveIndicator } from "@/components/ai/editable";
import { LifeBuoy } from "lucide-react";

// Stanley-Brown step headings — verbatim from the 2021 template. Free for
// individual clinical use with attribution; do not paraphrase.
const STEPS = [
  { key: "warningSigns", label: "Step 1: Warning signs" },
  { key: "internalCoping", label: "Step 2: Internal coping strategies — things I can do to take my mind off my problems without contacting another person" },
  { key: "distractions", label: "Step 3: People and social settings that provide distraction" },
  { key: "peopleForHelp", label: "Step 4: People whom I can ask for help during a crisis" },
  { key: "professionals", label: "Step 5: Professionals or agencies I can contact during a crisis" },
  { key: "environmentSafety", label: "Step 6: Making the environment safer (plan for lethal means safety)" },
];

const ATTRIBUTION =
  "Stanley-Brown Safety Plan © 2008, 2021 Barbara Stanley, PhD & Gregory K. Brown, PhD. Individual clinical use permitted (suicidesafetyplan.com).";

const fmt = (d) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const toText = (v) => (Array.isArray(v) ? v.join("\n") : v ?? "");

/**
 * Per-client chart artifact (Round 55): one active Stanley-Brown safety plan,
 * edit-in-place with debounced server autosave, "Reviewed today" stamping
 * reviewedAt. Content is encrypted server-side; this component only ever
 * holds the decrypted working copy.
 */
export function SafetyPlanSection({ clientId, onPlanChanged }) {
  const [plan, setPlan] = useState(null); // null = loading; {exists:false} = none yet
  const [fields, setFields] = useState(null); // string working copy per step
  const [saveState, setSaveState] = useState("idle");
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(null);
  const fieldsRef = useRef(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/safety-plan`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setPlan(data);
        if (data.exists) {
          setFields(Object.fromEntries(
            [...STEPS.map((s) => s.key), "reasonsForLiving"].map((k) => [k, toText(data[k])])
          ));
        }
      })
      .catch(() => {});
  }, [clientId]);

  const put = useCallback(async (body) => {
    const res = await fetch(`/api/clients/${clientId}/safety-plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true, // pagehide flush must survive navigation
    });
    return res.ok ? res.json() : null;
  }, [clientId]);

  const saveNow = useCallback(async () => {
    if (!dirtyRef.current || !fieldsRef.current) return;
    dirtyRef.current = false;
    setSaveState("saving");
    const f = fieldsRef.current;
    const body = Object.fromEntries(
      Object.entries(f).map(([k, v]) =>
        k === "reasonsForLiving" ? [k, v] : [k, v.split("\n").filter((line) => line.trim() !== "")]
      )
    );
    const saved = await put(body);
    setSaveState(saved ? "saved" : "error");
    if (saved) {
      setPlan((p) => ({ ...p, ...saved }));
      onPlanChanged?.(saved);
    }
  }, [put, onPlanChanged]);

  // Flush pending edits when the tab hides or the section unmounts.
  useEffect(() => {
    const flush = () => { clearTimeout(timerRef.current); saveNow(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, [saveNow]);

  const edit = (key, value) => {
    setFields((f) => {
      const next = { ...f, [key]: value };
      fieldsRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    setSaveState("saving");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveNow, 900);
  };

  const create = async () => {
    setBusy(true);
    const saved = await put({});
    setBusy(false);
    if (saved) {
      setPlan(saved);
      setFields(Object.fromEntries(
        [...STEPS.map((s) => s.key), "reasonsForLiving"].map((k) => [k, ""])
      ));
      onPlanChanged?.(saved);
    }
  };

  const markReviewed = async () => {
    setBusy(true);
    const res = await fetch(`/api/clients/${clientId}/safety-plan`, { method: "PATCH" });
    setBusy(false);
    if (res.ok) {
      const saved = await res.json();
      setPlan((p) => ({ ...p, reviewedAt: saved.reviewedAt }));
      onPlanChanged?.(saved);
    }
  };

  const exists = plan?.exists && fields;

  const actions = exists ? (
    <>
      <SaveIndicator state={saveState} />
      {plan.reviewedAt && (
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", background: "#E7F6EC", color: "#3B9E57" }}>
          Reviewed {fmt(plan.reviewedAt)}
        </span>
      )}
      <button
        type="button"
        onClick={markReviewed}
        disabled={busy}
        style={{ border: "1px solid #DCE6F3", cursor: "pointer", fontFamily: "inherit", background: "#fff", color: "#2F80FF", fontWeight: 700, fontSize: 12.5, padding: "6px 13px", borderRadius: 9 }}
      >
        Reviewed today
      </button>
    </>
  ) : undefined;

  const textareaStyle = {
    width: "100%",
    minHeight: 64,
    border: "1px solid #E3ECF7",
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13.5,
    fontFamily: "inherit",
    color: "#24344F",
    lineHeight: 1.55,
    resize: "vertical",
    background: "#FAFCFF",
  };

  return (
    <Section
      id="sec-safety-plan"
      sticky
      title="Safety plan"
      icon={<LifeBuoy size={16} />}
      subtitle="Stanley-Brown Safety Planning Intervention"
      actions={actions}
    >
      {plan === null ? (
        <p style={{ fontSize: 13, color: "#8298BC", margin: 0 }}>Loading…</p>
      ) : !exists ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <p style={{ fontSize: 13, color: "#8298BC", margin: 0, flex: 1, minWidth: 240 }}>
            No safety plan on file. A positive screen is typically followed by
            creating one with the client.
          </p>
          <button
            type="button"
            onClick={create}
            disabled={busy}
            style={{ border: "none", cursor: "pointer", fontFamily: "inherit", background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 16px", borderRadius: 10, boxShadow: "0 10px 24px -12px rgba(47,128,255,.7)" }}
          >
            Create safety plan
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {STEPS.map((s) => (
            <div key={s.key}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0B2B6B", marginBottom: 6 }}>{s.label}</div>
              {s.key === "professionals" && (
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#158A98", background: "#E2F4F2", borderRadius: 8, padding: "6px 11px", marginBottom: 6 }}>
                  988 Suicide &amp; Crisis Lifeline — call or text 988
                </div>
              )}
              <textarea
                value={fields[s.key]}
                onChange={(e) => edit(s.key, e.target.value)}
                placeholder="One entry per line"
                style={textareaStyle}
              />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0B2B6B", marginBottom: 6 }}>
              The one thing that is most important to me and worth living for is
              <span style={{ fontWeight: 500, color: "#8298BC" }}> (optional)</span>
            </div>
            <textarea
              value={fields.reasonsForLiving}
              onChange={(e) => edit("reasonsForLiving", e.target.value)}
              style={{ ...textareaStyle, minHeight: 48 }}
            />
          </div>
          <p style={{ fontSize: 11, color: "#A6B8D4", margin: 0 }}>{ATTRIBUTION}</p>
        </div>
      )}
    </Section>
  );
}
