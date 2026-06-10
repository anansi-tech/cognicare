import { vi, describe, it, expect } from "vitest";

// Prevent the Stripe constructor side-effect when billing.js is imported.
vi.mock("stripe", () => ({ default: class Stripe {} }));

import { isActiveStatus } from "./billing.js";

describe("isActiveStatus", () => {
  it.each(["trialing", "active", "past_due"])("%s → true", (status) => {
    expect(isActiveStatus(status)).toBe(true);
  });

  it.each(["canceled", "unpaid", "incomplete"])("%s → false", (status) => {
    expect(isActiveStatus(status)).toBe(false);
  });

  it("undefined → false", () => {
    expect(isActiveStatus(undefined)).toBe(false);
  });
});
