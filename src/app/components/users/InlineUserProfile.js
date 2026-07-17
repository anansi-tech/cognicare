"use client";

import { useRef, useState } from "react";
import {
  SaveDot, InlineEditScope, InlineField, InlineInput,
} from "@/components/ai/editable";
import { useAutosaveRecord } from "@/components/ai/useAutosaveRecord";
import { validatePassword } from "@/lib/password";

// Inline per-field editor for the signed-in user's own record — replaces
// UserForm on /profile (self-edit only since Round 10; signup remains a
// form). Field edits autosave the same body shape UserForm PATCHed through
// the existing /api/users/[id].
//
// Password is deliberately NOT autosaved: changing a credential is an
// explicit action — its own fields, its own button, the same validatePassword
// mirror (server stays the authority).

const Para = ({ children, muted }) => (
  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: muted ? "#8298BC" : "#41557A", margin: 0 }}>
    {children}
  </p>
);

export default function InlineUserProfile({ user, onChanged }) {
  const [form, setForm] = useState(() => ({
    name: user.name || "",
    email: user.email || "",
    licenseNumber: user.licenseNumber || "",
    specialization: user.specialization || "",
  }));
  const formRef = useRef(form);
  formRef.current = form;
  const [serverError, setServerError] = useState(null);

  const { touch, saveState, savedAt, problems } = useAutosaveRecord({
    seed: { name: user.name || "", email: user.email || "", licenseNumber: user.licenseNumber || "", specialization: user.specialization || "" },
    getBody: () => ({ ...formRef.current }),
    validate: () => {
      const f = formRef.current;
      const errs = [];
      if (!f.name.trim()) errs.push("Name is required");
      if (!f.email.trim() || !f.email.includes("@")) errs.push("Enter a valid email");
      return errs;
    },
    save: async (body) => {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
      if (!res.ok) {
        // Surface server-side rejections (e.g. "Email already in use").
        setServerError((await res.json().catch(() => null))?.message ?? "Couldn't save");
        return false;
      }
      setServerError(null);
      onChanged?.(await res.json());
      return true;
    },
  });

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); touch(); };

  // --- Deliberate password change (never autosaved) -------------------------
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState(null);
  const [pwState, setPwState] = useState("idle"); // idle | saving | saved
  const changePassword = async () => {
    setPwError(null);
    if (password !== confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    // Mirrors the server rule for inline UX; the PATCH route is the authority.
    const passwordError = validatePassword(password);
    if (passwordError) {
      setPwError(passwordError);
      return;
    }
    setPwState("saving");
    const res = await fetch(`/api/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setPassword("");
      setConfirm("");
      setPwState("saved");
    } else {
      setPwState("idle");
      setPwError((await res.json().catch(() => null))?.message ?? "Couldn't change password");
    }
  };

  const allProblems = [...problems, ...(serverError ? [serverError] : [])];
  const pwInput = {
    width: "100%", border: "1px solid #D9E5F4", borderRadius: 10, padding: "9px 12px",
    fontSize: 13.5, color: "#24344F", fontFamily: "inherit", outline: "none", background: "#fff",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <SaveDot state={saveState} savedAt={savedAt} updatedAt={user.updatedAt} />
      </div>
      {allProblems.length > 0 && (
        <div style={{ background: "#FDECEC", border: "1px solid #F5C6C0", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
          {allProblems.map((p) => (
            <p key={p} style={{ fontSize: 12.5, color: "#C0392B", margin: 0 }}>{p}</p>
          ))}
        </div>
      )}

      <InlineEditScope>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", columnGap: 28 }}>
          <InlineField
            id="name"
            label="Name"
            value={form.name}
            onChange={(v) => set("name", v)}
            read={<Para>{form.name || "—"}</Para>}
            editor={<InlineInput value={form.name} onChange={(v) => set("name", v)} placeholder="Full name" />}
          />
          <InlineField
            id="email"
            label="Email"
            value={form.email}
            onChange={(v) => set("email", v)}
            read={<Para>{form.email || "—"}</Para>}
            editor={<InlineInput type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@practice.com" />}
          />
          <InlineField
            id="licenseNumber"
            label="License number"
            value={form.licenseNumber}
            onChange={(v) => set("licenseNumber", v)}
            read={<Para muted={!form.licenseNumber}>{form.licenseNumber || "Not set"}</Para>}
            editor={<InlineInput value={form.licenseNumber} onChange={(v) => set("licenseNumber", v)} placeholder="License #" />}
          />
          <InlineField
            id="specialization"
            label="Specialization"
            value={form.specialization}
            onChange={(v) => set("specialization", v)}
            read={<Para muted={!form.specialization}>{form.specialization || "Not set"}</Para>}
            editor={<InlineInput value={form.specialization} onChange={(v) => set("specialization", v)} placeholder="e.g. Trauma" />}
          />
        </div>
      </InlineEditScope>

      {/* Deliberate credential change — explicit action, never autosave. */}
      <div style={{ marginTop: 26, borderTop: "1px solid #EEF3FA", paddingTop: 18 }}>
        <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 15, color: "#0B2B6B", margin: "0 0 4px" }}>Change password</h3>
        <p style={{ fontSize: 12, color: "#8298BC", margin: "0 0 12px" }}>At least 12 characters — a longer passphrase beats symbols.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, maxWidth: 560 }}>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPwState("idle"); }}
            placeholder="New password"
            style={pwInput}
          />
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setPwState("idle"); }}
            placeholder="Confirm new password"
            style={pwInput}
          />
        </div>
        {pwError && <p style={{ fontSize: 12.5, color: "#C0392B", margin: "10px 0 0" }}>{pwError}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <button
            type="button"
            onClick={changePassword}
            disabled={!password || !confirm || pwState === "saving"}
            style={{ border: "none", cursor: !password || !confirm ? "not-allowed" : "pointer", fontFamily: "inherit", background: !password || !confirm ? "#BCD2F0" : "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 16px", borderRadius: 10 }}
          >
            {pwState === "saving" ? "Changing…" : "Change password"}
          </button>
          {pwState === "saved" && <span style={{ fontSize: 12.5, fontWeight: 600, color: "#3B9E57" }}>Password changed</span>}
        </div>
      </div>
    </div>
  );
}
