import { describe, it, expect } from "vitest";
import { scoreInstrument } from "./score.js";
import { getInstrument } from "./instruments.js";

/** Build a full response array from a values array aligned to instrument items. */
function responses(instrumentId, values) {
  const inst = getInstrument(instrumentId);
  return inst.items.map((it, i) => ({ itemId: it.id, value: values[i] ?? 0 }));
}

/** Look up the expected band label from the fixture for a given total. */
function expectedBand(instrumentId, total) {
  const inst = getInstrument(instrumentId);
  return inst.bands.find((b) => total >= b.min && total <= b.max)?.label ?? "Unknown";
}

describe("scoreInstrument — PHQ-9", () => {
  it("all zeros → total 0, minimal band, no flags, complete", () => {
    const r = responses("phq9", Array(9).fill(0));
    const result = scoreInstrument("phq9", r);
    expect(result.total).toBe(0);
    expect(result.severityBand).toBe(expectedBand("phq9", 0));
    expect(result.flags).toHaveLength(0);
    expect(result.complete).toBe(true);
  });

  it("all threes → total 27, severe band, complete", () => {
    const r = responses("phq9", Array(9).fill(3));
    const result = scoreInstrument("phq9", r);
    expect(result.total).toBe(27);
    expect(result.severityBand).toBe(expectedBand("phq9", 27));
    expect(result.complete).toBe(true);
  });

  // Band boundary cases — each pair straddles a transition point
  it.each([
    [4, [1, 1, 1, 1, 0, 0, 0, 0, 0]],   // top of Minimal
    [5, [1, 1, 1, 1, 1, 0, 0, 0, 0]],   // bottom of Mild
    [9, [1, 1, 1, 1, 1, 1, 1, 1, 1]],   // top of Mild
    [10, [3, 3, 3, 1, 0, 0, 0, 0, 0]],  // bottom of Moderate
    [14, [3, 3, 3, 3, 2, 0, 0, 0, 0]],  // top of Moderate
    [15, [3, 3, 3, 3, 3, 0, 0, 0, 0]],  // bottom of Moderately severe
    [20, [3, 3, 3, 3, 3, 3, 2, 0, 0]],  // bottom of Severe
  ])("score %i → correct band", (total, values) => {
    const r = responses("phq9", values);
    const result = scoreInstrument("phq9", r);
    expect(result.total).toBe(total);
    expect(result.severityBand).toBe(expectedBand("phq9", total));
  });

  it("phq9_9 ≥ 1 → suicidal-ideation flag with correct itemId", () => {
    // item 9 is index 8 in the items array
    const values = Array(9).fill(0);
    values[8] = 1;
    const r = responses("phq9", values);
    const result = scoreInstrument("phq9", r);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].flag).toBe("suicidal-ideation");
    expect(result.flags[0].itemId).toBe("phq9_9");
  });

  it("phq9_9 = 0 → no flags", () => {
    const r = responses("phq9", Array(9).fill(0));
    expect(scoreInstrument("phq9", r).flags).toHaveLength(0);
  });

  it("missing one item → complete:false, total only sums present items", () => {
    const inst = getInstrument("phq9");
    // Omit last item; all present ones have value 1
    const r = inst.items.slice(0, 8).map((it) => ({ itemId: it.id, value: 1 }));
    const result = scoreInstrument("phq9", r);
    expect(result.complete).toBe(false);
    expect(result.total).toBe(8);
  });
});

describe("scoreInstrument — GAD-7", () => {
  it("all zeros → total 0, lowest band, no flags, complete", () => {
    const r = responses("gad7", Array(7).fill(0));
    const result = scoreInstrument("gad7", r);
    expect(result.total).toBe(0);
    expect(result.severityBand).toBe(expectedBand("gad7", 0));
    expect(result.flags).toHaveLength(0);
    expect(result.complete).toBe(true);
  });

  it("all threes → total 21, highest band, complete", () => {
    const r = responses("gad7", Array(7).fill(3));
    const result = scoreInstrument("gad7", r);
    expect(result.total).toBe(21);
    expect(result.severityBand).toBe(expectedBand("gad7", 21));
    expect(result.complete).toBe(true);
  });
});
