import { assess } from "./agents/assessment";
import { diagnose } from "./agents/diagnostic";
import { plan } from "./agents/treatment";
import { evaluateProgress } from "./agents/progress";
import { document as documentSession } from "./agents/documentation";
import { persistReport } from "@/lib/report-utils";
import AIReport from "@/models/aiReport";
import { connectDB } from "@/lib/mongodb";

async function latestTreatment(clientId) {
  await connectDB();
  return AIReport.findOne({ clientId, agentType: "treatment" })
    .sort({ version: -1, createdAt: -1 })
    .lean();
}

// Each workflow runs in-process, sequentially, passing prior outputs forward, persisting each.
export async function runWorkflow({ type, clientId, sessionId, userId, practiceId, sessionData }) {
  const save = (env, extra = {}) =>
    persistReport({ ...env, clientId, sessionId, userId, practiceId, ...extra });

  if (type === "intake") {
    const a = await assess({ clientId, sessionData }); await save(a, { status: "draft" });
    const d = await diagnose({ clientId, assessment: a }); await save(d, { status: "draft" });
    const t = await plan({ clientId });
    await save(t, { status: "draft", version: 1 });
    return { assessment: a, diagnostic: d, treatment: t };
  }
  if (type === "pre-session") {
    const prior = await latestTreatment(clientId);
    const t = await plan({ clientId, priorPlan: prior });
    await save(t, {
      status: "draft",
      version: (prior?.version ?? 0) + 1,
      supersedes: prior?._id,
    });
    return { treatment: t };
  }
  if (type === "post-session") {
    const p = await evaluateProgress({ clientId, sessionData }); await save(p, { status: "draft" });
    const doc = await documentSession({ clientId, progress: p, sessionData }); await save(doc);
    return { progress: p, documentation: doc };
  }
  throw new Error(`Unknown workflow type: ${type}`);
}
