import { runAgent } from "../baseAgent";
import { buildClientBlock, buildRequestBlock } from "../context";

export async function evaluateProgress({ clientId, sessionData, excludeReportIds }) {
  const clientBlock = await buildClientBlock(clientId, { excludeReportIds });
  const requestBlock = buildRequestBlock(
    "Progress evaluation request",
    { sessionData: sessionData ?? null }
  );
  return runAgent({ agentType: "progress", clientBlock, requestBlock });
}
