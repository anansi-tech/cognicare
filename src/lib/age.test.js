import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { ageFromDob, genderLabel } from "./age.js";

describe("ageFromDob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15)); // local June 15 — avoids UTC-to-local day shift
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("DOB exactly N years ago (birthday today) → N", () => {
    expect(ageFromDob("1994-06-15")).toBe(30);
  });

  it("birthday tomorrow (not yet) → N-1", () => {
    expect(ageFromDob("1994-06-16")).toBe(29);
  });

  it("birthday yesterday (already passed) → N", () => {
    expect(ageFromDob("1994-06-14")).toBe(30);
  });

  it("null → null", () => {
    expect(ageFromDob(null)).toBeNull();
  });

  it("undefined → null", () => {
    expect(ageFromDob(undefined)).toBeNull();
  });
});

describe("genderLabel", () => {
  it.each([
    ["female", "Female"],
    ["male", "Male"],
    ["non-binary", "Non-binary"],
    ["transgender", "Transgender"],
    ["other", "Other"],
    ["prefer-not-to-say", "Prefer not to say"],
  ])("%s → %s", (g, label) => {
    expect(genderLabel(g)).toBe(label);
  });

  it("null → —", () => {
    expect(genderLabel(null)).toBe("—");
  });

  it("undefined → —", () => {
    expect(genderLabel(undefined)).toBe("—");
  });

  it("unknown value → title-cased fallback", () => {
    expect(genderLabel("queer")).toBe("Queer");
  });
});
