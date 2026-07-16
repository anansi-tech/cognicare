import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Standing rule: every API route that reads or writes client-linked data must
// enforce visibleClientIds/clientScope before loading context, calling models,
// or returning data. This walks src/app/api and asserts the guard import on
// any route touching clientId — cheap structural enforcement so a new or
// modified route can't silently skip the check. Unauthorized = 404.
//
// Exemptions must be justified here, not waved through:
const EXEMPT = new Set([
  // Client-facing, authorized by a single-use emailed token — there is no
  // clinician session to scope by. The token IS the authorization.
  "src/app/api/consent-forms/sign/route.js",
  // System cron (CRON_SECRET-authed); legitimately iterates every practice's
  // schedule to send reminders. No user context exists.
  "src/app/api/cron/appointment-reminders/route.js",
]);

const API_ROOT = path.join(process.cwd(), "src", "app", "api");

function walkRoutes(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkRoutes(full, out);
    else if (entry.name === "route.js") out.push(full);
  }
  return out;
}

describe("scope guard is universal (structural)", () => {
  const routes = walkRoutes(API_ROOT);

  it("finds API routes at all", () => {
    expect(routes.length).toBeGreaterThan(10);
  });

  for (const file of routes) {
    const rel = path.relative(process.cwd(), file);
    const src = fs.readFileSync(file, "utf8");
    const touchesClientData = /clientId/.test(src);
    if (!touchesClientData || EXEMPT.has(rel)) continue;

    it(`${rel} enforces client visibility`, () => {
      expect(
        /visibleClientIds|clientScope/.test(src),
        `${rel} touches clientId but neither imports visibleClientIds nor clientScope. ` +
          `Scope it (unauthorized = non-revealing 404) or add a JUSTIFIED exemption above.`
      ).toBe(true);
    });
  }
});
