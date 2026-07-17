import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { treatmentPayload } from "./schemas.js";
import { payloadHash } from "@/lib/hash";

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

const GOALS = [
  {
    goal: "Reduce depressive symptoms",
    objectives: [
      "Client will practice 2 replacement coping skills for urges",
      "Client will track mood 5 days/week",
      "Client will schedule one pleasant activity daily",
    ],
    measurable: "PHQ-9 below 10",
    targetTimeframe: "8 weeks",
  },
];
const PAYLOAD = {
  approach: "CBT",
  goals: GOALS,
  interventions: ["Cognitive restructuring", "Behavioral activation"],
  homework: ["Thought record"],
  referrals: [],
  reviewCadence: "Every 4 weeks",
  changeSummary: "",
};

describe("treatment goals carry per-goal objectives", () => {
  it("schema accepts goals with objectives", () => {
    const r = treatmentPayload.safeParse(PAYLOAD);
    expect(r.success).toBe(true);
  });

  it("schema requires objectives on generated plans (agents must emit them)", () => {
    const r = treatmentPayload.safeParse({
      ...PAYLOAD,
      goals: [{ goal: "g", measurable: "m", targetTimeframe: "t" }],
    });
    expect(r.success).toBe(false);
  });

  it("hash round-trip: editor round-trips with objectives are stable", () => {
    const stamped = payloadHash(PAYLOAD);
    // Editor round-trip artifacts: shuffled key order + semantic emptiness
    // (empty strings/arrays where the agent omitted keys). v2 canon prunes
    // and sorts, so the stamp must not move.
    const roundTripped = {
      changeSummary: "",
      goals: [
        {
          targetTimeframe: "8 weeks",
          objectives: [
            "Client will practice 2 replacement coping skills for urges",
            "Client will track mood 5 days/week",
            "Client will schedule one pleasant activity daily",
          ],
          measurable: "PHQ-9 below 10",
          goal: "Reduce depressive symptoms",
        },
      ],
      referrals: [],
      reviewCadence: "Every 4 weeks",
      homework: ["Thought record"],
      interventions: ["Cognitive restructuring", "Behavioral activation"],
      approach: "CBT",
    };
    expect(payloadHash(roundTripped)).toBe(stamped);
    // Reordering the objectives IS a real change — array order is meaningful.
    const reordered = {
      ...PAYLOAD,
      goals: [{ ...GOALS[0], objectives: [...GOALS[0].objectives].reverse() }],
    };
    expect(payloadHash(reordered)).not.toBe(stamped);
  });

  it("prompt pin: treatment.md carries the objectives guidance", () => {
    const src = read("prompts/treatment.md");
    expect(src).toMatch(/objectives/i);
    expect(src).toMatch(/Client will/);
    expect(src).toMatch(/do not duplicate/i);
    expect(src).toMatch(/means-restriction/i);
  });

  it("renderer pin: TreatmentBody reads objectives and the goal editor edits them", () => {
    const body = read("src/components/ai/AgentReportBody.jsx");
    expect(body).toMatch(/g\.objectives/);
    expect(body).toMatch(/key: "objectives", label: "Objectives", type: "list"/);
    expect(body).toMatch(/objectives: \[\]/); // emptyRow keeps the field key
  });
});
