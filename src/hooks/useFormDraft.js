"use client";
import { useEffect, useRef, useState } from "react";

// Local draft persistence for forms that have no server-side document to
// autosave against (i.e. before the record exists). Guards against losing a
// long intake write-up to an expired session or a stray navigation.
//
// PHI note: the draft lives in the clinician's own browser, in plaintext, and is
// cleared on submit or cancel. Transient by design — never a system of record.
//
//   const { draftRestored, dismissRestored, clearDraft } = useFormDraft(key, form, setForm, enabled);
//
// `enabled` is false in edit mode — an existing record already has server state.
export function useFormDraft(key, formData, setFormData, enabled = true) {
  const [draftRestored, setDraftRestored] = useState(false);
  const hydrated = useRef(false);

  // Restore once on mount.
  useEffect(() => {
    if (!enabled || hydrated.current) return;
    hydrated.current = true;
    try {
      const saved = window.localStorage.getItem(key);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        setFormData((prev) => ({ ...prev, ...parsed }));
        setDraftRestored(true);
      }
    } catch {
      // Corrupt draft — drop it rather than trapping the user in a broken form.
      try { window.localStorage.removeItem(key); } catch {}
    }
  }, [key, enabled, setFormData]);

  // Debounced save on change. Skips the first pass so mounting an empty form
  // doesn't immediately write an empty draft.
  useEffect(() => {
    if (!enabled || !hydrated.current) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(formData));
      } catch {
        // Quota/private-mode — losing the draft is acceptable; breaking the form is not.
      }
    }, 800);
    return () => clearTimeout(t);
  }, [key, formData, enabled]);

  const clearDraft = () => {
    try { window.localStorage.removeItem(key); } catch {}
    setDraftRestored(false);
  };

  return { draftRestored, dismissRestored: () => setDraftRestored(false), clearDraft };
}
