import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { validatePassword } from "./password.js";

describe("validatePassword — length + blocklist, no composition theater", () => {
  it("rejects 11 characters", () => {
    expect(validatePassword("elevenchars")).toMatch(/at least 12/);
  });

  it("accepts 12 characters", () => {
    expect(validatePassword("twelve-chars")).toBeNull();
  });

  it("rejects over 128 characters", () => {
    expect(validatePassword("x".repeat(129))).toMatch(/at most 128/);
  });

  it("accepts exactly 128 characters", () => {
    expect(validatePassword("x".repeat(128))).toBeNull();
  });

  it("rejects common passwords, case-insensitively", () => {
    expect(validatePassword("password1234")).toMatch(/too common/);
    expect(validatePassword("PASSWORD1234")).toMatch(/too common/);
    expect(validatePassword("administrator")).toMatch(/too common/);
  });

  it("does not require uppercase/symbols — length is the rule", () => {
    expect(validatePassword("correct horse battery staple")).toBeNull();
    expect(validatePassword("alllowercaseandlong")).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(validatePassword(undefined)).toMatch(/at least 12/);
    expect(validatePassword(null)).toMatch(/at least 12/);
  });
});

// Both password write paths must enforce the rule server-side — the forms
// only mirror it. Structural check, same pattern as the scope-guard test.
describe("both password write paths enforce the policy", () => {
  const routes = [
    "src/app/api/auth/register/route.js",
    "src/app/api/users/[id]/route.js",
  ];
  for (const rel of routes) {
    it(`${rel} validates the password`, () => {
      const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
      expect(src).toMatch(/validatePassword/);
      expect(src).toMatch(/@\/lib\/password/);
    });
  }
});
