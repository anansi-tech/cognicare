"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { toDateInputValue } from "@/lib/age";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftRestoredNotice, DraftSaveIndicator } from "@/components/ui/DraftRestoredNotice";
import { InlineEnum } from "@/components/ai/editable";

// CREATION form only (Sky document vocabulary): one atomic POST on Create,
// validation on submit, localStorage drafts — no autosave to the server.
// Editing an existing client lives in InlineClientProfile.

// Inverse of composeInitialAssessment — splits the stored text back into fields.
export function parseInitialAssessment(text = "") {
  const labelMap = {
    "Presenting Concerns": "presentingConcerns",
    "Relevant History": "relevantHistory",
    "Risk Indicators": "riskIndicators",
    "Current Stressors": "currentStressors",
  };
  const parts = text.split(/(Presenting Concerns|Relevant History|Risk Indicators|Current Stressors):\n/);
  const result = { presentingConcerns: "", relevantHistory: "", riskIndicators: "", currentStressors: "" };
  for (let i = 1; i < parts.length; i += 2) {
    const key = labelMap[parts[i]];
    if (key) result[key] = (parts[i + 1] ?? "").trim();
  }
  if (!result.presentingConcerns && text.trim()) result.presentingConcerns = text.trim();
  return result;
}

const EMPTY_FORM = {
  name: "",
  dateOfBirth: "",
  gender: "prefer-not-to-say",
  pronouns: "",
  contactInfo: {
    email: "",
    phone: "",
    emergencyContact: { name: "", relationship: "", phone: "" },
  },
  status: "active",
};

const EMPTY_INTAKE = {
  presentingConcerns: "",
  relevantHistory: "",
  riskIndicators: "",
  currentStressors: "",
};

// Compose the structured intake sections into the single initialAssessment
// string the agents consume. Pure — shared with the inline profile editor.
export function composeInitialAssessment(intake) {
  const sections = [
    ["Presenting Concerns", intake.presentingConcerns],
    ["Relevant History", intake.relevantHistory],
    ["Risk Indicators", intake.riskIndicators],
    ["Current Stressors", intake.currentStressors],
  ];
  return sections
    .filter(([, v]) => v && v.trim())
    .map(([label, v]) => `${label}:\n${v.trim()}`)
    .join("\n\n");
}

export function clientFormValue(client) {
  if (!client) return EMPTY_FORM;
  return {
    name: client.name || "",
    dateOfBirth: toDateInputValue(client.dateOfBirth),
    gender: client.gender || "prefer-not-to-say",
    pronouns: client.pronouns || "",
    contactInfo: {
      email: client.contactInfo?.email || "",
      phone: client.contactInfo?.phone || "",
      emergencyContact: {
        name: client.contactInfo?.emergencyContact?.name || "",
        relationship: client.contactInfo?.emergencyContact?.relationship || "",
        phone: client.contactInfo?.emergencyContact?.phone || "",
      },
    },
    status: client.status || "active",
  };
}

const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "transgender", label: "Transgender" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];
const GENDER_COLORS = Object.fromEntries(GENDER_OPTIONS.map((o) => [o.value, { bg: "#EAF3FF", color: "#2F80FF" }]));

