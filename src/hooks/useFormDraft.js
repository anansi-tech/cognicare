"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

const DRAFT_VERSION = 1;
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Local draft persistence for forms whose explicit submit has domain side
// effects and therefore must not be replaced with server autosave. Guards
// against losing work to an expired session or stray navigation.
//
// PHI note: the draft lives in the clinician's own browser, in plaintext, and is
// scoped to the signed-in practice/user, expires after 24 hours, and is cleared
// on submit or cancel. Transient by design — never a system of record.
//
//   const { draftRestored, dismissRestored, clearDraft, saveState } =
//     useFormDraft(key, form, setForm, enabled);
export function useFormDraft(
  key,
  formData,
  setFormData,
  enabled = true,
  { maxAgeMs = DEFAULT_MAX_AGE_MS } = {}
) {
  const { data: session, status } = useSession();
  const ownerKey = session?.user
    ? `${session.user.practiceId ?? "no-practice"}:${session.user.id ?? session.user.email}`
    : null;
  const storageKey = ownerKey ? `cognicare:${ownerKey}:${key}` : key;
  const active = enabled && status === "authenticated";
  const [draftRestored, setDraftRestored] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const hydrated = useRef(false);
  const activeKey = useRef(null);
  const latestData = useRef(formData);
  const baseValue = useRef(null);

  latestData.current = formData;

  const writeDraft = useCallback(() => {
    if (!active || !hydrated.current) return;
    try {
      if (JSON.stringify(latestData.current) === baseValue.current) {
        window.localStorage.removeItem(storageKey);
        setSaveState("idle");
        return;
      }
      window.localStorage.setItem(storageKey, JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: Date.now(),
        data: latestData.current,
      }));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [active, storageKey]);

  // Restore once per key. Expired or incompatible drafts are discarded.
  useEffect(() => {
    if (!active) return;
    if (activeKey.current !== storageKey) {
      activeKey.current = storageKey;
      hydrated.current = false;
      setDraftRestored(false);
      setSaveState("idle");
    }
    if (hydrated.current) return;
    hydrated.current = true;
    baseValue.current = JSON.stringify(formData);
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const isEnvelope = parsed?.version !== undefined && parsed?.data !== undefined;
      const expired = isEnvelope && Date.now() - parsed.savedAt > maxAgeMs;
      const incompatible = isEnvelope && parsed.version !== DRAFT_VERSION;
      if (expired || incompatible) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      const data = isEnvelope ? parsed.data : parsed; // Restore pre-envelope drafts.
      if (!data || typeof data !== "object") return;
      setFormData((prev) => ({ ...prev, ...data }));
      setDraftRestored(true);
    } catch {
      // Corrupt draft — drop it rather than trapping the user in a broken form.
      try { window.localStorage.removeItem(storageKey); } catch {}
    }
  }, [active, storageKey, formData, maxAgeMs, setFormData]);

  // Debounced save on change. Skips the first pass so mounting an empty form
  // doesn't immediately write an empty draft.
  useEffect(() => {
    if (!active || !hydrated.current) return;
    setSaveState("saving");
    const t = setTimeout(writeDraft, 800);
    return () => clearTimeout(t);
  }, [storageKey, formData, active, writeDraft]);

  // A debounce should not make the final keystroke disposable on tab close.
  useEffect(() => {
    if (!active) return;
    const flush = () => writeDraft();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [active, writeDraft]);

  const clearDraft = useCallback((nextBaseline) => {
    try { window.localStorage.removeItem(storageKey); } catch {}
    baseValue.current = JSON.stringify(nextBaseline ?? latestData.current);
    setDraftRestored(false);
    setSaveState("idle");
  }, [storageKey]);

  const dismissRestored = useCallback(() => setDraftRestored(false), []);

  return { draftRestored, dismissRestored, clearDraft, saveState };
}
