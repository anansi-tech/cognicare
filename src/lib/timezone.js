// Practice-level timezone utilities. Timezone is a property of the practice —
// "today" and displayed times use the practice's IANA zone, not the server's.
// Single source of truth; multi-practice just passes each practice's tz string.

// UTC start/end instants for "today" (or any base date) in the given IANA tz.
// Used for Mongo range queries so "today" means the practice's local day.
export function dayRangeInTz(tz, base = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base); // "2026-06-24"
  const start = zonedMidnightToUtc(ymd, tz);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

// "YYYY-MM-DD" local-midnight in tz → the equivalent UTC Date.
// Offset-correction handles DST correctly (asks the offset at that moment).
function zonedMidnightToUtc(ymd, tz) {
  const utcMidnight = new Date(`${ymd}T00:00:00Z`);
  const asInTz = new Date(utcMidnight.toLocaleString("en-US", { timeZone: tz }));
  const offsetMs = utcMidnight.getTime() - asInTz.getTime();
  return new Date(utcMidnight.getTime() + offsetMs);
}

// Format a date in the practice timezone (single call site for user-facing strings).
export function fmtInTz(date, tz, opts) {
  return new Date(date).toLocaleString("en-US", { timeZone: tz, ...opts });
}
