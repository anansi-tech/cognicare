"use client";

import { useRef, useState } from "react";
import {
  RecordEditHeader, InlineEditScope, InlineField, InlineInput, InlineText, InlineEnum,
} from "@/components/ai/editable";
import { useAutosaveRecord } from "@/components/ai/useAutosaveRecord";
import {
  parseInitialAssessment, composeInitialAssessment, clientFormValue,
} from "./ClientForm";
import { ageFromDob, formatDob, genderLabel } from "@/lib/age";

// Inline per-field editor for an EXISTING client record — the edit-mode
// replacement for ClientForm (which remains the creation form). Same pins as
// the AI reports: every field edit merges into the full client body and saves
// through the existing PATCH /api/clients/[id] (the same whole-body shape
// ClientForm submitted), debounced; no per-field endpoints, no no-op PATCHes.

const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "transgender", label: "Transgender" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "completed", label: "Completed" },
  { value: "transferred", label: "Transferred" },
];
// Sky status-pill scale (matches the shared table pattern).
const STATUS_COLORS = {
  active:      { bg: "#E7F6EC", color: "#3B9E57" },
  inactive:    { bg: "#EEF1F5", color: "#6E7E97" },
  completed:   { bg: "#E7F6EC", color: "#3B9E57" },
  transferred: { bg: "#EEF1F5", color: "#6E7E97" },
};
const GENDER_COLORS = Object.fromEntries(GENDER_OPTIONS.map((o) => [o.value, { bg: "#EAF3FF", color: "#2F80FF" }]));

const INTAKE_SECTIONS = [
  ["presentingConcerns", "Presenting concerns"],
  ["relevantHistory", "Relevant history"],
  ["riskIndicators", "Risk indicators"],
  ["currentStressors", "Current stressors"],
];

const Para = ({ children, muted }) => (
  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: muted ? "#8298BC" : "#41557A", margin: 0, whiteSpace: "pre-wrap" }}>
    {children}
  </p>
);
const CARD = { background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.25)", padding: "6px 20px 20px" };
const H = ({ children }) => (
  <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, color: "#0B2B6B", margin: "18px 0 2px" }}>{children}</h3>
);

