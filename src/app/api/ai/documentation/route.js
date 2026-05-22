import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createStructuredResponse } from "@/lib/ai/baseAgent";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      clientId,
      sessionId,
      sessionData,
      clientData,
      assessmentResults,
      diagnosticResults,
      treatmentResults,
      progressResults,
      previousDocumentation,
      sessionNumber,
    } = await req.json();
    if (!clientId || !sessionId || !sessionData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const systemPrompt = {
      role: "system",
      content: `You are an expert mental health documentation specialist who creates comprehensive clinical documentation by synthesizing information from multiple sources.

${
  sessionNumber ? `This is session number ${sessionNumber} in the client's treatment sequence.` : ""
}

IMPORTANT: You must ALWAYS include:
1. All relevant metrics (risk levels, symptom severity, progress scores)
2. Diagnostic codes and criteria
3. Treatment adherence percentages
4. Progress indicators with numerical values

Your documentation should primarily focus on THIS SPECIFIC SESSION, while maintaining continuity with previous care.

Your response MUST follow this exact JSON structure with these top-level keys: "summary", "soap", "clinicalDocumentation", "additionalComponents", "progressSummary".

{
  "summary": "Brief summary focusing on this session's key observations and metrics",
  "soap": {
    "subjective": "Client's reported experiences with metrics",
    "objective": "Clinical observations with measurements",
    "assessment": "Clinical judgment with diagnostic codes",
    "plan": "Treatment recommendations with metrics"
  },
  "clinicalDocumentation": {
    "initialObservations": "Initial clinical observations with measurements",
    "riskAssessmentSummary": "Summary of risk assessment with levels",
    "diagnosticConsiderations": "Diagnostic considerations with codes",
    "treatmentGoalsAndInterventions": ["Array of goals and interventions with metrics"],
    "progressIndicators": ["Array of progress indicators with numerical values"],
    "treatmentEffectivenessAnalysis": "Analysis of treatment effectiveness with percentages",
    "followUpRecommendations": ["Array of follow-up recommendations with metrics"]
  },
  "additionalComponents": {
    "recommendedAssessmentTools": ["Array of assessment tools with scores"],
    "specificInterventions": ["Array of specific interventions with metrics"],
    "progressMetrics": ["Array of progress metrics with numerical values"],
    "nextSessionFocus": "Focus for next session with measurable goals"
  },
  "progressSummary": {
    "treatmentGoalsProgress": [
      {
        "goal": "Treatment goal",
        "progress": "Progress description with percentage"
      }
    ],
    "outcomesMeasurement": ["Array of outcome measurements with scores"],
    "areasOfImprovement": ["Array of improvement areas with metrics"],
    "challengesAndBarriers": ["Array of challenges with severity ratings"],
    "treatmentPlanAdjustments": ["Array of adjustments with impact metrics"],
    "longTermProgressIndicators": ["Array of long-term indicators with measurements"]
  }
}`,
    };

    // Construct user prompt content with conditional sections
    let userPromptContent = `Create comprehensive clinical documentation for this session using the exact schema structure specified. Include all required fields.

Client Info:
${JSON.stringify(clientData)}

Session Info:
${JSON.stringify(sessionData)}`;

    // Add assessment results if available
    if (assessmentResults) {
      userPromptContent += `\n\nAssessment Results:
${JSON.stringify(assessmentResults)}`;
    }

    // Add diagnostic results if available
    if (diagnosticResults) {
      userPromptContent += `\n\nDiagnostic Results:
${JSON.stringify(diagnosticResults)}`;
    }

    // Add treatment results if available
    if (treatmentResults) {
      userPromptContent += `\n\nTreatment Results:
${JSON.stringify(treatmentResults)}`;
    }

    // Add current progress results
    userPromptContent += `\n\nProgress Results:
${JSON.stringify(progressResults || {})}`;

    // Add previous documentation if available
    if (previousDocumentation) {
      userPromptContent += `\n\nPrevious Documentation:
${JSON.stringify(previousDocumentation)}`;
    }

    // Add session-specific context
    if (sessionNumber) {
      if (sessionNumber === 1) {
        userPromptContent += `\n\nThis is the FIRST session. Focus on initial observations, treatment planning, and establishing therapeutic alliance.`;
      } else if (sessionNumber === 2) {
        userPromptContent += `\n\nThis is the SECOND session. Focus on initial therapeutic progress, refining the treatment plan, and addressing initial challenges.`;
      } else {
        userPromptContent += `\n\nThis is session ${sessionNumber}. Focus primarily on this session's content, progress since last session, and next steps.`;
      }
    }

    userPromptContent += `\n\nYour documentation should primarily focus on THIS SPECIFIC SESSION's content and progress, while providing appropriate context from previous treatment. Ensure your response includes all required fields and follows the exact schema structure provided.`;

    const userPrompt = {
      role: "user",
      content: userPromptContent,
    };

    const response = await createStructuredResponse(
      [systemPrompt, userPrompt],
      null,
      "documentation"
    );
    const documentationResults = response;

    // Store the AI output
    await connectDB();
    const aiReport = new AIReport({
      clientId,
      sessionId,
      counselorId: session.user.id,
      type: "documentation",
      content: documentationResults,
      source: sessionNumber === 1 ? "initial-session" : "follow-up-session",
      metadata: {
        modelVersion: "gpt-3.5-turbo",
        timestamp: new Date(),
        sessionNumber: sessionNumber || null,
      },
    });
    await aiReport.save();

    return NextResponse.json(documentationResults);
  } catch (error) {
    console.error("Documentation Agent Error:", error);
    return NextResponse.json({ error: "Documentation generation failed" }, { status: 500 });
  }
}
