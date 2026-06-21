// Shared controlled editing primitives for AI report bodies.
// All free-text fields use textarea (not input) — clinical content is long.

const BASE = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

export function SaveIndicator({ state }) {
  if (state === "saving") return <span className="text-xs text-muted-foreground">Saving…</span>;
  if (state === "saved") return <span className="text-xs text-muted-foreground">Saved</span>;
  return null;
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
