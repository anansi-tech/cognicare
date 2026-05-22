import { runAgent } from "../baseAgent";
import { buildClientBlock, buildRequestBlock } from "../context";

export async function diagnose({ clientId, assessment }) {
  const clientBlock = await buildClientBlock(clientId);
  const requestBlock = buildRequestBlock("Upstream assessment report", assessment ?? null);
  return runAgent({ agentType: "diagnostic", clientBlock, requestBlock });
}
