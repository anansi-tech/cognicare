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

  it("carries the current scheme prefix", () => {
    expect(notesHash("x")).toMatch(/^v2:[0-9a-f]{64}$/);
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

  // The structured editors don't round-trip byte-identically: clearing a field
  // leaves "" where the agent omitted the key, lists come back as [], selects
  // as null. A revert through the editor must hash identical to the original.
  describe("editor-artifact equivalence (semantic emptiness)", () => {
    const generated = { primaryDiagnosis: { code: "F32.1", name: "MDD" }, differentials: [{ code: "F41.1" }] };

    it('"" equals absent key', () => {
      expect(payloadHash({ ...generated, rationale: "" })).toBe(payloadHash(generated));
    });

    it("[] equals missing list", () => {
      expect(payloadHash({ ...generated, ruleOut: [] })).toBe(payloadHash(generated));
    });

    it("null equals absent key", () => {
      expect(payloadHash({ ...generated, notes: null })).toBe(payloadHash(generated));
    });

    it("prunes recursively — objects emptied by pruning are themselves pruned", () => {
      expect(payloadHash({ ...generated, extra: { list: [], text: "" } })).toBe(payloadHash(generated));
      expect(payloadHash({ a: { b: { c: [] } } })).toBe(payloadHash({}));
    });

    it("full edit→revert cycle through editor artifacts clears", () => {
      const edited = { ...generated, primaryDiagnosis: { code: "F41.1", name: "GAD" } };
      const revertedWithArtifacts = {
        primaryDiagnosis: { code: "F32.1", name: "MDD", rationale: "" },
        differentials: [{ code: "F41.1" }],
        ruleOut: [],
      };
      expect(payloadHash(edited)).not.toBe(payloadHash(generated));
      expect(payloadHash(revertedWithArtifacts)).toBe(payloadHash(generated));
    });

    it("genuinely changed content still differs", () => {
      expect(payloadHash({ ...generated, rationale: "new reasoning" })).not.toBe(payloadHash(generated));
      expect(payloadHash({ ...generated, differentials: [] })).not.toBe(payloadHash(generated));
      expect(payloadHash({ ...generated, primaryDiagnosis: { ...generated.primaryDiagnosis, name: "MDD, recurrent" } }))
        .not.toBe(payloadHash(generated));
    });

    it("whitespace-only strings are NOT empty", () => {
      expect(payloadHash({ ...generated, rationale: " " })).not.toBe(payloadHash(generated));
    });
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
