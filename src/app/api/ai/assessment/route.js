import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createStructuredResponse } from "@/lib/ai/baseAgent";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, clientData, priority, riskFactor, sessionData, sessionSummaries } =
      await req.json();
    if (!clientId || !clientData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Determine the assessment type (initial or follow-up)
    const isFollowUp = !!sessionData || (sessionSummaries && sessionSummaries.length > 0);
    const assessmentSource = isFollowUp ? "follow-up-assessment" : "initial-assessment";

    // Build the system prompt
    let systemPrompt = {
      role: "system",
      content: `You are an expert mental health assessment specialist. Analyze the client information provided and assess their current mental health state, risk factors, and treatment priorities.

IMPORTANT: Your response must be in this exact JSON format:
{
  "riskLevel": "none|low|minimal|mild|moderate|high|severe|extreme|critical",
  "primaryConcerns": ["List of primary mental health concerns"],
  "riskFactors": ["List of risk factors identified"],
  "assessmentSummary": "Brief summary of your overall assessment",
  "recommendedAssessmentTools": ["List specific assessment tools that would be helpful"],
  "initialClinicalObservations": "Brief clinical observations based on available information",
  "suggestedNextSteps": ["Specific next steps for treatment planning"],
  "areasRequiringImmediateAttention": ["List of areas requiring immediate attention"],
}`,
    };

    // Add context about prior sessions if available
    if (sessionSummaries && sessionSummaries.length > 0) {
      systemPrompt.content += `\n\nYou have access to summaries of the client's previous sessions. Use this information to identify patterns, progress, or changes in their condition. Pay special attention to any new risk factors or changes in existing concerns.`;
    }

    // Build the user prompt
    let userPromptContent = `Perform a mental health assessment for this client based on the information provided.`;

    // Add client data
    userPromptContent += `\n\nClient Information:\n${JSON.stringify(clientData, null, 2)}`;

    // Add session data if available
    if (sessionData) {
      userPromptContent += `\n\nCurrent Session Information:\n${JSON.stringify(
        sessionData,
        null,
        2
      )}`;
    }

    // Add prior session summaries if available
    if (sessionSummaries && sessionSummaries.length > 0) {
      userPromptContent += `\n\nPrior Session Summaries (${
        sessionSummaries.length
      }):\n${JSON.stringify(sessionSummaries, null, 2)}`;
    }

    // Add risk factor information if present
    if (riskFactor) {
      userPromptContent += `\n\nNOTE: Potential risk factors were detected in this client's information. Please carefully evaluate suicide risk, self-harm risk, and harm to others.`;
    }

    const userPrompt = {
      role: "user",
      content: userPromptContent,
    };

    const response = await createStructuredResponse([systemPrompt, userPrompt], null, "assessment");

    // Store the AI assessment
    await connectDB();
    const aiReport = new AIReport({
      clientId,
      counselorId: user.id,
      type: "assessment",
      content: response,
      source: assessmentSource,
      metadata: {
        modelVersion: "gpt-3.5-turbo",
        timestamp: new Date(),
        priority,
        riskFactor: !!riskFactor,
      },
    });
    await aiReport.save();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Assessment Agent Error:", error);
    return NextResponse.json({ error: "Assessment generation failed" }, { status: 500 });
  }
}
