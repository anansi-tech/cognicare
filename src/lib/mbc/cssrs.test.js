import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "crypto";
import { encrypt, decrypt } from "mongoose-field-encryption";
import { scoreInstrument, categorize, isItemVisible } from "./score.js";
import { getInstrument, listInstruments } from "./instruments.js";
import { getTrend } from "./trend.js";
import { computeRiskSummary } from "./risk.js";

// Responses helper: values keyed by item id; omitted = unanswered.
const r = (map) => Object.entries(map).map(([itemId, value]) => ({ itemId, value }));

describe("C-SSRS categorize — Columbia triage tiers", () => {
  it("all no → none, no positives", () => {
    const { tier, positives } = categorize("cssrs", r({ cssrs_1: 0, cssrs_2: 0, cssrs_6: 0 }));
    expect(tier).toBe("none");
    expect(positives).toEqual([]);
  });

  it("Q1 yes → low", () => {
    expect(categorize("cssrs", r({ cssrs_1: 1, cssrs_2: 0, cssrs_6: 0 })).tier).toBe("low");
  });

  it("Q2 yes (no method/intent/plan) → low", () => {
    const { tier, positives } = categorize("cssrs", r({ cssrs_1: 0, cssrs_2: 1, cssrs_3: 0, cssrs_4: 0, cssrs_5: 0, cssrs_6: 0 }));
    expect(tier).toBe("low");
    expect(positives).toEqual(["cssrs_2"]);
  });

  it("Q3 yes → moderate", () => {
    expect(categorize("cssrs", r({ cssrs_1: 0, cssrs_2: 1, cssrs_3: 1, cssrs_4: 0, cssrs_5: 0, cssrs_6: 0 })).tier).toBe("moderate");
  });

  it("Q4 yes → high; Q5 yes → high", () => {
    expect(categorize("cssrs", r({ cssrs_1: 0, cssrs_2: 1, cssrs_3: 1, cssrs_4: 1, cssrs_5: 0, cssrs_6: 0 })).tier).toBe("high");
    expect(categorize("cssrs", r({ cssrs_1: 0, cssrs_2: 1, cssrs_3: 0, cssrs_4: 0, cssrs_5: 1, cssrs_6: 0 })).tier).toBe("high");
  });

  it("Q6 lifetime-only behavior → moderate (Columbia: consult + consider precautions)", () => {
    const { tier, positives } = categorize("cssrs", r({ cssrs_1: 0, cssrs_2: 0, cssrs_6: 1, cssrs_6_recent: 0 }));
    expect(tier).toBe("moderate");
    expect(positives).toEqual(["cssrs_6"]);
  });

  it("Q6 behavior within past 3 months → high", () => {
    expect(categorize("cssrs", r({ cssrs_1: 0, cssrs_2: 0, cssrs_6: 1, cssrs_6_recent: 1 })).tier).toBe("high");
  });

  it("hidden items never count: Q3 'yes' with Q2 'no' is ignored", () => {
    const { tier, positives } = categorize("cssrs", r({ cssrs_1: 0, cssrs_2: 0, cssrs_3: 1, cssrs_6: 0 }));
    expect(tier).toBe("none");
    expect(positives).toEqual([]);
  });
});

describe("C-SSRS scoreInstrument — categorical, branching completeness", () => {
  it("Q2 no → items 3-5 not required; complete with 1, 2, 6 answered", () => {
    const result = scoreInstrument("cssrs", r({ cssrs_1: 0, cssrs_2: 0, cssrs_6: 0 }));
    expect(result.complete).toBe(true);
    expect(result.total).toBeNull();
    expect(result.tier).toBe("none");
  });

  it("Q2 yes → items 3-5 become required", () => {
    expect(scoreInstrument("cssrs", r({ cssrs_1: 0, cssrs_2: 1, cssrs_6: 0 })).complete).toBe(false);
    expect(scoreInstrument("cssrs", r({ cssrs_1: 0, cssrs_2: 1, cssrs_3: 0, cssrs_4: 0, cssrs_5: 0, cssrs_6: 0 })).complete).toBe(true);
  });

  it("Q6 yes → the past-3-months follow-up becomes required", () => {
    expect(scoreInstrument("cssrs", r({ cssrs_1: 0, cssrs_2: 0, cssrs_6: 1 })).complete).toBe(false);
    expect(scoreInstrument("cssrs", r({ cssrs_1: 0, cssrs_2: 0, cssrs_6: 1, cssrs_6_recent: 0 })).complete).toBe(true);
  });

  it("returns a tier label, never a score", () => {
    const result = scoreInstrument("cssrs", r({ cssrs_1: 1, cssrs_2: 0, cssrs_6: 0 }));
    expect(result.total).toBeNull();
    expect(result.severityBand).toBe("Low risk tier");
    expect(result.positives).toEqual(["cssrs_1"]);
  });

  it("isItemVisible honors showIf", () => {
    const inst = getInstrument("cssrs");
    const q3 = inst.items.find((i) => i.id === "cssrs_3");
    expect(isItemVisible(q3, new Map([["cssrs_2", 0]]))).toBe(false);
    expect(isItemVisible(q3, new Map([["cssrs_2", 1]]))).toBe(true);
  });
});

describe("categorical instruments are excluded from trend/RCI", () => {
  it("getTrend returns an empty categorical stub without touching the DB", async () => {
    // No DB in vitest — this only passes because the guard returns first.
    const t = await getTrend("000000000000000000000000", "cssrs");
    expect(t.categorical).toBe(true);
    expect(t.points).toEqual([]);
    expect(t.direction).toBe("insufficient-data");
  });

  it("listInstruments marks categorical instruments", () => {
    const byId = Object.fromEntries(listInstruments().map((i) => [i.id, i]));
    expect(byId.cssrs.categorical).toBe(true);
    expect(byId.phq9.categorical).toBe(false);
  });
});

