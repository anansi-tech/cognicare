import { streamText, convertToModelMessages } from "ai";
import { openai, MODELS } from "@/lib/ai/client";
import { loadPrompt } from "@/lib/ai/prompts";
import { buildClientBlock } from "@/lib/ai/context";
import { buildMemoryBlock } from "./memory";

// `uiMessages` are the AI SDK UI messages from useChat (parts-based).
export async function streamLiam({ clientId, thread, uiMessages }) {
  const system = await loadPrompt("liam.system");
  const clientBlock = await buildClientBlock(clientId);   // includes MBC trends + flags
  const memoryBlock = buildMemoryBlock(thread);

  return streamText({
    model: openai(MODELS.clinical),
    system: `${system}\n\n${clientBlock}\n\n${memoryBlock}`,
    messages: await convertToModelMessages(uiMessages),
  });
}
