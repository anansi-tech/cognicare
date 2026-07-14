// Shared controlled editing primitives for AI report bodies.
// All free-text fields use textarea (not input) — clinical content is long.

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

// Section-header action slot (Overview v2): the full draft/approved/editing
// control set in one always-visible place. Same functions the old in-body
// EditApproveBar + bottom "Edit …" links exposed — startEdit, approve,
// SaveIndicator — no new behavior. `extra` renders caller-owned buttons
// (e.g. the treatment revise icon) whose handlers stay with the caller.
export function SectionHeaderActions({ tx, report, editLabel = "Edit", extra = null }) {
  if (!report) return null;
  const isDraft = report.status === "draft";

  // Re-editing an approved (or pre-status) report: autosave state + Done.
  if (!isDraft && tx.isEditing) {
    return (
      <>
        <SaveIndicator state={tx.saveState} />
        <button type="button" onClick={tx.approve} style={{ ...SOLID_BTN, background: "#2F80FF", boxShadow: "0 10px 24px -12px rgba(47,128,255,.7)" }}>
          <CheckIcon />Done
        </button>
      </>
    );
  }

  // Draft: body is already editable (canEdit), so no pencil — review & approve.
  if (isDraft) {
    return (
      <>
        <span style={{ ...PILL, background: "#FBF2DA", color: "#A9821F" }}>Draft — review</span>
        <SaveIndicator state={tx.saveState} />
        {extra}
        <button type="button" onClick={tx.approve} title="Approve" style={{ ...SOLID_BTN, background: "#3B9E57", boxShadow: "0 10px 24px -12px rgba(59,158,87,.7)" }}>
          <CheckIcon />Approve
        </button>
      </>
    );
  }

  return (
    <>
      {report.status === "approved" && (
        <span style={{ ...PILL, background: "#E7F6EC", color: "#3B9E57" }}>Approved</span>
      )}
      {extra}
      <IconButton title={editLabel} onClick={tx.startEdit}>
        <PencilIcon />
      </IconButton>
    </>
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
