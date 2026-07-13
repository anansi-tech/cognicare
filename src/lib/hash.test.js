import { describe, it, expect } from "vitest";
import { notesHash, payloadHash } from "./hash.js";
import { reconciliationStamp } from "./ai/upstream.js";

describe("notesHash", () => {
  it("is deterministic for identical input", () => {
    expect(notesHash("Presenting Concerns:\nLow mood")).toBe(notesHash("Presenting Concerns:\nLow mood"));
  });

  it("changes on any edit and matches again on revert", () => {
    const original = notesHash("Client reports low mood.");
    const edited = notesHash("Client reports severe low mood.");
    expect(edited).not.toBe(original);
    expect(notesHash("Client reports low mood.")).toBe(original); // revert clears
  });

  it("counts whitespace — no normalization", () => {
    expect(notesHash("low mood")).not.toBe(notesHash("low mood "));
  });

  it("treats null/undefined as empty notes", () => {
    expect(notesHash(undefined)).toBe(notesHash(""));
    expect(notesHash(null)).toBe(notesHash(""));
  });

  it("carries the v1: scheme prefix", () => {
    expect(notesHash("x")).toMatch(/^v1:[0-9a-f]{64}$/);
  });
});

describe("payloadHash", () => {
  const payload = { riskLevel: "moderate", concerns: ["sleep", "avoidance"], detail: { a: 1, b: 2 } };

  it("is stable under object key reordering at any depth", () => {
    const reordered = { detail: { b: 2, a: 1 }, concerns: ["sleep", "avoidance"], riskLevel: "moderate" };
    expect(payloadHash(reordered)).toBe(payloadHash(payload));
  });

  it("changes on a value edit and matches again on revert", () => {
    const original = payloadHash(payload);
    expect(payloadHash({ ...payload, riskLevel: "high" })).not.toBe(original);
    expect(payloadHash({ ...payload, riskLevel: "moderate" })).toBe(original);
  });

  it("keeps array order meaningful", () => {
    expect(payloadHash({ concerns: ["a", "b"] })).not.toBe(payloadHash({ concerns: ["b", "a"] }));
  });

  it("treats null/undefined as empty payload", () => {
    expect(payloadHash(undefined)).toBe(payloadHash({}));
    expect(payloadHash(null)).toBe(payloadHash({}));
  });

  it("differs from notesHash on equivalent-looking input", () => {
    expect(payloadHash({})).not.toBe(notesHash(""));
  });
});

describe("reconciliationStamp — human edit refreshes tracked upstream hashes", () => {
  const client = { initialAssessment: "Presenting Concerns:\nLow mood" };
  const assessment = { payload: { concerns: ["sleep"] } };
  const diagnostic = { payload: { primaryDiagnosis: { code: "F32.1" } } };

  it("assessment edit reconciles against current intake notes", () => {
    expect(reconciliationStamp("assessment", { client })).toEqual({
      sourceNotesHash: notesHash(client.initialAssessment),
    });
  });

  it("diagnostic edit reconciles against the current assessment payload", () => {
    expect(reconciliationStamp("diagnostic", { assessment })).toEqual({
      sourceAssessmentHash: payloadHash(assessment.payload),
    });
  });

  it("treatment edit reconciles against assessment AND diagnostic", () => {
    expect(reconciliationStamp("treatment", { assessment, diagnostic })).toEqual({
      sourceAssessmentHash: payloadHash(assessment.payload),
      sourceDiagnosticHash: payloadHash(diagnostic.payload),
    });
  });

  it("missing upstreams refresh nothing rather than stamping garbage", () => {
    expect(reconciliationStamp("diagnostic", {})).toEqual({});
    expect(reconciliationStamp("treatment", { diagnostic })).toEqual({
      sourceDiagnosticHash: payloadHash(diagnostic.payload),
    });
  });

  it("untracked agent types are untouched", () => {
    expect(reconciliationStamp("progress", { client, assessment, diagnostic })).toEqual({});
    expect(reconciliationStamp("documentation", { client })).toEqual({});
  });
});
