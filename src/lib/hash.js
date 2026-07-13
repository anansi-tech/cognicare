import { createHmac } from "crypto";

// Content hashes for staleness tracking across the derivation chain
// (intake notes → assessment → diagnostic → treatment). Server-side ONLY —
// never hash in the browser.
//
// HMAC over the existing PHI key rather than raw SHA: the hashes contain no
// plaintext PHI, but they are still clinical metadata (equality reveals "the
// notes didn't change") and stay keyed. The `v1:` prefix versions the
// canonicalization — a future change bumps it so old stamps read as a
// different scheme instead of silently marking everything stale.
const KEY = process.env.PHI_ENCRYPTION_KEY;
const hmac = (s) => "v1:" + createHmac("sha256", KEY).update(s).digest("hex");

// Intake notes are a single string. Whitespace counts — no normalization.
export const notesHash = (s) => hmac(s ?? "");

// Payloads are JSON: canonicalize by sorting object keys at every depth so
// key order can never fake a change. Array order is meaningful and kept.
const canon = (v) =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
      : v;

export const payloadHash = (p) => hmac(JSON.stringify(canon(p ?? {})));
