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
    expect(reconciliationStamp("report", { client, assessment, diagnostic })).toEqual({});
  });
});

describe("session edge — progress/documentation vs session notes", () => {
  const session = { notes: "Client discussed boundary setback at work." };
  const generatedStamp = notesHash(session.notes);

  it("unchanged notes: current hash matches the stamp", () => {
    expect(notesHash("Client discussed boundary setback at work.")).toBe(generatedStamp);
  });

  it("changed notes diverge; revert restores the stamp", () => {
    const edited = notesHash("Client discussed boundary setback at work. Added detail.");
    expect(edited).not.toBe(generatedStamp);
    expect(notesHash("Client discussed boundary setback at work.")).toBe(generatedStamp); // revert clears
  });

  it("editing the report reconciles against the session's CURRENT notes", () => {
    const editedSession = { notes: "Notes rewritten after the fact." };
    expect(reconciliationStamp("progress", { session: editedSession })).toEqual({
      sourceNotesHash: notesHash(editedSession.notes),
    });
    expect(reconciliationStamp("documentation", { session: editedSession })).toEqual({
      sourceNotesHash: notesHash(editedSession.notes),
    });
  });

  it("without the session, progress/documentation refresh nothing", () => {
    expect(reconciliationStamp("progress", {})).toEqual({});
    expect(reconciliationStamp("documentation", {})).toEqual({});
  });

  it("session notes and intake notes never cross-match by construction", () => {
    // Same string → same hash; the edges stay separate because each report
    // compares against ITS upstream, not because the hashes differ.
    expect(reconciliationStamp("progress", { session })).toEqual(
      reconciliationStamp("assessment", { client: { initialAssessment: session.notes } })
    );
  });

  // Mirrors the note route's PATCH guard exactly: canonical-hash change
  // detection, reconciliation only on a real change.
  describe("SOAP edit reconciliation (note route guard)", () => {
    const patchSoap = (note, soap, parentSession) => {
      const next = { ...note.payload, soap };
      if (payloadHash(next) === payloadHash(note.payload)) return note;
      return { ...note, payload: next, ...reconciliationStamp("documentation", { session: parentSession }) };
    };
    const isNudgeActive = (note, currentSession) =>
      note.sourceNotesHash !== notesHash(currentSession.notes);

    const generatedNotes = "Client discussed boundaries.";
    const soapV1 = { subjective: "Reports progress.", objective: "Engaged.", assessment: "Improving.", plan: "Continue." };
    const freshNote = () => ({
      payload: { soap: soapV1 },
      sourceNotesHash: notesHash(generatedNotes),
    });

    it("SOAP edit clears an active notes-nudge", () => {
      const editedSession = { notes: generatedNotes + " Later addendum." };
      let note = freshNote();
      expect(isNudgeActive(note, editedSession)).toBe(true); // notes diverged → nudge
      note = patchSoap(note, { ...soapV1, plan: "Taper to biweekly." }, editedSession);
      expect(isNudgeActive(note, editedSession)).toBe(false); // edit reconciled it
    });

    it("SOAP save-without-change refreshes nothing", () => {
      const editedSession = { notes: generatedNotes + " Later addendum." };
      let note = freshNote();
      note = patchSoap(note, { ...soapV1 }, editedSession); // byte-different object, same content
      expect(note.sourceNotesHash).toBe(notesHash(generatedNotes)); // stamp untouched
      expect(isNudgeActive(note, editedSession)).toBe(true); // nudge stays
    });

    it("notes edited after a SOAP reconcile re-trigger the nudge", () => {
      const sessionV2 = { notes: generatedNotes + " Later addendum." };
      let note = freshNote();
      note = patchSoap(note, { ...soapV1, plan: "Taper." }, sessionV2); // reconciled vs V2
      expect(isNudgeActive(note, sessionV2)).toBe(false);
      const sessionV3 = { notes: sessionV2.notes + " Another change." };
      expect(isNudgeActive(note, sessionV3)).toBe(true); // fresh divergence re-triggers
    });

    it("SOAP edit reconciles the PAIR — nudge gone with a progress report present; next notes edit re-triggers", () => {
      // The UI nudge ORs the pair; the route reconciles both on a real edit.
      const sessionV2 = { notes: generatedNotes + " Later addendum." };
      let note = freshNote();
      let progressReport = { sourceNotesHash: notesHash(generatedNotes) };
      const pairNudge = (s) => isNudgeActive(note, s) || isNudgeActive(progressReport, s);

      expect(pairNudge(sessionV2)).toBe(true); // notes diverged → nudge
      note = patchSoap(note, { ...soapV1, plan: "Taper." }, sessionV2);
      progressReport = { ...progressReport, ...reconciliationStamp("progress", { session: sessionV2 }) };
      expect(isNudgeActive(note, sessionV2)).toBe(false);
      expect(isNudgeActive(progressReport, sessionV2)).toBe(false);
      expect(pairNudge(sessionV2)).toBe(false); // documentation alone would leave the OR true

      const sessionV3 = { notes: sessionV2.notes + " Another change." };
      expect(pairNudge(sessionV3)).toBe(true); // fresh divergence re-triggers for the pair
    });
  });
});
