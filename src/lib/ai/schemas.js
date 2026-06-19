import { z } from "zod";

// ---- Shared vocab ----------------------------------------------------------
// Collapsed from the old 9-value soup to a clean ordinal clinical scale.
// "imminent" means an active safety concern requiring immediate action.
export const RiskLevel = z.enum(["none", "low", "moderate", "high", "imminent"]);

const Confidence = z.enum(["low", "moderate", "high"]);

const DiagnosisCandidate = z.object({
  code: z.string().describe("ICD-10 or DSM-5-TR code, e.g. F32.1"),
  name: z.string(),
  confidence: Confidence,
  criteriaMet: z.array(z.string()),
  rationale: z.string(),
});

// ---- Per-agent payloads ----------------------------------------------------
export const assessmentPayload = z.object({
  riskLevel: RiskLevel,
  primaryConcerns: z.array(z.string()),
  riskFactors: z.array(z.string()),
  protectiveFactors: z.array(z.string()),
  recommendedInstruments: z.array(z.string())
    .describe("Standardized measures to administer, e.g. PHQ-9, GAD-7, PCL-5"),
  clinicalObservations: z.string(),
  immediateAttention: z.array(z.string())
    .describe("Items needing same-day clinical action; empty array if none"),
  suggestedNextSteps: z.array(z.string()),
});

export const diagnosticPayload = z.object({
  primaryDiagnosis: DiagnosisCandidate,
  differentials: z.array(DiagnosisCandidate),
  ruleOut: z.array(z.string()),
  comorbidities: z.array(DiagnosisCandidate),
  culturalConsiderations: z.array(z.string()),
  clinicalJustification: z.string(),
});

export const treatmentPayload = z.object({
  approach: z.string().describe("Primary evidence-based modality, e.g. CBT, DBT, ACT"),
  goals: z.array(z.object({
    goal: z.string(),
    measurable: z.string().describe("How progress is measured, ideally tied to an instrument"),
    targetTimeframe: z.string(),
  })),
  interventions: z.array(z.string()),
  homework: z.array(z.string()),
  referrals: z.array(z.string()),
  reviewCadence: z.string().describe("When to re-administer measures / reassess"),
  changeSummary: z.string().describe("What changed from the prior plan and why; empty for the initial plan"),
});

export const progressPayload = z.object({
  goalProgress: z.array(z.object({
    goal: z.string(),
    status: z.enum(["not-started", "emerging", "progressing", "met", "regressed"]),
    notes: z.string(),
  })),
  // MBC: the agent INTERPRETS the trend it is given in context. It does not invent scores.
  measureInterpretation: z.array(z.object({
    instrumentId: z.string(),
    latestScore: z.number(),
    previousScore: z.number().nullable(),
    direction: z.enum(["improved", "worsened", "unchanged", "insufficient-data"]),
    reliableChange: z.boolean()
      .describe("True if change exceeds the instrument's reliable-change threshold"),
    interpretation: z.string(),
  })),
  treatmentEffectiveness: z.string(),
  barriers: z.array(z.string()),
  reassessmentRecommended: z.boolean(),
  recommendations: z.array(z.string()),
  nextSessionFocus: z.string(),
});

export const documentationPayload = z.object({
  soap: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string(),
  }),
  measuresAdministered: z.array(z.object({
    instrumentId: z.string(),
    score: z.number(),
    severityBand: z.string(),
  })).describe("Echo of instruments scored this session; empty if none"),
  riskStatement: z.string().describe("Explicit risk documentation for the record"),
  followUp: z.array(z.string()),
  cptHint: z.string().optional().describe("Suggested CPT/service code, advisory only"),
});

// ---- Envelope --------------------------------------------------------------
function envelope(agentType, payload) {
  return z.object({
    agentType: z.literal(agentType),
    summary: z.string()
      .describe("2-3 sentence clinical summary: headline status, key change, top priority."),
    payload,
  });
}

export const ENVELOPES = {
  assessment: envelope("assessment", assessmentPayload),
  diagnostic: envelope("diagnostic", diagnosticPayload),
  treatment: envelope("treatment", treatmentPayload),
  progress: envelope("progress", progressPayload),
  documentation: envelope("documentation", documentationPayload),
};

// Discriminated union for persistence-layer validation.
export const ReportEnvelope = z.discriminatedUnion("agentType", [
  ENVELOPES.assessment,
  ENVELOPES.diagnostic,
  ENVELOPES.treatment,
  ENVELOPES.progress,
  ENVELOPES.documentation,
]);

export const AGENT_TYPES = Object.keys(ENVELOPES);
