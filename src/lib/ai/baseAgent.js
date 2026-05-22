import { generateObject } from "ai";
import { openai, MODELS } from "./client";
import { ENVELOPES } from "./schemas";
import { loadPrompt } from "./prompts";

/**
 * Run one specialist agent. Returns a validated { agentType, summary, payload } envelope.
 * Prompt ordering is static-first for OpenAI prefix caching:
 *   system prompt (static) -> client context block (semi-static) -> request tail (dynamic).
 */
export async function runAgent({ agentType, clientBlock, requestBlock, model = MODELS.clinical }) {
  const system = await loadPrompt(agentType);
  const schema = ENVELOPES[agentType];

  const { object } = await generateObject({
    model: openai(model),
    schema,
    schemaName: `${agentType}_report`,
    messages: [
      { role: "system", content: system },
      { role: "system", content: clientBlock },   // cacheable per-client prefix
      { role: "user", content: requestBlock },     // per-request tail
    ],
  });

  return object;
}

/** @deprecated shim so old call sites don't break mid-round. Remove after routes are migrated. */
export async function createStructuredResponse(messages, _functions, agentType = "assessment") {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const user = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");
  return runAgent({ agentType, clientBlock: system, requestBlock: user });
}

// NOTE: createAgentStream intentionally NOT defined here yet — Round 2 (LIAM) adds streaming.
