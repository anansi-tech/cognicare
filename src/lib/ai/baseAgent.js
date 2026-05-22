import { openai } from "@ai-sdk/openai";
import { streamText, generateObject } from "ai";
import { getSchemaByType } from "./schemas";

export async function createAgentStream(messages, context) {
  try {
    const result = await streamText({
      model: openai("gpt-3.5-turbo"),
      messages: [
        {
          role: "system",
          content: "You are a professional mental health AI assistant.",
        },
        ...messages,
      ],
      temperature: 0.7,
    });

    return result.toAIStreamResponse();
  } catch (error) {
    console.error("Stream generation error:", error);
    throw new Error("Failed to generate stream response");
  }
}

export async function createStructuredResponse(
  messages,
  functions = null,
  agentType = "assessment"
) {
  try {
    // Get the appropriate schema for the agent type
    const schema = getSchemaByType(agentType);

    // Generate structured response using the schema
    const result = await generateObject({
      model: openai("gpt-3.5-turbo"),
      schema,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
    });

    // Return the generated object
    return result.object;
  } catch (error) {
    console.error("Error in createStructuredResponse:", error);
    throw error;
  }
}
