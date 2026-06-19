import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import Client from "@/models/client";
import ConsentForm from "@/models/consentForm";

// GET consent status for a client.
// Returns: { required, signed, latest, overridden }
export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clientId } = await params;
  await connectDB();

  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const [client, forms] = await Promise.all([
    Client.findOne({ _id: clientId, practiceId: user.practiceId })
      .select("consentOverride")
      .lean(),
    ConsentForm.find({ clientId, practiceId: user.practiceId })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const signed = forms.some((f) => f.status === "signed");
  const latest = forms[0]
    ? { type: forms[0].type, status: forms[0].status, sentAt: forms[0].createdAt, signedAt: forms[0].dateSigned ?? null }
    : null;
  const overridden = !!(client?.consentOverride?.by);

  return NextResponse.json({ required: true, signed, latest, overridden });
}
