import { runAgent } from "../baseAgent";
import { buildClientBlock, buildRequestBlock } from "../context";

export async function plan({ clientId }) {
  const clientBlock = await buildClientBlock(clientId);
  const requestBlock = buildRequestBlock("Treatment plan request", { clientId });
  return runAgent({ agentType: "treatment", clientBlock, requestBlock });
}
