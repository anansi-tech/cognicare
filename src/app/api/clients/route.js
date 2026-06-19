import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";
import { createAndSendConsent } from "@/lib/consent";

// Get all clients for the authenticated counselor
export const GET = requireAuth(async (req) => {
  try {
    await connectDB();
    const user = await getCurrentUser();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Visibility = assignment-based. Owner sees the whole practice roster;
    // a clinician sees only clients assigned to them (counselorId === user.id).
    const query = await clientScope(user);
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { "contactInfo.email": { $regex: search, $options: "i" } },
      ];
    }

    const clients = await Client.find(query)
      .select("-initialAssessment") // Exclude large fields
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Clients GET error:", error);
    return NextResponse.json({ message: "Error fetching clients" }, { status: 500 });
  }
});

// Create a new client
export const POST = requireAuth(async (req) => {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "counselor") {
      return NextResponse.json(
        { message: "Unauthorized - Only counselors can create clients" },
        { status: 401 },
      );
    }

    await connectDB();

    // Get body data from request
    const body = await req.json();

    // Stamp both ownership (practiceId) and assignment (counselorId) on create.
    body.practiceId = user.practiceId;
    body.counselorId = user.id;
    if (!body.status) body.status = "Active";

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }

    if (!body.initialAssessment) {
      return NextResponse.json({ message: "Initial assessment is required" }, { status: 400 });
    }

    // Ensure contactInfo structure exists
    if (!body.contactInfo) {
      body.contactInfo = {
        email: "",
        phone: "",
        emergencyContact: {
          name: "",
          relationship: "",
          phone: "",
        },
      };
    } else {
      // Ensure email and phone exist
      body.contactInfo.email = body.contactInfo.email || "";
      body.contactInfo.phone = body.contactInfo.phone || "";

      // Ensure emergencyContact exists with all fields
      if (!body.contactInfo.emergencyContact) {
        body.contactInfo.emergencyContact = {
          name: "",
          relationship: "",
          phone: "",
        };
      } else if (typeof body.contactInfo.emergencyContact !== "object") {
        // If emergencyContact is a string (or other non-object), convert to object
        const value = String(body.contactInfo.emergencyContact);
        body.contactInfo.emergencyContact = {
          name: value,
          relationship: "",
          phone: "",
        };
      } else {
        // Ensure all fields exist
        body.contactInfo.emergencyContact.name = body.contactInfo.emergencyContact.name || "";
        body.contactInfo.emergencyContact.relationship =
          body.contactInfo.emergencyContact.relationship || "";
        body.contactInfo.emergencyContact.phone = body.contactInfo.emergencyContact.phone || "";
      }
    }

    // Create and save the client
    const client = await Client.create(body);

    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.CREATE,
      entityType: EntityTypes.CLIENT,
      entityId: client._id,
      ...auditMetaFromRequest(req),
    });

    // Auto-send the general consent form if the client has an email.
    // Best-effort: a failure here must never block client creation.
    if (client.contactInfo?.email) {
      try {
        await createAndSendConsent({ client, counselorId: user.id, type: "general" });
        await logAuditEvent({
          userId: user.id,
          practiceId: user.practiceId,
          action: AuditActions.CREATE,
          entityType: EntityTypes.DOCUMENT,
          entityId: client._id,
          details: { consentType: "general", autoSent: true },
          ...auditMetaFromRequest(req),
        });
      } catch (consentErr) {
        console.error("Auto-consent send failed (non-fatal):", consentErr);
      }
    }

    // Return the complete client object including initialAssessment
    return NextResponse.json(client.toObject(), { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ message: "Error creating client" }, { status: 500 });
  }
});