describe("computeRiskSummary — content-anchored trigger + elevation", () => {
  const d = (s) => new Date(s).toISOString();
  const phq9Positive = { administeredAt: d("2026-07-01"), flags: [{ flag: "phq9-item9-positive", itemId: "phq9_9" }] };

  it("PHQ-9 item 9 positive with no C-SSRS → suggested", () => {
    const s = computeRiskSummary({ phq9Latest: phq9Positive, cssrsLatest: null, safetyPlan: null });
    expect(s.cssrsSuggested).toBe(true);
    expect(s.phq9Date).toBe(phq9Positive.administeredAt);
  });

  it("C-SSRS administered AFTER the flagged PHQ-9 clears the suggestion", () => {
    const s = computeRiskSummary({
      phq9Latest: phq9Positive,
      cssrsLatest: { administeredAt: d("2026-07-02"), tier: "none" },
      safetyPlan: null,
    });
    expect(s.cssrsSuggested).toBe(false);
  });

  it("a C-SSRS from BEFORE the flagged PHQ-9 does not clear it", () => {
    const s = computeRiskSummary({
      phq9Latest: phq9Positive,
      cssrsLatest: { administeredAt: d("2026-06-20"), tier: "none" },
      safetyPlan: null,
    });
    expect(s.cssrsSuggested).toBe(true);
  });

  it("item 9 = 0 (no flag) → never suggested", () => {
    const s = computeRiskSummary({
      phq9Latest: { administeredAt: d("2026-07-01"), flags: [] },
      cssrsLatest: null,
      safetyPlan: null,
    });
    expect(s.cssrsSuggested).toBe(false);
  });

  it("moderate/high tier → elevated; low/none → not", () => {
    for (const [tier, expected] of [["none", false], ["low", false], ["moderate", true], ["high", true]]) {
      const s = computeRiskSummary({
        phq9Latest: null,
        cssrsLatest: { administeredAt: d("2026-07-01"), tier },
        safetyPlan: null,
      });
      expect(s.elevated).toBe(expected);
    }
  });

  it("a newer lower-tier administration clears elevation (the latest decides)", () => {
    // The caller passes only the LATEST administration — a newer 'low' result
    // replaces the old 'high' one, so elevation reads false.
    const s = computeRiskSummary({
      phq9Latest: null,
      cssrsLatest: { administeredAt: d("2026-07-10"), tier: "low" },
      safetyPlan: null,
    });
    expect(s.elevated).toBe(false);
  });

  it("safety-plan metadata flows through", () => {
    const s = computeRiskSummary({
      phq9Latest: null,
      cssrsLatest: { administeredAt: d("2026-07-01"), tier: "high" },
      safetyPlan: { reviewedAt: d("2026-07-05"), updatedAt: d("2026-07-06") },
    });
    expect(s.safetyPlan).toEqual({ exists: true, reviewedAt: d("2026-07-05"), updatedAt: d("2026-07-06") });
  });
});

// The specialists' output guidance lives in prompts/*.md, loaded at runtime by
// baseAgent's loadPrompt(agentType) — NOT in src/lib/ai. This pins the R55
// Risk guidance so a prompt-editing pass can't silently drop it.
describe("agent prompts carry the elevated-C-SSRS risk guidance", () => {
  for (const agent of ["treatment", "progress", "documentation"]) {
    it(`prompts/${agent}.md recommends safety planning + referral, citing the screener`, () => {
      const src = fs.readFileSync(path.join(process.cwd(), "prompts", `${agent}.md`), "utf8");
      expect(src).toMatch(/C-SSRS/);
      expect(src).toMatch(/safety plan/i);
      expect(src).toMatch(/referral/i);
    });
  }

  it("baseAgent builds system prompts from prompts/<agentType>.md", () => {
    const base = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/baseAgent.js"), "utf8");
    expect(base).toMatch(/loadPrompt\(agentType\)/);
  });
});

describe("safety plan — encryption round-trip + structural invariants", () => {
  function deriveKey(secret) {
    return crypto.createHash("sha256").update(secret).digest("hex").substring(0, 32);
  }
  const KEY = deriveKey("test-phi-encryption-key-for-vitest");
  const saltGenerator = () => crypto.randomBytes(16);

  it("plan step content (string array) round-trips through field encryption", () => {
    const step = ["Racing thoughts at night", "Skipping meals", "Withdrawing from friends"];
    const plain = JSON.stringify(step);
    const ciphertext = encrypt(plain, KEY, saltGenerator);
    expect(ciphertext).not.toBe(plain);
    expect(JSON.parse(decrypt(ciphertext, KEY))).toEqual(step);
  });

  it("model encrypts every content field and enforces one plan per client", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/models/safetyPlan.js"), "utf8");
    for (const f of ["warningSigns", "internalCoping", "distractions", "peopleForHelp", "professionals", "environmentSafety", "reasonsForLiving"]) {
      // Each content field appears in the fieldEncryption fields list.
      expect(src.match(new RegExp(`"${f}"`, "g")).length).toBeGreaterThanOrEqual(1);
    }
    expect(src).toMatch(/fieldEncryption/);
    expect(src).toMatch(/unique: true/);
  });

  it("safety-plan route upserts via save() — never findOneAndUpdate (encryption hook)", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/clients/[id]/safety-plan/route.js"), "utf8"
    );
    expect(src).not.toMatch(/\.(findOneAndUpdate|updateOne)\(/);
    expect(src).toMatch(/\.save\(\)/);
    expect(src).toMatch(/visibleClientIds/);
    expect(src).toMatch(/logAuditEvent/);
  });
});
