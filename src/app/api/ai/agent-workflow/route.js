import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { runWorkflow } from "@/lib/ai/orchestrator";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import ConsentForm from "@/models/consentForm";

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

  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === String(clientId))) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Intake must not process PHI before informed consent is obtained.
  if (type === "intake") {
    await connectDB();
    const [client, signed] = await Promise.all([
      Client.findById(clientId).select("consentOverride").lean(),
      ConsentForm.exists({ clientId, practiceId: user.practiceId, status: "signed" }),
    ]);
    const overridden = !!(client?.consentOverride?.by);
    if (!signed && !overridden) {
      return NextResponse.json(
        { error: "Informed consent required before processing" },
        { status: 409 }
      );
    }
  }

  try {
    const result = await runWorkflow({
      type,
      clientId,
      sessionId,
      userId: user.id,
      practiceId: user.practiceId,
      sessionData,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("agent workflow error", e);
    return NextResponse.json({ error: "Workflow failed" }, { status: 500 });
  }
}
