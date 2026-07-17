// Shared controlled editing primitives for AI report bodies.
// All free-text fields use textarea (not input) — clinical content is long.
"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const BASE = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

export function SaveIndicator({ state }) {
  if (state === "saving") return <span className="text-xs text-muted-foreground">Saving…</span>;
  if (state === "saved") return <span className="text-xs text-muted-foreground">Saved</span>;
  if (state === "error") return <span className="text-xs text-destructive">Couldn&apos;t save</span>;
  return null;
}

// 32px square icon button used in section headers and the client header card.
export function IconButton({ title, onClick, disabled = false, danger = false, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={
        danger
          ? "hover:bg-[#FDECEC] hover:border-[#F3C2BC] hover:text-[#C0392B] transition-colors disabled:opacity-50"
          : "hover:bg-[#EAF3FF] hover:border-[#C7DCF5] hover:text-[#2F80FF] transition-colors disabled:opacity-50"
      }
      style={{ display: "grid", placeItems: "center", width: 32, height: 32, border: "1px solid #E3ECF7", borderRadius: 9, background: "#fff", color: "#55698F", cursor: disabled ? "default" : "pointer", flexShrink: 0 }}
    >
      {children}
    </button>
  );
}

export const PencilIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const CheckIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PILL = { fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" };
const SOLID_BTN = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 9, color: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "7px 13px", cursor: "pointer" };

