import { runAgent } from "../baseAgent";
import { buildClientBlock, buildRequestBlock } from "../context";

export async function evaluateProgress({ clientId, sessionData }) {
  const clientBlock = await buildClientBlock(clientId);
  const requestBlock = buildRequestBlock(
    "Progress evaluation request",
    { sessionData: sessionData ?? null }
  );
  return runAgent({ agentType: "progress", clientBlock, requestBlock });
}
