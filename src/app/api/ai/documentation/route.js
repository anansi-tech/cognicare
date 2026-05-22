import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { document } from "@/lib/ai/agents/documentation";
import { persistReport } from "@/lib/report-utils";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, sessionId, sessionData, progress } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  try {
    const env = await document({ clientId, progress, sessionData });
    await persistReport({ ...env, clientId, sessionId, userId: user.id });
    return NextResponse.json(env);
  } catch (e) {
    console.error("documentation agent error", e);
    return NextResponse.json({ error: "Documentation failed" }, { status: 500 });
  }
}