// Dot-time save indicator (inline-editing header): 7px dot — idle #D9E5F4,
// saving #F0C24B, saved #3B9E57 — the transient state. The timestamp is
// PERSISTENT: seeded from the record's updatedAt on load, replaced by this
// session's savedAt after a save. Errors stay loud text; a silent gray dot
// must never mean "failed".
export function SaveDot({ state, savedAt, updatedAt }) {
  if (state === "error") return <span className="text-xs text-destructive">Couldn&apos;t save</span>;
  const color = state === "saving" ? "#F0C24B" : state === "saved" ? "#3B9E57" : "#D9E5F4";
  const ts = savedAt ?? updatedAt;
  const label = ts
    ? `Updated ${new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : null;
  return (
    <span
      title={label ? `All changes saved · ${label.toLowerCase()}` : "No changes yet"}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#8298BC", whiteSpace: "nowrap" }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, transition: "background .2s", flexShrink: 0 }} />
      {label}
    </span>
  );
}

const GreenCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B9E57" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// 32px icon approve control. Single click, no confirm — acceptable ONLY
// because approve is non-destructive and reversible via edit; if approve
// ever becomes final, add a confirm.
export function ApproveControl({ approved = false, onApprove }) {
  if (approved) {
    return (
      <span title="Approved" aria-label="Approved" style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 9, background: "#E7F6EC", border: "1px solid #BFE5CB", flexShrink: 0 }}>
        <GreenCheck />
      </span>
    );
  }
  return (
    <button
      type="button"
      title="Approve this report"
      aria-label="Approve this report"
      onClick={onApprove}
      className="hover:bg-[#F0FAF3] transition-colors"
      style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 9, background: "#fff", border: "1px solid #CDE8D6", cursor: "pointer", flexShrink: 0 }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #2F80FF")}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <GreenCheck />
    </button>
  );
}

// Section-header action slot (Overview v2, inline-editing revision): draft
// pill + dot-time save indicator + 32px icon approve. Same hook functions as
// before — startEdit, approve — no new behavior. `extra` renders caller-owned
// buttons (e.g. the treatment revise icon) whose handlers stay with the caller.
export function SectionHeaderActions({ tx, report, editLabel = "Edit", extra = null }) {
  if (!report) return null;
  const isDraft = report.status === "draft";

  // Re-editing an approved (or pre-status) report: fields are inline-editable;
  // Done re-approves and exits, exactly as before.
  if (!isDraft && tx.isEditing) {
    return (
      <>
        <SaveDot state={tx.saveState} savedAt={tx.savedAt} updatedAt={report.updatedAt} />
        <button type="button" onClick={tx.approve} style={{ ...SOLID_BTN, background: "#2F80FF", boxShadow: "0 10px 24px -12px rgba(47,128,255,.7)" }}>
          <CheckIcon />Done
        </button>
      </>
    );
  }

  // Draft: fields are inline-editable (canEdit) — review & approve.
  if (isDraft) {
    return (
      <>
        <span style={{ ...PILL, background: "#FBF2DA", color: "#A9821F" }}>Draft — review</span>
        <SaveDot state={tx.saveState} savedAt={tx.savedAt} updatedAt={report.updatedAt} />
        {extra}
        <ApproveControl onApprove={tx.approve} />
      </>
    );
  }

  return (
    <>
      {report.status === "approved" && <ApproveControl approved />}
      {extra}
      <IconButton title={editLabel} onClick={tx.startEdit}>
        <PencilIcon />
      </IconButton>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inline per-field editing (replaces the all-fields-editable draft mode).
//
// PIN 1 — payload semantics unchanged: these wrappers only edit local state
// through the caller's onChange, which merges into the FULL payload object and
// flows through useEditableReport's existing debounced PATCH. No per-field
// endpoints, no partial payloads — payloadHash reconciliation depends on it.
// ---------------------------------------------------------------------------

const InlineEditCtx = createContext(null);

// One field editable at a time per report body. Opening another field closes
// the current one (commit, not cancel — autosave makes this safe).
export function InlineEditScope({ children }) {
  const [openKey, setOpenKey] = useState(null);
  return <InlineEditCtx.Provider value={{ openKey, setOpenKey }}>{children}</InlineEditCtx.Provider>;
}

// Inline field wrapper: read mode always; hover reveals the pencil; clicking
// the pencil or the read text edits ONLY this field in place.
// - `value`/`onChange`: the field's slice of the payload (snapshot for cancel).
// - `read`: read-mode node. `editor`: node, or ({ commit, cancel }) => node.
// - `bare`: no hint/Done chrome (enum pickers close themselves on pick).
// Keyboard: Escape cancels (restores pre-edit value), Cmd/Ctrl+Enter commits,
// Enter commits on single-line inputs. Focus returns to the pencil on close.
export function InlineField({ id, label, value, onChange, read, editor, bare = false }) {
  const ctx = useContext(InlineEditCtx);
  const isOpen = ctx?.openKey === id;
  const [hover, setHover] = useState(false);
  const pencilRef = useRef(null);
  const boxRef = useRef(null);
  const snapRef = useRef(null);

  const openEditor = () => {
    snapRef.current = value; // editors never mutate — reference snapshot is safe
    ctx?.setOpenKey(id);
  };
  const close = (focusPencil) => {
    ctx?.setOpenKey(null);
    if (focusPencil) setTimeout(() => pencilRef.current?.focus(), 0);
  };
  // Commit = close; the value already saved via the debounced autosave.
  const commit = (focusPencil = true) => close(focusPencil);
  // Cancel = restore the pre-edit value. If a debounced save was pending for
  // this change, restoring the value reschedules/clears it to the old state.
  const cancel = () => {
    onChange(snapRef.current);
    close(true);
  };

  // Click outside = commit/close (no focus steal).
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) commit(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    } else if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div
      ref={boxRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={isOpen ? onKeyDown : undefined}
      style={{
        margin: "6px -12px 0",
        borderRadius: 12,
        padding: 12,
        background: isOpen ? "#F3F8FF" : hover ? "#F7FAFE" : "transparent",
        transition: "background .13s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#7C93B8", margin: 0 }}>{label}</p>
        {!isOpen && (
          <button
            ref={pencilRef}
            type="button"
            title={`Edit ${label}`}
            aria-label={`Edit ${label}`}
            onClick={openEditor}
            style={{
              display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: 7,
              border: "none", background: "transparent", color: "#A6B8D4", cursor: "pointer",
              opacity: hover ? 1 : 0, transition: "opacity .12s, background .12s, color .12s",
            }}
            onFocus={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.boxShadow = "0 0 0 2px #2F80FF"; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; if (!hover) e.currentTarget.style.opacity = 0; }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#EAF3FF"; e.currentTarget.style.color = "#2F80FF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#A6B8D4"; }}
          >
            <PencilIcon size={13} />
          </button>
        )}
      </div>
      {isOpen ? (
        <div>
          {typeof editor === "function" ? editor({ commit, cancel }) : editor}
          {/* No field-level Done: it wouldn't save anything (autosave does) —
              Esc cancels, Enter/outside-click commits. */}
          {!bare && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 11.5, color: "#8298BC" }}>Saves automatically · Esc to cancel · click outside to close</span>
            </div>
          )}
        </div>
      ) : (
        // Clicking the read-mode text also opens the editor (bigger target).
        <div onClick={openEditor} style={{ cursor: "text" }}>{read}</div>
      )}
    </div>
  );
}

const INLINE_INPUT = {
  width: "100%",
  border: "1px solid #D9E5F4",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13.5,
  lineHeight: 1.6,
  color: "#24344F",
  fontFamily: "inherit",
  outline: "none",
  background: "#fff",
};
const focusRing = (e) => (e.target.style.boxShadow = "inset 0 0 0 2px #2F80FF");
const blurRing = (e) => (e.target.style.boxShadow = "none");

export function InlineText({ value = "", onChange, rows = 3, placeholder, autoFocus = true }) {
  const ref = useRef(null);
  // Caret to the end on open (autofocus alone leaves it at the start).
  useEffect(() => {
    if (autoFocus && ref.current) {
      const end = ref.current.value.length;
      ref.current.setSelectionRange(end, end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <textarea
      ref={ref}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      style={{ ...INLINE_INPUT, resize: "vertical" }}
      onFocus={focusRing}
      onBlur={blurRing}
    />
  );
}

// Single-line inline editor (names, codes, phone numbers…): Enter commits
// via the wrapper's INPUT rule.
export function InlineInput({ value = "", onChange, placeholder, autoFocus = true, type = "text" }) {
  return (
    <input
      type={type}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...INLINE_INPUT, padding: "8px 12px" }}
      onFocus={focusRing}
      onBlur={blurRing}
    />
  );
}

// List editor: rows of single-line inputs. Local rows may hold empties while
// typing; only non-empty rows propagate upward, so empty rows are dropped on
// commit without a special commit step.
export function InlineList({ value = [], onChange, placeholder }) {
  const [rows, setRows] = useState(value.length ? value : [""]);
  const propagate = (next) => {
    setRows(next);
    onChange(next.filter((s) => s.trim() !== ""));
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((item, i) => (
        <InlineListRow
          key={i}
          value={item}
          autoFocus={i === 0}
          placeholder={placeholder}
          onChange={(v) => propagate(rows.map((x, j) => (j === i ? v : x)))}
          onRemove={() => propagate(rows.filter((_, j) => j !== i))}
        />
      ))}
      <button
        type="button"
        onClick={() => setRows([...rows, ""])}
        style={{ alignSelf: "flex-start", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#2F80FF", padding: "2px 0" }}
      >
        + Add
      </button>
    </div>
  );
}

function InlineListRow({ value, onChange, onRemove, placeholder, autoFocus }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", gap: 10 }}
    >
      <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: "50%", background: "#9FB6D8" }} />
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...INLINE_INPUT, flex: 1, padding: "8px 12px" }}
        onFocus={focusRing}
        onBlur={blurRing}
      />
      <button
        type="button"
        aria-label="Remove item"
        onClick={onRemove}
        style={{ flexShrink: 0, border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#A6B8D4", opacity: hover ? 1 : 0, transition: "opacity .12s, color .12s", padding: "2px 4px" }}
        onFocus={(e) => (e.currentTarget.style.opacity = 1)}
        onBlur={(e) => { if (!hover) e.currentTarget.style.opacity = 0; }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#C0392B")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#A6B8D4")}
      >
        ✕
      </button>
    </div>
  );
}

// Enum pill picker. PIN 3: re-clicking the currently selected value is a
// no-op — close the picker, fire NO onChange (so no PATCH, no editedAt).
export function InlineEnum({ value, onChange, options, colors, onDone }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((o) => {
        const c = colors[o.value] ?? { bg: "#EEF1F5", color: "#6E7E97" };
        const current = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            autoFocus={current}
            aria-pressed={current}
            onClick={() => {
              if (!current) onChange(o.value);
              onDone();
            }}
            style={{
              fontFamily: "inherit", textTransform: "uppercase", fontSize: 10.5, fontWeight: 700,
              letterSpacing: ".04em", padding: "4px 11px", borderRadius: 999, cursor: "pointer",
              background: c.bg, color: c.color,
              border: current ? `2px solid ${c.color}` : "2px solid transparent",
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #2F80FF")}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Draft/approved-editing status bar — shared across all editable report sections.
// Shows when report is draft OR when an approved report is being re-edited.
export function EditApproveBar({ tx, report, draftLabel }) {
  const isDraft = report?.status === "draft";
  // Show the editing bar whenever in edit mode — covers re-editing an approved
  // report AND older reports saved before draft-status existed (status unset).
  const isEditingNonDraft = !isDraft && tx.isEditing;
  if (!isDraft && !isEditingNonDraft) return null;
  if (isDraft) {
    return (
      <div className="flex items-center justify-between mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
        <span className="text-xs font-medium text-amber-800">
          {draftLabel ?? "Draft"} — review &amp; approve
        </span>
        <div className="flex items-center gap-3">
          <SaveIndicator state={tx.saveState} />
          <button
            onClick={tx.approve}
            className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
          >
            Approve
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between mb-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
      <span className="text-xs font-medium text-gray-700">Editing — changes save automatically</span>
      <div className="flex items-center gap-3">
        <SaveIndicator state={tx.saveState} />
        <button
          onClick={tx.approve}
          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-white hover:bg-primary/90"
        >
          Approve
        </button>
      </div>
    </div>
  );
}

export function EditText({ value = "", onChange, placeholder, rows = 2 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${BASE} resize-y`}
    />
  );
}

