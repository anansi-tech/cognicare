"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Section } from "@/components/ai/Section";
import { SaveDot, InlineEditScope, InlineField, InlineList, InlineText } from "@/components/ai/editable";
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

const LIFELINE = (
  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#158A98", background: "#E2F4F2", borderRadius: 8, padding: "6px 11px", marginBottom: 6 }}>
    988 Suicide &amp; Crisis Lifeline — call or text 988
  </div>
);

const StepList = ({ items }) =>
  items?.length ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map((x, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: "50%", background: "#9FB6D8", marginTop: 7 }} />
          <span style={{ fontSize: 13, lineHeight: 1.55, color: "#41557A" }}>{x}</span>
        </div>
      ))}
    </div>
  ) : (
    <p style={{ fontSize: 13, color: "#8298BC", margin: 0 }}>Nothing entered yet.</p>
  );

/**
 * Per-client chart artifact (Round 55): one active Stanley-Brown safety plan.
 * Rendered as a read document with inline per-field editing (hover pencil per
 * step) — same InlineField pattern as AI reports. Edits merge into the full
 * plan and save through the existing debounced whole-document PUT; "Reviewed
 * today" stamps reviewedAt. Content is encrypted server-side.
 */
export function SafetyPlanSection({ clientId, onPlanChanged }) {
  const [plan, setPlan] = useState(null); // null = loading; {exists:false} = none yet
  const [fields, setFields] = useState(null); // arrays per step + reasonsForLiving string
  const [saveState, setSaveState] = useState("idle");
  const [savedAt, setSavedAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(null);
  const fieldsRef = useRef(null);
  const dirtyRef = useRef(false);
  const lastSavedRef = useRef(null); // canonical body of the last known server state

  const seed = (data) =>
    Object.fromEntries([
      ...STEPS.map((s) => [s.key, Array.isArray(data?.[s.key]) ? data[s.key] : []]),
      ["reasonsForLiving", data?.reasonsForLiving ?? ""],
    ]);
  const toBody = (f) =>
    Object.fromEntries(
      Object.entries(f).map(([k, v]) =>
        k === "reasonsForLiving" ? [k, v] : [k, v.filter((line) => line.trim() !== "")]
      )
    );

  useEffect(() => {
    fetch(`/api/clients/${clientId}/safety-plan`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setPlan(data);
        if (data.exists) {
          const f = seed(data);
          setFields(f);
          fieldsRef.current = f;
          lastSavedRef.current = JSON.stringify(toBody(f));
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
    // Whole document through the existing PUT — never partial payloads.
    const body = toBody(fieldsRef.current);
    // No-op gate: a cancelled edit (Escape restores the pre-edit value) or an
    // editor round-trip must never fire a PUT.
    if (JSON.stringify(body) === lastSavedRef.current) {
      setSaveState("idle");
      return;
    }
    setSaveState("saving");
    const saved = await put(body);
    setSaveState(saved ? "saved" : "error");
    if (saved) {
      lastSavedRef.current = JSON.stringify(body);
      setSavedAt(new Date());
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
      const f = seed(saved);
      setFields(f);
      fieldsRef.current = f;
      lastSavedRef.current = JSON.stringify(toBody(f));
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
      <SaveDot state={saveState} savedAt={savedAt} updatedAt={plan.updatedAt} />
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
        <InlineEditScope>
          <div>
            {STEPS.map((s) => (
              <InlineField
                key={s.key}
                id={s.key}
                label={s.label}
                value={fields[s.key]}
                onChange={(v) => edit(s.key, v)}
                read={
                  <>
                    {s.key === "professionals" && LIFELINE}
                    <StepList items={fields[s.key]} />
                  </>
                }
                editor={
                  <>
                    {s.key === "professionals" && LIFELINE}
                    <InlineList value={fields[s.key]} onChange={(v) => edit(s.key, v)} placeholder="One entry per line" />
                  </>
                }
              />
            ))}
            <InlineField
              id="reasonsForLiving"
              label="The one thing that is most important to me and worth living for is (optional)"
              value={fields.reasonsForLiving}
              onChange={(v) => edit("reasonsForLiving", v)}
              read={
                fields.reasonsForLiving ? (
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#41557A", margin: 0 }}>{fields.reasonsForLiving}</p>
                ) : (
                  <p style={{ fontSize: 13, color: "#8298BC", margin: 0 }}>Nothing entered yet.</p>
                )
              }
              editor={<InlineText value={fields.reasonsForLiving} onChange={(v) => edit("reasonsForLiving", v)} rows={2} />}
            />
            <p style={{ fontSize: 11, color: "#A6B8D4", margin: "14px 0 0" }}>{ATTRIBUTION}</p>
          </div>
        </InlineEditScope>
      )}
    </Section>
  );
}
