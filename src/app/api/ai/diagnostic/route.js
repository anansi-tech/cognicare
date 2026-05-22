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

    const { clientId, clientData, assessmentResults, sessionData, sessionSummaries } =
      await req.json();
    if (!clientId || !clientData || !assessmentResults) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Determine if this is an initial diagnostic or a follow-up
    const isFollowUp = !!sessionData || (sessionSummaries && sessionSummaries.length > 0);

    // Build the system prompt
    let systemPrompt = {
      role: "system",
      content: `You are an expert mental health diagnostician with deep understanding of the DSM-5 and ICD-10 diagnostic criteria.

IMPORTANT: Your response must be in this exact JSON format:
{
  "primaryDiagnosis": {
    "name": "Full diagnostic name",
    "code": "DSM-5/ICD-10 code",
    "confidence": "high|moderate|low",
    "criteria": ["List of specific criteria met"],
    "rationale": "Brief explanation of diagnostic reasoning"
  },
  "differentialDiagnoses": [
    {
      "name": "Full diagnostic name",
      "code": "DSM-5/ICD-10 code",
      "confidence": "high|moderate|low",
      "criteria": ["List of specific criteria met"],
      "rationale": "Brief explanation of why this is being considered"
    }
  ],
  "recommendedAssessments": ["List of specific assessment tools"],
  "diagnosticSummary": "Brief summary of diagnostic reasoning",
  "ruleOutConditions": ["List of conditions to rule out with additional assessment"],
  "severityIndicators": ["List of factors indicating condition severity"],
  "riskFactors": ["List of risk factors that may complicate treatment"],
  "culturalConsiderations": ["List of cultural factors relevant to diagnosis"],
  "treatmentImplications": ["Specific implications for treatment planning"],
  "clinicalJustification": "Detailed clinical justification for the diagnostic conclusion",
  "comorbidityAssessment": {
    "present": true|false,
    "conditions": [
      {
        "code": "DSM-5/ICD-10 code",
        "name": "Full diagnostic name",
        "confidence": "high|moderate|low",
        "criteria": ["List of specific criteria met"],
        "rationale": "Explanation of comorbidity diagnosis"
      }
    ],
    "overallImpact": "Summary of how comorbidities affect overall clinical picture",
    "managementStrategy": "General approach to managing multiple conditions"
  }
}`,
    };

    // Add context about prior sessions if available
    if (sessionSummaries && sessionSummaries.length > 0) {
      systemPrompt.content += `\n\nYou have access to summaries of the client's previous sessions. Consider this information when making your diagnostic assessment, looking for patterns of symptoms over time and response to interventions.`;
    }

    // Build the user prompt
    let userPromptContent = `Provide a thorough diagnostic assessment based on this client information and assessment results.`;

    // Add client data
    userPromptContent += `\n\nClient Information:\n${JSON.stringify(clientData, null, 2)}`;

    // Add assessment results
    userPromptContent += `\n\nAssessment Results:\n${JSON.stringify(assessmentResults, null, 2)}`;

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

    // Add context about diagnostic development
    if (isFollowUp) {
      userPromptContent += `\n\nThis is a follow-up diagnostic assessment. Consider how symptoms have evolved over time and any response to treatment.`;
    } else {
      userPromptContent += `\n\nThis is an initial diagnostic assessment based on first client contact.`;
    }

    const userPrompt = {
      role: "user",
      content: userPromptContent,
    };

    const response = await createStructuredResponse([systemPrompt, userPrompt], null, "diagnostic");

    // Store the AI diagnostic
    await connectDB();
    const aiReport = new AIReport({
      clientId,
      counselorId: session.user.id,
      type: "diagnostic",
      content: response,
      sessionId: sessionData?._id,
      source: isFollowUp ? "follow-up-diagnostic" : "initial-diagnostic",
      metadata: {
        modelVersion: "gpt-3.5-turbo",
        timestamp: new Date(),
        assessmentRiskLevel: assessmentResults.riskLevel,
        isFollowUp,
      },
    });
    await aiReport.save();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Diagnostic Agent Error:", error);
    return NextResponse.json({ error: "Diagnostic generation failed" }, { status: 500 });
  }
}
