import { describe, it, expect } from "vitest";
import { isConsented } from "./consent.js";

describe("isConsented — the one consent definition", () => {
  const overridden = { consentOverride: { by: "u1", at: new Date() } };
  const plain = {};

  it("signed form on file → consented", () => {
    expect(isConsented({ forms: [{ status: "signed" }], client: plain })).toBe(true);
  });

  it("in-person override → consented, even with a stale pending form (the dashboard bug)", () => {
    expect(isConsented({ forms: [{ status: "pending" }], client: overridden })).toBe(true);
  });

  it("pending form only → not consented", () => {
    expect(isConsented({ forms: [{ status: "pending" }], client: plain })).toBe(false);
  });

  it("no forms, no override → not consented", () => {
    expect(isConsented({ forms: [], client: plain })).toBe(false);
    expect(isConsented({ client: plain })).toBe(false);
  });

  it("expired/revoked forms don't count; a signed one among them does", () => {
    expect(isConsented({ forms: [{ status: "expired" }, { status: "revoked" }], client: plain })).toBe(false);
    expect(isConsented({ forms: [{ status: "expired" }, { status: "signed" }], client: plain })).toBe(true);
  });

  it("malformed override (no .by) → not consented", () => {
    expect(isConsented({ forms: [], client: { consentOverride: {} } })).toBe(false);
    expect(isConsented({ forms: [], client: null })).toBe(false);
  });
});
