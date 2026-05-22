import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { plan } from "@/lib/ai/agents/treatment";
import { persistReport } from "@/lib/report-utils";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, sessionId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  try {
    const env = await plan({ clientId });
    await persistReport({ ...env, clientId, sessionId, userId: user.id });
    return NextResponse.json(env);
  } catch (e) {
    console.error("treatment agent error", e);
    return NextResponse.json({ error: "Treatment plan failed" }, { status: 500 });
  }
}
