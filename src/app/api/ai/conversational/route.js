import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createStructuredResponse } from "@/lib/ai/baseAgent";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";
import Session from "@/models/session";
import Client from "@/models/client";

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, sessionId, query, context } = await req.json();
    if (!clientId || !sessionId || !query) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    // Get client data
    const client = await Client.findOne({ _id: clientId });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get current session data
    const currentSession = await Session.findOne({ _id: sessionId });
    if (!currentSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get historical data
    const historicalData = {
      sessions: await Session.find({ clientId }).sort({ date: -1 }).limit(10),
      aiReports: await AIReport.find({
        clientId,
        type: { $in: ["assessment", "diagnostic", "treatment", "progress", "documentation"] },
      })
        .sort({ timestamp: -1 })
        .limit(10),
    };

    // Build the system prompt
    const systemPrompt = {
      role: "system",
      content: `You are an AI assistant for mental health professionals. Your role is to provide helpful, conversational responses based on the client's information and history, as well as your general knowledge of mental health practices.

You have access to:
1. Client Information: Basic details and history
2. Current Session: Information about the ongoing session
3. Historical Sessions: Previous session notes and data
4. AI Reports: Past assessments, diagnostics, treatments, progress notes, and documentation
5. General Knowledge: Your training in mental health practices, therapeutic techniques, and clinical guidelines

Response Guidelines:
1. For client-specific questions:
   - Use the provided client data as the primary source
   - Reference specific sessions and reports when relevant
   - Maintain client confidentiality and professional boundaries

2. For general mental health questions:
   - Use your knowledge of evidence-based practices
   - Reference relevant therapeutic approaches
   - Provide practical, actionable advice
   - Cite sources or evidence when possible

3. For mixed questions:
   - Combine client-specific data with general knowledge
   - Clearly distinguish between client-specific observations and general recommendations
   - Provide context-appropriate suggestions

4. For follow-up questions:
   - Maintain context from previous messages
   - Continue the conversation naturally
   - Reference previous topics when relevant
   - Complete any previously started explanations or guides

When asked about session series or sequence:
- Always check the session dates to determine the correct order
- Clearly state which session number this is in the series
- Reference previous sessions when relevant
- Use specific dates to avoid confusion

When asked to present information as a list:
- Use bullet points or numbered lists as appropriate
- Format lists clearly with proper spacing
- Use markdown-style formatting for lists
- Ensure each list item is concise and clear
- ALWAYS provide complete lists - do not leave lists unfinished
- If you start a list, make sure to include all items

When formatting responses:
- Use proper paragraph breaks for readability
- Use bullet points for lists of items
- Use numbered lists for sequential steps
- Use bold text for important points
- Use line breaks between different sections
- Ensure responses are complete and not truncated

IMPORTANT: Your response should be in this format:
{
  "response": "Your conversational response here...",
  "relevantData": {
    "sessions": ["List of relevant session IDs or summaries"],
    "reports": ["List of relevant report IDs or summaries"]
  }
}`,
    };

    // Build the user prompt
    const userPrompt = {
      role: "user",
      content: `Previous Conversation Context:
${context || "No previous context"}

Client Information:
${JSON.stringify(client, null, 2)}

Current Session Information:
${JSON.stringify(currentSession, null, 2)}

Historical Data:
${JSON.stringify(historicalData, null, 2)}

User Query: ${query}`,
    };

    const response = await createStructuredResponse(
      [systemPrompt, userPrompt],
      null,
      "conversational"
    );

    // Validate the response
    if (!response || !response.response || !response.response.trim()) {
      throw new Error("Empty or invalid response from AI model");
    }

    // Store the interaction
    const aiReport = new AIReport({
      clientId,
      counselorId: user.id,
      type: "conversational",
      content: response,
      source: "conversational-assistant",
      metadata: {
        modelVersion: "gpt-3.5-turbo",
        timestamp: new Date(),
        relevantData: response.relevantData,
      },
    });
    await aiReport.save();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Conversational Agent Error:", error);
    return NextResponse.json(
      { error: "Conversational response generation failed" },
      { status: 500 }
    );
  }
}