export function EditList({ value = [], onChange, placeholder }) {
  const items = value.length ? value : [""];
  const update = (i, v) =>
    onChange(items.map((x, j) => (j === i ? v : x)).filter((s, j) => s.trim() || j === i));
  const removeAt = (i) => onChange(items.filter((_, j) => j !== i).filter((s) => s.trim()));
  const add = () => onChange([...items.filter((s) => s.trim()), ""]);
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <span className="mt-2 text-muted-foreground text-sm select-none">•</span>
          <textarea
            rows={2}
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm resize-y"
          />
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="mt-2 text-muted-foreground hover:text-red-600 text-sm px-1"
            aria-label="Remove item"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs text-primary hover:text-primary/80">
        + Add item
      </button>
    </div>
  );
}

export function EditSelect({ value, onChange, options }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={BASE}
    >
      <option value="" disabled>Select…</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

const CONFIDENCE_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

const INPUT = "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm";

// One editable diagnosis candidate: code + name + confidence + criteriaMet list + rationale.
export function DiagnosisCandidateEditor({ value = {}, onChange, onRemove, onPromote }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50/50 p-3 space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500">Code</label>
          <input value={value.code ?? ""} onChange={(e) => set("code", e.target.value)}
            placeholder="e.g. F32.1" className={INPUT} />
        </div>
        <div className="flex-[2]">
          <label className="text-xs text-gray-500">Name</label>
          <input value={value.name ?? ""} onChange={(e) => set("name", e.target.value)}
            className={INPUT} />
        </div>
        <div className="w-32">
          <label className="text-xs text-gray-500">Confidence</label>
          <EditSelect value={value.confidence} onChange={(v) => set("confidence", v)} options={CONFIDENCE_OPTIONS} />
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label="Remove"
            className="self-end text-muted-foreground hover:text-red-600 text-sm px-1 pb-1.5">✕</button>
        )}
      </div>
      <div>
        <label className="text-xs text-gray-500">Criteria met</label>
        <EditList value={value.criteriaMet ?? []} onChange={(v) => set("criteriaMet", v)} placeholder="Add a met criterion" />
      </div>
      <div>
        <label className="text-xs text-gray-500">Rationale</label>
        <EditText value={value.rationale ?? ""} onChange={(v) => set("rationale", v)} rows={3} />
      </div>
      {onPromote && (
        <button type="button" onClick={onPromote}
          className="text-xs font-semibold text-primary hover:text-primary/80">
          Make primary
        </button>
      )}
    </div>
  );
}

