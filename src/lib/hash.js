import { createHmac } from "crypto";

// Content hashes for staleness tracking across the derivation chain
// (intake notes → assessment → diagnostic → treatment). Server-side ONLY —
// never hash in the browser.
//
// HMAC over the existing PHI key rather than raw SHA: the hashes contain no
// plaintext PHI, but they are still clinical metadata (equality reveals "the
// notes didn't change") and stay keyed. The version prefix stamps the
// canonicalization scheme — a change bumps it so old stamps read as a
// different scheme (re-stamped by the backfill) instead of silently marking
// everything stale.
//
// v2: semantic-emptiness pruning. The structured editors don't round-trip
// byte-identically — clearing a field leaves "" where the agent omitted the
// key, lists come back as [] — so v1 read a revert as a change and the
// staleness prompt never cleared. Content-identical now hashes identical.
export const HASH_VERSION = "v2:";

const KEY = process.env.PHI_ENCRYPTION_KEY;
const hmac = (s) => HASH_VERSION + createHmac("sha256", KEY).update(s).digest("hex");

// Intake notes are a single string. Whitespace counts — no normalization.
export const notesHash = (s) => hmac(s ?? "");

// Payloads are JSON: canonicalize by sorting object keys at every depth so key
// order can never fake a change, and prune semantically empty values ("",
// null, undefined, [], {}) after recursing — "absent" and "emptied by the
// editor" are the same clinical content. Array order stays meaningful;
// whitespace-only strings are NOT empty.
const isEmpty = (v) =>
  v === "" ||
  v === null ||
  v === undefined ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length === 0);

const canon = (v) => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      const c = canon(v[k]);
      if (!isEmpty(c)) out[k] = c;
    }
    return out;
  }
  return v;
};

export const payloadHash = (p) => hmac(JSON.stringify(canon(p ?? {})));
