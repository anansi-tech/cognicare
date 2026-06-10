import { describe, it, expect } from "vitest";
import { scopeQuery } from "./practice.js";

describe("scopeQuery — the confidentiality rule", () => {
  it("owner → { practiceId } only, no counselorId", () => {
    const result = scopeQuery({ isOwner: true, practiceId: "p1", userId: "u1" });
    expect(result).toEqual({ practiceId: "p1" });
    expect(result).not.toHaveProperty("counselorId");
  });

  it("non-owner → { practiceId, counselorId: userId }", () => {
    const result = scopeQuery({ isOwner: false, practiceId: "p1", userId: "u1" });
    expect(result).toEqual({ practiceId: "p1", counselorId: "u1" });
  });

  it("different users get different scopes", () => {
    const a = scopeQuery({ isOwner: false, practiceId: "p1", userId: "u1" });
    const b = scopeQuery({ isOwner: false, practiceId: "p1", userId: "u2" });
    expect(a.counselorId).toBe("u1");
    expect(b.counselorId).toBe("u2");
  });
});
