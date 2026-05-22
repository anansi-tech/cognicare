import { z } from "zod";

// Assessment schema
export const assessmentSchema = z
  .object({
    summary: z
      .string()
      .describe(
        "Brief summary (2-3 sentences) highlighting: 1) Overall risk level and key concerns, 2) Most significant clinical observations, 3) Immediate priorities for intervention"
      ),
    riskLevel: z.string(),
    primaryConcerns: z.array(z.string()),
    riskFactors: z.array(z.string()),
    recommendedAssessmentTools: z.array(z.string()),
    initialClinicalObservations: z.string(),
    suggestedNextSteps: z.array(z.string()),
    areasRequiringImmediateAttention: z.array(z.string()).optional(),
  })
  .passthrough();

// Diagnostic schema
export const diagnosticSchema = z
  .object({
    summary: z
      .string()
      .describe(
        "Brief summary (2-3 sentences) highlighting: 1) Primary diagnosis and severity, 2) Key differential diagnoses, 3) Most significant clinical implications"
      ),
    primaryDiagnosis: z.object({
      code: z.string(),
      name: z.string(),
      description: z.string().optional(),
      confidence: z.string(),
      criteria: z.array(z.string()),
      rationale: z.string(),
    }),
    differentialDiagnoses: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        description: z.string().optional(),
        confidence: z.string(),
        criteria: z.array(z.string()),
        rationale: z.string(),
      })
    ),
    ruleOutConditions: z.array(z.string()),
    severityIndicators: z.array(z.string()),
    riskFactors: z.array(z.string()),
    culturalConsiderations: z.array(z.string()),
    recommendedAssessments: z.array(z.string()),
    clinicalJustification: z.string(),
    treatmentImplications: z.array(z.string()),
    comorbidityAssessment: z.object({
      present: z.boolean(),
      conditions: z
        .array(
          z.object({
            code: z.string(),
            name: z.string(),
            confidence: z.string(),
            criteria: z.array(z.string()),
            rationale: z.string(),
          })
        )
        .optional(),
      overallImpact: z.string().optional(),
      managementStrategy: z.string().optional(),
    }),
  })
  .passthrough();

// Treatment schema
export const treatmentSchema = z
  .object({
    summary: z
      .string()
      .describe(
        "Brief summary (2-3 sentences) highlighting: 1) Primary treatment approach, 2) Key short-term goals, 3) Most critical interventions"
      ),
    goals: z.object({
      shortTerm: z.array(z.string()),
      longTerm: z.array(z.string()),
    }),
    interventions: z.array(z.string()),
    timeline: z.array(
      z.object({
        milestone: z.string(),
        timeframe: z.string(),
      })
    ),
    measurableOutcomes: z.array(z.string()),
    progressIndicators: z.array(z.string()),
    recommendedApproaches: z.array(z.string()),
    potentialBarriers: z.array(z.string()),
    successMetrics: z.array(z.string()),
  })
  .passthrough();

// Progress schema
export const progressSchema = z
  .object({
    summary: z
      .string()
      .describe(
        "Brief summary (2-3 sentences) highlighting: 1) Overall progress status with metrics, 2) Key changes since last session, 3) Most significant achievement or concern"
      ),
    goalAchievementStatus: z.array(
      z.object({
        goal: z.string(),
        status: z.string(),
        notes: z.string().optional(),
      })
    ),
    keyObservations: z.array(z.string()),
    treatmentEffectiveness: z.string(),
    identifiedBarriers: z.array(z.string()),
    areasOfImprovement: z.array(z.string()),
    areasNeedingFocus: z.array(z.string()),
    recommendations: z.array(z.string()),
    nextSteps: z.array(z.string()),
    treatmentPlanAdjustments: z.array(z.string()),
    metrics: z.object({
      overallProgress: z.number(),
      symptomSeverity: z.number(),
      treatmentAdherence: z.number(),
      riskLevel: z.number(),
    }),
  })
  .passthrough();

// Documentation schema
export const documentationSchema = z
  .object({
    summary: z
      .string()
      .describe(
        "Brief summary (2-3 sentences) highlighting: 1) Key session events, 2) Most significant clinical observations, 3) Critical follow-up actions, 4) Highlight key metrics and progress indicators"
      ),
    soap: z.object({
      subjective: z.string(),
      objective: z.string(),
      assessment: z.string(),
      plan: z.string(),
    }),
    clinicalDocumentation: z
      .object({
        initialObservations: z.string(),
        riskAssessmentSummary: z.string(),
        diagnosticConsiderations: z.string(),
        treatmentGoalsAndInterventions: z.array(z.string()),
        progressIndicators: z.array(z.string()),
        treatmentEffectivenessAnalysis: z.string(),
        followUpRecommendations: z.array(z.string()),
      })
      .passthrough(),
    additionalComponents: z
      .object({
        areasRequiringImmediateAttention: z.array(z.string()).optional(),
        recommendedAssessmentTools: z.array(z.string()),
        specificInterventions: z.array(z.string()),
        progressMetrics: z.array(z.string()),
        nextSessionFocus: z.string(),
      })
      .optional(),
    progressSummary: z.object({
      treatmentGoalsProgress: z.array(
        z.object({
          goal: z.string(),
          progress: z.string(),
          metrics: z
            .object({
              currentScore: z.union([z.string(), z.number()]),
              targetScore: z.union([z.string(), z.number()]),
              progressPercentage: z.string(),
            })
            .optional(),
        })
      ),
      outcomesMeasurement: z.array(z.string()),
      areasOfImprovement: z.array(z.string()),
      challengesAndBarriers: z.array(z.string()),
      treatmentPlanAdjustments: z.array(z.string()),
      longTermProgressIndicators: z.array(z.string()),
    }),
  })
  .passthrough();

// Conversational response schema
export const conversationalSchema = z
  .object({
    response: z.string(),
    relevantData: z.object({
      sessions: z.array(z.string()).optional(),
      reports: z.array(z.string()).optional(),
    }),
  })
  .passthrough();

// Combined schema that can handle any agent type
export const combinedSchema = z.union([
  assessmentSchema,
  diagnosticSchema,
  treatmentSchema,
  progressSchema,
  documentationSchema,
  conversationalSchema,
]);

// Helper function to get schema by agent type
export function getSchemaByType(agentType) {
  switch (agentType) {
    case "assessment":
      return assessmentSchema;
    case "diagnostic":
      return diagnosticSchema;
    case "treatment":
      return treatmentSchema;
    case "progress":
      return progressSchema;
    case "documentation":
      return documentationSchema;
    case "conversational":
      return conversationalSchema;
    default:
      return combinedSchema;
  }
}
