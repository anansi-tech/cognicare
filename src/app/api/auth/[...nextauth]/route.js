// Auth.js v5 — the config lives in src/auth.js; this catch-all just exposes
// the v5 GET/POST handlers it produced. No authOptions export anymore.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
