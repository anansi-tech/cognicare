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
      clientData,
      sessionData,
      assessmentResults,
      diagnosticResults,
      previousDocumentation,
      isReassessment,
      sessionNumber,
    } = await req.json();
    if (!clientId || (!diagnosticResults && !previousDocumentation)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Process through AI
    const systemPrompt = {
      role: "system",
      content: `You are an expert mental health treatment planner with extensive experience in developing evidence-based treatment plans.

Key Focus Areas:
1. Evidence-based interventions
2. Goal setting and outcome measurement
3. Treatment timeline planning
4. Progress monitoring strategies
5. Intervention customization

${
  isReassessment
    ? "This is a REASSESSMENT. Based on new clinical findings, update and adjust the existing treatment plan."
    : ""
}
${sessionNumber ? `This is session number ${sessionNumber} in the treatment sequence.` : ""}

Provide treatment recommendations in structured JSON format.`,
    };

    let userPromptContent = `Based on the following information, develop a comprehensive treatment plan:

Client Information:
${JSON.stringify(clientData, null, 2)}

Session Information:
${JSON.stringify(sessionData || {}, null, 2)}`;

    // Add diagnostic and assessment results if available
    if (diagnosticResults) {
      userPromptContent += `\n\nDiagnostic Results:
${JSON.stringify(diagnosticResults, null, 2)}`;
    }

    if (assessmentResults) {
      userPromptContent += `\n\nAssessment Results:
${JSON.stringify(assessmentResults, null, 2)}`;
    }

    // Add previous documentation if available
    if (previousDocumentation) {
      userPromptContent += `\n\nPrevious Session Documentation:
${JSON.stringify(previousDocumentation, null, 2)}`;
    }

    // Add context about session number and reassessment
    if (sessionNumber) {
      if (sessionNumber === 1) {
        userPromptContent += `\n\nThis is the FIRST therapy session. Focus on building rapport, psychoeducation, and initial intervention strategies.`;
      } else if (sessionNumber <= 3) {
        userPromptContent += `\n\nThis is an EARLY therapy session (session ${sessionNumber}). Focus on skill building and addressing immediate concerns.`;
      } else if (sessionNumber >= 10) {
        userPromptContent += `\n\nThis is a LATER stage therapy session (session ${sessionNumber}). Consider maintenance, relapse prevention, and progress consolidation.`;
      } else {
        userPromptContent += `\n\nThis is session ${sessionNumber} in the treatment sequence. Adjust interventions based on therapy stage.`;
      }
    }

    if (isReassessment) {
      userPromptContent += `\n\nIMPORTANT: This plan follows a clinical REASSESSMENT. Focus on incorporating new diagnostic findings and adjusting the treatment approach accordingly.`;
    }

    userPromptContent += `\n\nCreate a treatment plan including:
1. Treatment Goals (short-term and long-term)
2. Specific Interventions
3. Timeline and Milestones
4. Measurable Outcomes
5. Progress Indicators
6. Recommended Approaches
7. Potential Barriers
8. Success Metrics`;

    const userPrompt = {
      role: "user",
      content: userPromptContent,
    };

    const treatmentPlan = await createStructuredResponse(
      [systemPrompt, userPrompt],
      null,
      "treatment"
    );

    // Store the AI output
    await connectDB();
    const aiReport = new AIReport({
      clientId,
      counselorId: session.user.id,
      type: "treatment",
      content: treatmentPlan,
      source: isReassessment ? "treatment-reassessment" : "initial-treatment",
      sessionId: sessionData?._id,
      metadata: {
        modelVersion: "gpt-3.5-turbo",
        timestamp: new Date(),
        sessionNumber: sessionNumber || null,
        isReassessment: !!isReassessment,
      },
    });
    await aiReport.save();

    return NextResponse.json(treatmentPlan);
  } catch (error) {
    console.error("Treatment planning error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
