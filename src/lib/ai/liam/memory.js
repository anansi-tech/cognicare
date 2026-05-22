import { generateText } from "ai";
import { openai, MODELS } from "@/lib/ai/client";
import { connectDB } from "@/lib/mongodb";
import LiamThread from "@/models/liamThread";

const KEEP_TURNS = 12; // verbatim recent turns; older ones live in rollingSummary

export async function getThread(userId, clientId) {
  await connectDB();
  return (
    (await LiamThread.findOne({ userId, clientId })) ||
    new LiamThread({ userId, clientId, turns: [], rollingSummary: "" })
  );
}

// Text block for the prompt: rolling summary + recent verbatim turns.
export function buildMemoryBlock(thread) {
  if (!thread?.turns?.length && !thread?.rollingSummary) return "## Conversation\n(none yet)";
  const recent = thread.turns
    .slice(-KEEP_TURNS)
    .map((t) => `${t.role === "user" ? "Therapist" : "LIAM"}: ${t.content}`)
    .join("\n");
  const summary = thread.rollingSummary ? `Earlier (summary): ${thread.rollingSummary}\n` : "";
  return `## Conversation\n${summary}${recent}`;
}

// Append the latest exchange; compress overflow into rollingSummary.
export async function appendExchange(thread, userText, assistantText) {
  thread.turns.push({ role: "user", content: userText });
  thread.turns.push({ role: "assistant", content: assistantText });
  thread.lastActiveAt = new Date();

  if (thread.turns.length > KEEP_TURNS) {
    const overflow = thread.turns.slice(0, thread.turns.length - KEEP_TURNS);
    thread.turns = thread.turns.slice(-KEEP_TURNS);
    const transcript = overflow.map((t) => `${t.role}: ${t.content}`).join("\n");
    const { text } = await generateText({
      model: openai(MODELS.background),
      messages: [{
        role: "user",
        content:
          `Update this running summary of a therapist↔copilot conversation. Keep it under 150 words, ` +
          `clinically relevant, factual.\n\nCurrent summary:\n${thread.rollingSummary || "(none)"}\n\n` +
          `New turns to fold in:\n${transcript}`,
      }],
    });
    thread.rollingSummary = text.trim();
  }
  await thread.save();
  return thread;
}
