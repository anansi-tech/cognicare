"use client";

// Shown when a form rehydrates from a local draft, so the clinician knows why
// there is already text in the fields.
export function DraftRestoredNotice({ onDismiss, onDiscard }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#EAF3FF", border: "1px solid #CBE0F8", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
      <p style={{ fontSize: 13, color: "#2C3E5E", margin: 0 }}>
        <strong style={{ fontWeight: 600 }}>Draft restored.</strong> We recovered what you had typed.
      </p>
      <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
        {onDiscard && (
          <button type="button" onClick={onDiscard}
            style={{ fontSize: 12.5, fontWeight: 600, color: "#C0392B", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Discard draft
          </button>
        )}
        <button type="button" onClick={onDismiss} aria-label="Dismiss"
          style={{ fontSize: 12.5, fontWeight: 600, color: "#2F80FF", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
