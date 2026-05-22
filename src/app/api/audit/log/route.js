import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AuditLog from "@/models/auditLog";

export async function POST(request) {
  try {
    const body = await request.json();

    await connectDB();

    const auditLog = new AuditLog({
      timestamp: new Date(),
      userId: body.userId,
      action: body.action,
      entityType: body.entityType,
      entityId: body.entityId,
      details: body.details,
      ipAddress: body.ipAddress,
      userAgent: body.userAgent,
    });

    await auditLog.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating audit log:", error);
    return NextResponse.json({ error: "Failed to create audit log" }, { status: 500 });
  }
}
