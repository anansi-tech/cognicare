import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPracticeOwner } from "@/lib/practice";
import { getAuditLogs } from "@/lib/audit";

// Owner-only audit log reader. Practice-scoped via getAuditLogs's required
// practiceId arg — there is no path through this handler that returns logs
// for any practice other than the caller's own.
export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPracticeOwner(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.practiceId) {
    return NextResponse.json({ logs: [], total: 0, page: 1, totalPages: 0 });
  }

  const { searchParams } = new URL(request.url);
  const data = await getAuditLogs({
    practiceId: user.practiceId,
    userId: searchParams.get("userId") || undefined,
    action: searchParams.get("action") || undefined,
    entityType: searchParams.get("entityType") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    page: Number(searchParams.get("page") || 1),
    limit: Math.min(Number(searchParams.get("limit") || 50), 200),
  });
  return NextResponse.json(data);
}