// List of DiagnosisCandidateEditors with add/remove. `onPromote(i)` — when given,
// each candidate can be swapped into the primary slot.
export function DiagnosisCandidateList({ value = [], onChange, onPromote, addLabel = "+ Add diagnosis" }) {
  const update = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)));
  const remove = (i) => onChange(value.filter((_, j) => j !== i));
  const add = () => onChange([...value, { code: "", name: "", confidence: "moderate", criteriaMet: [], rationale: "" }]);
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <DiagnosisCandidateEditor
          key={i}
          value={c}
          onChange={(v) => update(i, v)}
          onRemove={() => remove(i)}
          onPromote={onPromote ? () => onPromote(i) : undefined}
        />
      ))}
      <button type="button" onClick={add} className="text-xs text-primary hover:text-primary/80">{addLabel}</button>
    </div>
  );
}

// EditRows: repeating structured objects (goals, differentials, measure interpretations).
// fields: [{ key, label, type: "text"|"select", options?, rows? }]
// Each row is a bordered card with labeled controls + remove; Add appends a blank row.
export function EditRows({ value = [], onChange, fields, addLabel = "+ Add", emptyRow }) {
  const blank = emptyRow ?? Object.fromEntries(fields.map((f) => [f.key, ""]));
  const set = (i, key, v) =>
    onChange(value.map((row, j) => (j === i ? { ...row, [key]: v } : row)));
  const remove = (i) => onChange(value.filter((_, j) => j !== i));
  const add = () => onChange([...value, { ...blank }]);

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="rounded-md border border-border bg-background p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-medium">#{i + 1}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-muted-foreground hover:text-destructive text-xs"
            >
              ✕
            </button>
          </div>
          {fields.map((f) => (
            <div key={f.key} className="space-y-0.5">
              <label className="text-xs text-muted-foreground">{f.label}</label>
              {f.type === "select" ? (
                <EditSelect
                  value={row[f.key]}
                  onChange={(v) => set(i, f.key, v)}
                  options={f.options}
                />
              ) : (
                <EditText
                  value={row[f.key] ?? ""}
                  onChange={(v) => set(i, f.key, v)}
                  placeholder={f.label}
                  rows={f.rows ?? 2}
                />
              )}
            </div>
          ))}
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs text-primary hover:text-primary/80">
        {addLabel}
      </button>
    </div>
  );
}
