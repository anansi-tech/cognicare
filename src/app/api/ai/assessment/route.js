import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { assess } from "@/lib/ai/agents/assessment";
import { persistReport } from "@/lib/report-utils";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, sessionData, sessionId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === String(clientId))) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    const env = await assess({ clientId, sessionData });
    await persistReport({ ...env, clientId, sessionId, userId: user.id, practiceId: user.practiceId });
    return NextResponse.json(env);
  } catch (e) {
    console.error("assessment agent error", e);
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 });
  }
}
