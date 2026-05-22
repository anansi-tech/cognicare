import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assess } from "@/lib/ai/agents/assessment";
import { persistReport } from "@/lib/report-utils";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, sessionData, sessionId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  try {
    const env = await assess({ clientId, sessionData });
    await persistReport({ ...env, clientId, sessionId, userId: user.id });
    return NextResponse.json(env);
  } catch (e) {
    console.error("assessment agent error", e);
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 });
  }
}
