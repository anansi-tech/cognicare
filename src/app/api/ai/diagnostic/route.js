import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { diagnose } from "@/lib/ai/agents/diagnostic";
import { persistReport } from "@/lib/report-utils";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, sessionId, assessment } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  try {
    const env = await diagnose({ clientId, assessment });
    await persistReport({ ...env, clientId, sessionId, userId: user.id, practiceId: user.practiceId });
    return NextResponse.json(env);
  } catch (e) {
    console.error("diagnostic agent error", e);
    return NextResponse.json({ error: "Diagnostic failed" }, { status: 500 });
  }
}