// Sky document vocabulary (matches InlineSessionEditor / Overview sections)
const CARD = { background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.25)", padding: "6px 20px 20px" };
const H = ({ children }) => (
  <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, color: "#0B2B6B", margin: "18px 0 2px" }}>{children}</h3>
);
const LABEL = { display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#7C93B8", margin: "16px 0 7px" };
const OPTIONAL = <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#A6B8D4" }}> (optional)</span>;
const REQUIRED = <span style={{ color: "#C0392B" }}> *</span>;
const fieldStyle = (invalid) => ({
  width: "100%", border: `1px solid ${invalid ? "#E4A9A2" : "#D9E5F4"}`, borderRadius: 10,
  padding: "9px 12px", fontSize: 13.5, lineHeight: 1.6, color: "#24344F", fontFamily: "inherit",
  outline: "none", background: "#fff", boxSizing: "border-box",
});
const focusRing = (e) => (e.target.style.boxShadow = "inset 0 0 0 2px #2F80FF");
const blurRing = (e) => (e.target.style.boxShadow = "none");
const Err = ({ children }) =>
  children ? <p style={{ fontSize: 12.5, color: "#C0392B", margin: "6px 0 0" }}>{children}</p> : null;
const HINT = { fontSize: 12, color: "#8298BC", margin: "2px 0 0" };

export default function ClientForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  // Light-structured initial assessment (Round 16). On submit these get
  // concatenated under headers into the single `initialAssessment` string
  // that the agents consume.
  const [intake, setIntake] = useState(EMPTY_INTAKE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const draftValue = useMemo(() => ({ formData, intake }), [formData, intake]);
  const applyDraft = useCallback((updater) => {
    const next = typeof updater === "function" ? updater({ formData: {}, intake: {} }) : updater;
    if (next.formData) setFormData((prev) => ({ ...prev, ...next.formData }));
    if (next.intake) setIntake((prev) => ({ ...prev, ...next.intake }));
  }, []);
  const { draftRestored, dismissRestored, clearDraft, saveState } = useFormDraft(
    "client-draft-new",
    draftValue,
    applyDraft,
    true,
    {}
  );

  const clearError = (field) => {
    if (validationErrors[field]) {
      setValidationErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    clearError(name.split(".")[0]);

    if (name.includes(".")) {
      // Handle nested properties (e.g., contactInfo.email)
      const parts = name.split(".");

      if (parts.length === 2) {
        // Handle contactInfo.email, contactInfo.phone
        const [parent, child] = parts;
        setFormData((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        }));
      } else if (parts.length === 3) {
        // Handle contactInfo.emergencyContact.name
        const [parent, middle, child] = parts;
        setFormData((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [middle]: {
              ...(prev[parent]?.[middle] || { name: "", relationship: "", phone: "" }),
              [child]: value,
            },
          },
        }));
      }
    } else {
      // Handle top-level properties
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    } else {
      const dob = new Date(formData.dateOfBirth);
      if (Number.isNaN(dob.getTime())) {
        errors.dateOfBirth = "Enter a valid date";
      } else if (dob > new Date()) {
        errors.dateOfBirth = "Date of birth must be in the past";
      }
    }
    if (!formData.gender) errors.gender = "Gender is required";
    if (!composeInitialAssessment(intake).trim())
      errors.initialAssessment = "Fill at least one section of the initial assessment.";

    setValidationErrors(errors);
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate form before submission
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      // Save client data — compose the structured intake into the single
      // initialAssessment string the agents consume.
      const payload = { ...formData, initialAssessment: composeInitialAssessment(intake) };
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.reason === "freeLimit") {
          setError(
            "You've reached your free trial client limit. Please upgrade to add more clients."
          );
          setLoading(false);
          return;
        } else if (errorData.reason === "paidLimit") {
          setError("You've reached your client limit. Please contact support to add more clients.");
          setLoading(false);
          return;
        } else if (errorData.reason === "subscriptionExpired") {
          setError("Your subscription has expired. Please renew your subscription to add clients.");
          setLoading(false);
          return;
        }
        setError("Failed to create client");
        setLoading(false);
        return;
      }

      const savedClient = await response.json();

      clearDraft();

      if (onSuccess) {
        onSuccess(savedClient);
      }
    } catch (error) {
      console.error("Error saving client:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const intakeSection = (key, label, rows, placeholder) => (
    <div>
      <label style={LABEL}>{label}</label>
      <textarea
        value={intake[key]}
        onChange={(e) => {
          clearError("initialAssessment");
          setIntake((s) => ({ ...s, [key]: e.target.value }));
        }}
        rows={rows}
        style={{ ...fieldStyle(false), resize: "vertical" }}
        onFocus={focusRing}
        onBlur={blurRing}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {draftRestored && (
        <DraftRestoredNotice
          onDismiss={dismissRestored}
          onDiscard={() => {
            clearDraft({ formData: EMPTY_FORM, intake: EMPTY_INTAKE });
            setFormData(EMPTY_FORM);
            setIntake(EMPTY_INTAKE);
          }}
        />
      )}
      {error && (
        <div role="alert" style={{ background: "#FDECEC", border: "1px solid #F5C6C0", borderRadius: 12, padding: "10px 14px" }}>
          <p style={{ fontSize: 13, color: "#C0392B", margin: 0 }}>{error}</p>
          {error.includes("free trial client limit") && (
            <div style={{ marginTop: 10 }}>
              <Link
                href="/subscription"
                style={{ display: "inline-block", background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 15px", borderRadius: 10, textDecoration: "none" }}
              >
                Upgrade Plan
              </Link>
            </div>
          )}
        </div>
      )}

      <div style={CARD}>
        <H>Identity</H>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", columnGap: 28 }}>
          <div>
            <label style={LABEL}>Name{REQUIRED}</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={fieldStyle(!!validationErrors.name)}
              onFocus={focusRing}
              onBlur={blurRing}
              placeholder="Full name"
            />
            <Err>{validationErrors.name}</Err>
          </div>
          <div>
            <label style={LABEL}>Date of birth{REQUIRED}</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={handleChange}
              style={fieldStyle(!!validationErrors.dateOfBirth)}
              onFocus={focusRing}
              onBlur={blurRing}
            />
            <Err>{validationErrors.dateOfBirth}</Err>
          </div>
        </div>
        <label style={LABEL}>Gender{REQUIRED}</label>
        <InlineEnum
          value={formData.gender}
          onChange={(v) => {
            clearError("gender");
            setFormData((prev) => ({ ...prev, gender: v }));
          }}
          options={GENDER_OPTIONS}
          colors={GENDER_COLORS}
        />
        <Err>{validationErrors.gender}</Err>
        <div style={{ maxWidth: 340 }}>
          <label style={LABEL}>Pronouns{OPTIONAL}</label>
          <input
            type="text"
            name="pronouns"
            value={formData.pronouns}
            onChange={handleChange}
            placeholder="e.g. she/her, he/him, they/them"
            style={fieldStyle(false)}
            onFocus={focusRing}
            onBlur={blurRing}
          />
        </div>
      </div>

      <div style={CARD}>
        <H>Contact</H>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", columnGap: 28 }}>
          <div>
            <label style={LABEL}>Email</label>
            <input
              type="email"
              name="contactInfo.email"
              value={formData.contactInfo.email}
              onChange={handleChange}
              style={fieldStyle(false)}
              onFocus={focusRing}
              onBlur={blurRing}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label style={LABEL}>Phone</label>
            <input
              type="tel"
              name="contactInfo.phone"
              value={formData.contactInfo.phone}
              onChange={handleChange}
              style={fieldStyle(false)}
              onFocus={focusRing}
              onBlur={blurRing}
              placeholder="Phone number"
            />
          </div>
        </div>
      </div>

      <div style={CARD}>
        <H>Emergency contact</H>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", columnGap: 28 }}>
          <div>
            <label style={LABEL}>Name</label>
            <input
              type="text"
              name="contactInfo.emergencyContact.name"
              value={formData.contactInfo.emergencyContact.name}
              onChange={handleChange}
              style={fieldStyle(false)}
              onFocus={focusRing}
              onBlur={blurRing}
            />
          </div>
          <div>
            <label style={LABEL}>Relationship</label>
            <input
              type="text"
              name="contactInfo.emergencyContact.relationship"
              value={formData.contactInfo.emergencyContact.relationship}
              onChange={handleChange}
              style={fieldStyle(false)}
              onFocus={focusRing}
              onBlur={blurRing}
            />
          </div>
          <div>
            <label style={LABEL}>Phone</label>
            <input
              type="tel"
              name="contactInfo.emergencyContact.phone"
              value={formData.contactInfo.emergencyContact.phone}
              onChange={handleChange}
              style={fieldStyle(false)}
              onFocus={focusRing}
              onBlur={blurRing}
            />
          </div>
        </div>
      </div>

      {/* Initial Clinical Assessment — light-structured (Round 16) */}
      <div style={CARD}>
        <H>Intake notes{REQUIRED}</H>
        <p style={HINT}>
          A thorough note here improves the AI&apos;s assessment, diagnosis, and treatment
          suggestions — write naturally; all sections are optional but more detail helps. At
          least one section must be filled.
        </p>
        {intakeSection("presentingConcerns", "Presenting concerns", 6,
          "What brings them in — current symptoms, the precipitating event, what they're hoping to address.")}
        {intakeSection("relevantHistory", "Relevant history", 4,
          "Mental health / treatment / medical history as known — prior diagnoses, medications, prior therapy.")}
        {intakeSection("riskIndicators", "Risk indicators", 4,
          "Suicidal/homicidal ideation, safety concerns — or 'none noted'.")}
        {intakeSection("currentStressors", "Current stressors / context", 4,
          "Situational factors — relationships, work, finances, recent changes, supports.")}
        <Err>{validationErrors.initialAssessment}</Err>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
        <DraftSaveIndicator state={saveState} />
        <button
          type="button"
          onClick={() => { clearDraft(); onCancel?.(); }}
          disabled={loading}
          style={{ border: "1px solid #DCE6F3", cursor: "pointer", fontFamily: "inherit", background: "#fff", color: "#55698F", fontWeight: 700, fontSize: 13, padding: "10px 18px", borderRadius: 10 }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{ border: "none", cursor: loading ? "default" : "pointer", fontFamily: "inherit", background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "11px 24px", borderRadius: 10, boxShadow: "0 12px 28px -12px rgba(47,128,255,.8)", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Creating…" : "Create client"}
        </button>
      </div>
    </form>
  );
}