export default function InlineClientProfile({ client, onChanged, onDone }) {
  const [formData, setFormData] = useState(() => clientFormValue(client));
  const [intake, setIntake] = useState(() => parseInitialAssessment(client.initialAssessment));

  const stateRef = useRef({ formData, intake });
  stateRef.current = { formData, intake };

  // Shared autosave engine: whole body through the existing endpoint — the
  // same shape ClientForm sent — with the creation form's validation rules
  // applied before any save.
  const { touch, saveState, savedAt, problems } = useAutosaveRecord({
    seed: { ...clientFormValue(client), initialAssessment: client.initialAssessment ?? "" },
    getBody: () => {
      const { formData: fd, intake: ik } = stateRef.current;
      return { ...fd, initialAssessment: composeInitialAssessment(ik) };
    },
    validate: () => {
      const { formData: fd, intake: ik } = stateRef.current;
      const errs = [];
      if (!fd.name.trim()) errs.push("Name is required");
      const dob = new Date(fd.dateOfBirth);
      if (!fd.dateOfBirth || Number.isNaN(dob.getTime())) errs.push("Enter a valid date of birth");
      else if (dob > new Date()) errs.push("Date of birth must be in the past");
      if (!composeInitialAssessment(ik).trim()) errs.push("At least one intake section is required");
      return errs;
    },
    save: async (body) => {
      const res = await fetch(`/api/clients/${client._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
      if (!res.ok) return false;
      onChanged?.(await res.json());
      return true;
    },
  });

  const setField = (k, v) => { setFormData((f) => ({ ...f, [k]: v })); touch(); };
  const setContact = (k, v) => {
    setFormData((f) => ({ ...f, contactInfo: { ...f.contactInfo, [k]: v } }));
    touch();
  };
  const setEmergency = (k, v) => {
    setFormData((f) => ({
      ...f,
      contactInfo: { ...f.contactInfo, emergencyContact: { ...f.contactInfo.emergencyContact, [k]: v } },
    }));
    touch();
  };
  const setIntakeField = (k, v) => { setIntake((i) => ({ ...i, [k]: v })); touch(); };

  const emergency = formData.contactInfo.emergencyContact;
  const emergencySummary = [emergency.name, emergency.relationship, emergency.phone].filter(Boolean).join(", ");

  return (
    <div>
      <RecordEditHeader
        eyebrow="Client"
        title={`Edit ${formData.name || client.name}`}
        saveState={saveState}
        savedAt={savedAt}
        updatedAt={client.updatedAt}
        onDone={onDone}
        problems={problems}
      />

      <InlineEditScope>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={CARD}>
            <H>Profile</H>
            {/* Short fields sit in a responsive two-column grid; the intake
                card below stays single-column (paragraph content). */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", columnGap: 28 }}>
            <InlineField
              id="name"
              label="Full name"
              value={formData.name}
              onChange={(v) => setField("name", v)}
              read={<Para>{formData.name || "—"}</Para>}
              editor={<InlineInput value={formData.name} onChange={(v) => setField("name", v)} placeholder="Full name" />}
            />
            <InlineField
              id="dateOfBirth"
              label="Date of birth"
              value={formData.dateOfBirth}
              onChange={(v) => setField("dateOfBirth", v)}
              read={
                <Para>
                  {formData.dateOfBirth
                    ? `${formatDob(formData.dateOfBirth)} (${ageFromDob(formData.dateOfBirth) ?? "—"})`
                    : "—"}
                </Para>
              }
              editor={<InlineInput type="date" value={formData.dateOfBirth} onChange={(v) => setField("dateOfBirth", v)} />}
            />
            <InlineField
              id="gender"
              label="Gender"
              value={formData.gender}
              onChange={(v) => setField("gender", v)}
              bare
              read={<Para>{genderLabel(formData.gender)}</Para>}
              editor={({ commit }) => (
                <InlineEnum value={formData.gender} onChange={(v) => setField("gender", v)} options={GENDER_OPTIONS} colors={GENDER_COLORS} onDone={() => commit()} />
              )}
            />
            <InlineField
              id="pronouns"
              label="Pronouns"
              value={formData.pronouns}
              onChange={(v) => setField("pronouns", v)}
              read={<Para muted={!formData.pronouns}>{formData.pronouns || "Not set"}</Para>}
              editor={<InlineInput value={formData.pronouns} onChange={(v) => setField("pronouns", v)} placeholder="e.g. she/her" />}
            />
            <InlineField
              id="status"
              label="Status"
              value={formData.status}
              onChange={(v) => setField("status", v)}
              bare
              read={
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: (STATUS_COLORS[formData.status] ?? STATUS_COLORS.inactive).bg, color: (STATUS_COLORS[formData.status] ?? STATUS_COLORS.inactive).color, textTransform: "capitalize" }}>
                  {formData.status}
                </span>
              }
              editor={({ commit }) => (
                <InlineEnum value={formData.status} onChange={(v) => setField("status", v)} options={STATUS_OPTIONS} colors={STATUS_COLORS} onDone={() => commit()} />
              )}
            />
            <InlineField
              id="email"
              label="Email"
              value={formData.contactInfo.email}
              onChange={(v) => setContact("email", v)}
              read={<Para muted={!formData.contactInfo.email}>{formData.contactInfo.email || "Not set"}</Para>}
              editor={<InlineInput type="email" value={formData.contactInfo.email} onChange={(v) => setContact("email", v)} placeholder="name@example.com" />}
            />
            <InlineField
              id="phone"
              label="Phone"
              value={formData.contactInfo.phone}
              onChange={(v) => setContact("phone", v)}
              read={<Para muted={!formData.contactInfo.phone}>{formData.contactInfo.phone || "Not set"}</Para>}
              editor={<InlineInput type="tel" value={formData.contactInfo.phone} onChange={(v) => setContact("phone", v)} placeholder="Phone number" />}
            />
            <div style={{ gridColumn: "1 / -1" }}>
            <InlineField
              id="emergencyContact"
              label="Emergency contact"
              value={emergency}
              onChange={(v) => {
                // Cancel restores the whole pre-edit emergency-contact object.
                setFormData((f) => ({ ...f, contactInfo: { ...f.contactInfo, emergencyContact: v } }));
                touch();
              }}
              read={<Para muted={!emergencySummary}>{emergencySummary || "Not set"}</Para>}
              editor={
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                  <InlineInput value={emergency.name} onChange={(v) => setEmergency("name", v)} placeholder="Name" />
                  <InlineInput autoFocus={false} value={emergency.relationship} onChange={(v) => setEmergency("relationship", v)} placeholder="Relationship" />
                  <InlineInput autoFocus={false} type="tel" value={emergency.phone} onChange={(v) => setEmergency("phone", v)} placeholder="Phone" />
                </div>
              }
            />
            </div>
            </div>
          </div>

          <div style={CARD}>
            <H>Initial assessment</H>
            <p style={{ fontSize: 12, color: "#8298BC", margin: "2px 0 0" }}>
              Sections compose the intake note the AI assessment reads. Editing them surfaces the intake re-run offer.
            </p>
            {INTAKE_SECTIONS.map(([key, label]) => (
              <InlineField
                key={key}
                id={key}
                label={label}
                value={intake[key]}
                onChange={(v) => setIntakeField(key, v)}
                read={<Para muted={!intake[key]}>{intake[key] || "Nothing entered."}</Para>}
                editor={<InlineText value={intake[key]} onChange={(v) => setIntakeField(key, v)} rows={4} />}
              />
            ))}
          </div>
        </div>
      </InlineEditScope>
    </div>
  );
}
