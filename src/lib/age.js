// Age helpers — clients now store dateOfBirth, not age (Round 16). Compute
// the current age on demand instead of carrying a stale stored number.

export function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 ? a : null;
}

// Returns a YYYY-MM-DD string for a Date or ISO string — handy for date inputs.
export function toDateInputValue(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

// Friendly display labels for the expanded gender enum (Round 16). Avoids
// the ugly title-case fallback for compound values like "prefer-not-to-say".
const GENDER_LABELS = {
  female: "Female",
  male: "Male",
  "non-binary": "Non-binary",
  transgender: "Transgender",
  other: "Other",
  "prefer-not-to-say": "Prefer not to say",
};

export function genderLabel(g) {
  if (!g) return "—";
  return GENDER_LABELS[g] || g.charAt(0).toUpperCase() + g.slice(1);
}
