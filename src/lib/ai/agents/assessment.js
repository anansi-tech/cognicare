import { runAgent } from "../baseAgent";
import { buildClientBlock, buildRequestBlock } from "../context";

export async function assess({ clientId, sessionData }) {
  const clientBlock = await buildClientBlock(clientId);
  const requestBlock = buildRequestBlock(
    sessionData ? "Reassessment — new session input" : "Initial assessment request",
    { sessionData: sessionData ?? null }
  );
  return runAgent({ agentType: "assessment", clientBlock, requestBlock });
}
