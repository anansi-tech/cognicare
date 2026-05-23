import { assess } from "./agents/assessment";
import { diagnose } from "./agents/diagnostic";
import { plan } from "./agents/treatment";
import { evaluateProgress } from "./agents/progress";
import { document as documentSession } from "./agents/documentation";
import { persistReport } from "@/lib/report-utils";

// Each workflow runs in-process, sequentially, passing prior outputs forward, persisting each.
export async function runWorkflow({ type, clientId, sessionId, userId, practiceId, sessionData }) {
  const save = (env) =>
    persistReport({ ...env, clientId, sessionId, userId, practiceId });

  if (type === "intake") {
    const a = await assess({ clientId, sessionData }); await save(a);
    const d = await diagnose({ clientId, assessment: a }); await save(d);
    return { assessment: a, diagnostic: d };
  }
  if (type === "pre-session") {
    const t = await plan({ clientId }); await save(t);
    return { treatment: t };
  }
  if (type === "post-session") {
    const p = await evaluateProgress({ clientId, sessionData }); await save(p);
    const doc = await documentSession({ clientId, progress: p, sessionData }); await save(doc);
    return { progress: p, documentation: doc };
  }
  throw new Error(`Unknown workflow type: ${type}`);
}
