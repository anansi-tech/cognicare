import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runWorkflow } from "@/lib/ai/orchestrator";

export const runtime = "nodejs";
// Two sequential gpt-5.5 reasoning calls; needs > Vercel Hobby's 60s cap (Fluid/Pro allow up to 300s).
export const maxDuration = 300;

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, clientId, sessionId, sessionData } = await req.json();
  if (!type || !clientId) {
    return NextResponse.json({ error: "type and clientId required" }, { status: 400 });
  }

  try {
    const result = await runWorkflow({ type, clientId, sessionId, userId: user.id, sessionData });
    return NextResponse.json(result);
  } catch (e) {
    console.error("agent workflow error", e);
    return NextResponse.json({ error: "Workflow failed" }, { status: 500 });
  }
}
