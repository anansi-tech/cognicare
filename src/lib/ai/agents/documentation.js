import { runAgent } from "../baseAgent";
import { buildClientBlock, buildRequestBlock } from "../context";

export async function document({ clientId, progress, sessionData, excludeReportIds }) {
  const clientBlock = await buildClientBlock(clientId, { excludeReportIds });
  const requestBlock = [
    buildRequestBlock("Session input", sessionData ?? null),
    buildRequestBlock("Upstream progress report", progress ?? null),
  ].join("\n\n");
  return runAgent({ agentType: "documentation", clientBlock, requestBlock });
}
