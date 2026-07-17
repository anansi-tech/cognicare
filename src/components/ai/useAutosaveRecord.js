"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Shared autosave engine for inline-editable records (client profile, safety
// plan, session editor, practice settings). One contract everywhere:
//  - debounced whole-body saves through the record's EXISTING endpoint —
//    callers own the fetch (and pass keepalive: true so flushes survive
//    navigation); this hook never constructs partial payloads
//  - canonical no-op gate: a cancelled edit or editor round-trip that leaves
//    the body identical to the last-saved state fires NO request. (The
//    stringify compare is sufficient here because these records build their
//    bodies fresh with stable key order; AI reports keep their own canonical
//    hash gate in useEditableReport.)
//  - optional validate(): returning problems blocks the save and surfaces
//    them; the next change re-arms the debounce
//  - flush on pagehide / tab-hide / unmount so the debounce window is never
//    a data-loss window
//
// NOT used by SessionNote (its flush lifecycle is pinned and bespoke) or by
// useEditableReport (reports carry approve/reconciliation semantics).
//
// Args: { getBody, save, validate?, delay = 800, seed? }
//  - getBody(): current whole-record body (read from a ref, not closure state)
//  - save(body): Promise<boolean> — true on success
//  - seed: initial body (the loaded record) so the first no-op is caught;
//    call markSaved(body) instead when the record loads asynchronously
export function useAutosaveRecord({ getBody, save, validate, delay = 800, seed }) {
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [savedAt, setSavedAt] = useState(null);
  const [problems, setProblems] = useState([]);
  const dirtyRef = useRef(false);
  const timerRef = useRef(null);
  const lastSavedRef = useRef(seed !== undefined ? JSON.stringify(seed) : null);

  // Latest-callback refs: flush must be identity-stable for the lifecycle
  // effect while always seeing current state.
  const getBodyRef = useRef(getBody);
  const saveRef = useRef(save);
  const validateRef = useRef(validate);
  getBodyRef.current = getBody;
  saveRef.current = save;
  validateRef.current = validate;

  const flush = useCallback(async () => {
    clearTimeout(timerRef.current);
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    const errs = validateRef.current ? validateRef.current() : [];
    setProblems(errs);
    if (errs.length) {
      // Invalid records never save; the next edit re-arms the debounce.
      setSaveState("error");
      return;
    }
    const body = getBodyRef.current();
    if (JSON.stringify(body) === lastSavedRef.current) {
      setSaveState("idle");
      return;
    }
    setSaveState("saving");
    try {
      const ok = await saveRef.current(body);
      if (ok) {
        lastSavedRef.current = JSON.stringify(body);
        setSaveState("saved");
        setSavedAt(new Date());
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
  }, []);

  // Call on every field change: marks dirty and (re)arms the debounce.
  const touch = useCallback(() => {
    dirtyRef.current = true;
    setSaveState("saving");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, delay);
  }, [flush, delay]);

  // Reset the no-op baseline (async load, create-then-edit).
  const markSaved = useCallback((body) => {
    lastSavedRef.current = JSON.stringify(body);
  }, []);

  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      flush(); // unmount flush
    };
  }, [flush]);

  return { touch, flush, saveState, savedAt, problems, markSaved };
}
