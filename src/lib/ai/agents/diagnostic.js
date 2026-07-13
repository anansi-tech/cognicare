import { runAgent } from "../baseAgent";
import { buildClientBlock, buildRequestBlock } from "../context";

export async function diagnose({ clientId, assessment, excludeReportIds }) {
  const clientBlock = await buildClientBlock(clientId, { excludeReportIds });
  const requestBlock = buildRequestBlock("Upstream assessment report", assessment ?? null);
  return runAgent({ agentType: "diagnostic", clientBlock, requestBlock });
}
