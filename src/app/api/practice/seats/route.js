import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSeatUsage, isPracticeOwner } from "@/lib/practice";

// Reports seat usage for the caller's practice. Owner-only — clinicians
// don't need to see seat math.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPracticeOwner(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const usage = await getSeatUsage(user.practiceId);
  return NextResponse.json(usage);
}
