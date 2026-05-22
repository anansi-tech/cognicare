import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";
import Client from "@/models/client";
import Session from "@/models/session";
import { getSession } from "@/lib/auth";

/**
 * API route to handle different agent workflow stages:
 * - intake: Assessment & Diagnostic agents (new clients)
 * - pre-session: Treatment planning & Session prep
 * - post-session: Progress tracking & Documentation
 */
export async function POST(req) {
  try {
    const authSession = await getSession();
    if (!authSession || !authSession.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the request headers to extract cookies
    const requestHeaders = req.headers;
    const cookieHeader = requestHeaders.get("cookie");

    const { stage, clientId, clientData, sessionId, shouldReassess } = await req.json();

    if (!stage || !clientId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Connect to DB one time at the beginning
    await connectDB();

    // Handle different workflow stages
    switch (stage) {
      case "intake":
        return handleIntake(clientId, clientData, cookieHeader);
      case "pre-session":
        return handlePreSession(clientId, sessionId, authSession, shouldReassess, cookieHeader);
      case "post-session":
        return handlePostSession(clientId, sessionId, cookieHeader);
      default:
        return NextResponse.json({ error: "Invalid workflow stage" }, { status: 400 });
    }
  } catch (error) {
    console.error("Agent Workflow Error:", error);
    return NextResponse.json({ error: "Agent workflow failed" }, { status: 500 });
  }
}

/**
 * Handle the intake stage - run Assessment and Diagnostic agents
 */
async function handleIntake(clientId, clientData, cookieHeader) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Validate client data structure
    if (!clientData || typeof clientData !== "object") {
      console.error("Invalid client data:", clientData);
      return NextResponse.json({ error: "Invalid client data format" }, { status: 400 });
    }

    // Check for risk factors in client data
    const riskFactor = shouldTriggerRiskAssessment(clientData);
    const priority = riskFactor ? "high" : "normal";

    // Call the assessment agent with all required parameters
    try {
      console.log(`Calling assessment agent at ${baseUrl}/api/ai/assessment`);
      const assessmentResponse = await fetch(`${baseUrl}/api/ai/assessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader, // Forward the cookie for authentication
        },
        body: JSON.stringify({
          clientId,
          clientData,
          priority,
          riskFactor,
          sessionData: null, // During intake, there's no therapy session yet
        }),
      });

      // Log assessment response status
      console.log("Assessment response status:", assessmentResponse.status);

      // If there's an error, try to get the error details
      if (!assessmentResponse.ok) {
        let errorDetails = "Unknown error";
        try {
          const errorJson = await assessmentResponse.json();
          errorDetails = errorJson.error || errorJson.message || JSON.stringify(errorJson);
        } catch (e) {
          // If we can't parse JSON, try to get text
          try {
            errorDetails = await assessmentResponse.text();
          } catch (textError) {
            errorDetails = `Status: ${assessmentResponse.status}, could not parse response body`;
          }
        }
        console.error("Assessment agent error details:", errorDetails);
        throw new Error(`Assessment agent failed: ${errorDetails}`);
      }

      const assessmentResults = await assessmentResponse.json();
      console.log("Assessment completed successfully");

      // Call the diagnostic agent
      const diagnosticResponse = await fetch(`${baseUrl}/api/ai/diagnostic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader, // Forward the cookie for authentication
        },
        body: JSON.stringify({
          clientId,
          clientData,
          assessmentResults,
          sessionData: null, // During intake, there's no therapy session yet
        }),
      });

      if (!diagnosticResponse.ok) {
        let errorDetails = "Unknown error";
        try {
          const errorJson = await diagnosticResponse.json();
          errorDetails = errorJson.error || errorJson.message || JSON.stringify(errorJson);
        } catch (e) {
          try {
            errorDetails = await diagnosticResponse.text();
          } catch (textError) {
            errorDetails = `Status: ${diagnosticResponse.status}, could not parse response body`;
          }
        }
        console.error("Diagnostic agent error details:", errorDetails);
        throw new Error(`Diagnostic agent failed: ${errorDetails}`);
      }

      const diagnosticResults = await diagnosticResponse.json();
      console.log("Diagnostic completed successfully");

      // Update the client's lastIntakeAssessment date
      await Client.findByIdAndUpdate(clientId, {
        lastIntakeAssessment: new Date(),
        lastReassessment: new Date(), // Initialize reassessment date
        riskLevel: assessmentResults.riskLevel || "unknown", // Store risk level directly in client document
      });

      return NextResponse.json({
        assessmentResults,
        diagnosticResults,
        message: "Intake processing completed successfully",
      });
    } catch (agentError) {
      console.error("Agent processing error:", agentError);
      return NextResponse.json(
        {
          error: agentError.message || "Agent processing failed",
          details: {
            clientId,
            baseUrl,
            message: "Error occurred during agent processing",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Intake Error:", error);
    return NextResponse.json(
      {
        error: "Intake processing failed",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Check if risk assessment should be triggered based on client data
 */
function shouldTriggerRiskAssessment(clientData) {
  const riskKeywords = [
    "suicide",
    "suicidal",
    "self-harm",
    "harm",
    "crisis",
    "emergency",
    "urgent",
    "immediate",
    "severe",
    "extreme",
    "critical",
    "violence",
    "abuse",
    "danger",
    "trauma",
    "risk",
    "threatening",
  ];

  if (!clientData || !clientData.initialAssessment) {
    return false;
  }

  const text = clientData.initialAssessment.toLowerCase();
  return riskKeywords.some((keyword) => text.includes(keyword));
}

/**
 * Handle the pre-session stage - run Treatment planning
 * Includes potential reassessment if triggers are met
 */
async function handlePreSession(
  clientId,
  therapySessionId,
  authSession,
  shouldReassess,
  cookieHeader
) {
  try {
    // Get client and session data
    const client = await Client.findById(clientId).lean();
    const therapySessionData = therapySessionId
      ? await Session.findById(therapySessionId).lean()
      : null;

    // Get all prior sessions for continuity
    const priorSessions = await Session.find({
      clientId,
      _id: { $ne: therapySessionId }, // Exclude current session
      documented: true, // Only include completed sessions
    })
      .sort({ date: -1 })
      .limit(5)
      .lean(); // Get the 5 most recent sessions

    // Create a summarized version of prior sessions to avoid prompt overload
    const sessionSummaries = priorSessions.map((session) => ({
      id: session._id.toString(),
      date: session.date,
      moodRating: session.moodRating,
      status: session.status,
      notes: session.notes
        ? session.notes.length > 200
          ? session.notes.substring(0, 200) + "..."
          : session.notes
        : "",
      documented: session.documented,
    }));

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let assessmentResults = null;
    let diagnosticResults = null;

    // If reassessment is needed, run assessment and diagnostic agents again
    if (shouldReassess) {
      console.log("Performing reassessment before session");

      // Call the assessment agent with current client data
      const assessmentResponse = await fetch(`${baseUrl}/api/ai/assessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader, // Forward the cookie for authentication
        },
        body: JSON.stringify({
          clientId,
          clientData: client,
          priority: "normal",
          riskFactor: shouldTriggerRiskAssessment(client),
          sessionData: therapySessionData,
          sessionSummaries: sessionSummaries.length > 0 ? sessionSummaries : undefined,
        }),
      });

      if (!assessmentResponse.ok) {
        throw new Error("Reassessment failed");
      }

      assessmentResults = await assessmentResponse.json();

      // Call the diagnostic agent with fresh assessment
      const diagnosticResponse = await fetch(`${baseUrl}/api/ai/diagnostic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader, // Forward the cookie for authentication
        },
        body: JSON.stringify({
          clientId,
          clientData: client,
          assessmentResults,
          sessionData: therapySessionData,
          sessionSummaries: sessionSummaries.length > 0 ? sessionSummaries : undefined,
        }),
      });

      if (!diagnosticResponse.ok) {
        throw new Error("Diagnostic reassessment failed");
      }

      diagnosticResults = await diagnosticResponse.json();

      // Update the client's last reassessment date and risk level
      await Client.findByIdAndUpdate(clientId, {
        lastReassessment: new Date(),
        riskLevel: assessmentResults.riskLevel || client.riskLevel || "unknown",
      });
    } else {
      // Retrieve the most recent assessment and diagnostic reports
      const assessmentReport = await AIReport.findOne({
        clientId,
        type: "assessment",
      })
        .sort({ "metadata.timestamp": -1 })
        .lean();

      const diagnosticReport = await AIReport.findOne({
        clientId,
        type: "diagnostic",
      })
        .sort({ "metadata.timestamp": -1 })
        .lean();

      assessmentResults = assessmentReport?.content || null;
      diagnosticResults = diagnosticReport?.content || null;
    }

    const previousDocumentationReports = await AIReport.find({
      clientId,
      type: "documentation",
      sessionId: { $ne: therapySessionId }, // Exclude current session
    })
      .sort({ "metadata.timestamp": -1 })
      .limit(1)
      .lean(); // Get only the most recent documentation report

    // Call the treatment agent for session planning with efficient context
    const treatmentResponse = await fetch(`${baseUrl}/api/ai/treatment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader, // Forward the cookie for authentication
      },
      body: JSON.stringify({
        clientId,
        clientData: client,
        sessionData: therapySessionData,
        // Send most recent documentation report which already contains synthesized information
        // from previous assessments, diagnostics, and progress reports
        previousDocumentation:
          previousDocumentationReports.length > 0 ? previousDocumentationReports[0].content : null,
        // Only include assessment and diagnostic results if:
        // 1. We just did a reassessment, or
        // 2. There are no previous documentation reports available
        assessmentResults:
          shouldReassess || previousDocumentationReports.length === 0 ? assessmentResults : null,
        diagnosticResults:
          shouldReassess || previousDocumentationReports.length === 0 ? diagnosticResults : null,
        sessionNumber: priorSessions.length + 1, // Send session number for context
        isReassessment: shouldReassess,
      }),
    });

    if (!treatmentResponse.ok) {
      throw new Error("Treatment planning failed");
    }

    const treatmentResults = await treatmentResponse.json();

    return NextResponse.json({
      treatmentResults,
      newAssessment: shouldReassess ? assessmentResults : null,
      newDiagnostic: shouldReassess ? diagnosticResults : null,
      message: shouldReassess
        ? "Reassessment and session preparation completed successfully"
        : "Session preparation completed successfully",
    });
  } catch (error) {
    console.error("Pre-Session Error:", error);
    return NextResponse.json({ error: "Pre-session processing failed" }, { status: 500 });
  }
}

/**
 * Handle the post-session stage - run Progress tracking and Documentation
 */
async function handlePostSession(clientId, therapySessionId, cookieHeader) {
  try {
    if (!therapySessionId) {
      return NextResponse.json(
        { error: "Session ID required for post-session processing" },
        { status: 400 }
      );
    }

    // Get client and session data
    const client = await Client.findById(clientId).lean();
    const therapySessionData = await Session.findById(therapySessionId).lean();

    if (!therapySessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get all prior sessions for treatment continuity context
    const priorSessions = await Session.find({
      clientId,
      _id: { $ne: therapySessionId }, // Exclude current session
      documented: true,
    })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    // Retrieve the most recent assessment, diagnostic, and treatment reports
    const assessmentReport = await AIReport.findOne({
      clientId,
      type: "assessment",
    })
      .sort({ "metadata.timestamp": -1 })
      .lean();

    const diagnosticReport = await AIReport.findOne({
      clientId,
      type: "diagnostic",
    })
      .sort({ "metadata.timestamp": -1 })
      .lean();

    const treatmentReport = await AIReport.findOne({
      clientId,
      type: "treatment",
    })
      .sort({ "metadata.timestamp": -1 })
      .lean();

    // Retrieve previous progress reports for trend analysis
    const previousProgressReports = await AIReport.find({
      clientId,
      type: "progress",
      sessionId: { $ne: therapySessionId }, // Exclude current session if exists
    })
      .sort({ "metadata.timestamp": -1 })
      .limit(5)
      .lean();

    // Retrieve previous documentation reports for continuity
    const previousDocumentationReports = await AIReport.find({
      clientId,
      type: "documentation",
      sessionId: { $ne: therapySessionId }, // Exclude current session if exists
    })
      .sort({ "metadata.timestamp": -1 })
      .limit(3)
      .lean();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Step 1: Call the progress agent with comprehensive history
    const progressResponse = await fetch(`${baseUrl}/api/ai/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader, // Forward the cookie for authentication
      },
      body: JSON.stringify({
        clientId,
        clientData: client,
        sessionData: therapySessionData,
        assessmentResults: assessmentReport?.content || null,
        diagnosticResults: diagnosticReport?.content || null,
        treatmentResults: treatmentReport?.content || null,
        previousProgressReports: previousProgressReports.map((report) => report.content),
        priorSessions,
        sessionNumber: priorSessions.length + 1,
      }),
    });

    if (!progressResponse.ok) {
      throw new Error("Progress assessment failed");
    }

    const progressResults = await progressResponse.json();

    // Step 2: Call the documentation agent with essential information
    const documentationResponse = await fetch(`${baseUrl}/api/ai/documentation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader, // Forward the cookie for authentication
      },
      body: JSON.stringify({
        clientId,
        sessionId: therapySessionId,
        clientData: client,
        sessionData: therapySessionData,
        assessmentResults: assessmentReport?.content || null,
        diagnosticResults: diagnosticReport?.content || null,
        treatmentResults: treatmentReport?.content || null,
        progressResults,
        // Include only the most recent documentation report for continuity
        previousDocumentation:
          previousDocumentationReports.length > 0 ? previousDocumentationReports[0].content : null,
        sessionNumber: priorSessions.length + 1,
      }),
    });

    if (!documentationResponse.ok) {
      throw new Error("Session documentation failed");
    }

    const documentationResults = await documentationResponse.json();

    // Mark the session as documented
    await Session.findByIdAndUpdate(therapySessionId, {
      documented: true,
      completedAt: new Date(),
    });

    // Update client risk level if provided in progress results
    if (progressResults.riskLevel) {
      await Client.findByIdAndUpdate(clientId, {
        riskLevel: progressResults.riskLevel,
      });
    }

    // Extract AI's reassessment recommendation
    const recommendReassessment = !!progressResults.recommendReassessment;
    const reassessmentRationale = progressResults.reassessmentRationale || "No rationale provided";

    return NextResponse.json({
      progressResults,
      documentationResults,
      recommendReassessment,
      reassessmentRationale,
      message: "Post-session processing completed successfully",
    });
  } catch (error) {
    console.error("Post-Session Error:", error);
    return NextResponse.json({ error: "Post-session processing failed" }, { status: 500 });
  }
}
