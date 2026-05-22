import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createStructuredResponse } from "@/lib/ai/baseAgent";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";
import Session from "@/models/session";

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
      treatmentResults,
      previousProgressReports,
      priorSessions,
      sessionNumber,
    } = await req.json();

    if (!clientId || !sessionData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Process through AI
    const systemPrompt = {
      role: "system",
      content: `You are an expert mental health progress monitoring specialist.

Key Focus Areas:
1. Treatment progress evaluation
2. Outcome measurement
3. Goal achievement tracking
4. Barrier identification
5. Treatment effectiveness analysis

${sessionNumber ? `This is session number ${sessionNumber} in the treatment sequence.` : ""}

For each analysis, provide:
- Overall progress score (0-100)
- Symptom severity (0-10)
- Treatment adherence (0-100)
- Risk level (0-10)

IMPORTANT: As an expert clinician, you must also evaluate whether a full clinical reassessment is needed. 
Consider factors such as:
- Significant changes in symptoms (worsening or improvement)
- Change in risk levels
- New symptoms or concerns not previously identified
- Poor response to current treatment approach
- Major life changes or stressors reported by client
- Time elapsed since last full assessment

Analyze trends by comparing current session with historical data.
Focus on significant changes and patterns.

Provide progress analysis in structured JSON format.`,
    };

    // Construct user prompt content conditionally based on available data
    let userPromptContent = `Analyze the client's progress based on the following information:

Client Information:
${JSON.stringify(clientData, null, 2)}

Current Session:
${JSON.stringify(sessionData, null, 2)}`;

    // Add prior sessions if available (using data passed from agent workflow)
    if (priorSessions && priorSessions.length > 0) {
      userPromptContent += `\n\nPrior Sessions (${priorSessions.length}):
${JSON.stringify(
  priorSessions.map((session) => ({
    id: session._id?.toString(),
    date: session.date,
    moodRating: session.moodRating,
    status: session.status,
    notes: session.notes
      ? session.notes.length > 100
        ? session.notes.substring(0, 100) + "..."
        : session.notes
      : "",
  })),
  null,
  2
)}`;
    }

    // Add previous progress reports if available
    if (previousProgressReports && previousProgressReports.length > 0) {
      userPromptContent += `\n\nPrevious Progress Reports (${previousProgressReports.length}):
${JSON.stringify(
  previousProgressReports.map((report) => ({
    metrics: report.metrics,
    summary: report.summary,
    goalAchievementStatus: report.goalAchievementStatus,
  })),
  null,
  2
)}`;
    }

    // Add assessment results if available
    if (assessmentResults) {
      userPromptContent += `\n\nAssessment Results:
${JSON.stringify(assessmentResults, null, 2)}`;
    }

    // Add diagnostic information if available
    if (diagnosticResults) {
      userPromptContent += `\n\nDiagnostic Information:
${JSON.stringify(diagnosticResults, null, 2)}`;
    }

    // Add treatment plan if available
    if (treatmentResults) {
      userPromptContent += `\n\nTreatment Plan:
${JSON.stringify(treatmentResults, null, 2)}`;
    }

    // Add context about session number
    if (sessionNumber) {
      if (sessionNumber === 1) {
        userPromptContent += `\n\nThis is the FIRST therapy session. Focus on establishing baselines and initial observations.`;
      } else if (sessionNumber === 2) {
        userPromptContent += `\n\nThis is the SECOND therapy session. Focus on early progress indicators and refinement of initial approach.`;
      } else {
        userPromptContent += `\n\nThis is session ${sessionNumber} in the treatment sequence. Analyze progress trends over time.`;
      }
    }

    userPromptContent += `\n\nProvide a comprehensive progress analysis including:

1. Summary
2. Goal Achievement Status
3. Key Observations
4. Treatment Effectiveness
5. Identified Barriers
6. Areas of Improvement
7. Areas Needing Focus
8. Recommendations
9. Next Steps
10. Adjustments to Treatment Plan
11. Metrics (overall progress, symptom severity, treatment adherence, risk level)
12. Clinical Reassessment Recommendation: You MUST include:
    - "recommendReassessment": true/false (indicating if a new clinical assessment is needed)
    - "reassessmentRationale": "Clear explanation of why reassessment is or is not recommended"`;

    const userPrompt = {
      role: "user",
      content: userPromptContent,
    };

    const progressAnalysis = await createStructuredResponse(
      [systemPrompt, userPrompt],
      null,
      "progress"
    );

    // Store the AI output
    await connectDB();
    const aiReport = new AIReport({
      clientId,
      counselorId: session.user.id,
      type: "progress",
      content: progressAnalysis,
      source: sessionNumber === 1 ? "initial-progress" : "follow-up-progress",
      sessionId: sessionData?._id,
      metadata: {
        modelVersion: "gpt-3.5-turbo",
        timestamp: new Date(),
        sessionNumber: sessionNumber || null,
      },
    });
    await aiReport.save();

    return NextResponse.json(progressAnalysis);
  } catch (error) {
    console.error("Progress monitoring error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
