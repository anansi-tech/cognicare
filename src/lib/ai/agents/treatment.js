import { runAgent } from "../baseAgent";
import { buildClientBlock, buildRequestBlock } from "../context";

export async function plan({ clientId, priorPlan = null, excludeReportIds }) {
  const clientBlock = await buildClientBlock(clientId, { excludeReportIds });
  const mode = priorPlan
    ? `REVISE the existing treatment plan below in light of the latest progress and session data. ` +
      `Keep what's working, change what isn't, and fill changeSummary with what changed and why.\n\n` +
      `EXISTING PLAN:\n${JSON.stringify(priorPlan.payload, null, 2)}`
    : `Create the initial treatment plan. Leave changeSummary empty.`;
  const requestBlock = buildRequestBlock("Treatment plan request", { clientId, instructions: mode });
  return runAgent({ agentType: "treatment", clientBlock, requestBlock });
}
