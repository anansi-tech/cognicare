import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import Session from "@/models/session";
import Report from "@/models/report";
import User from "@/models/user";
import { getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";
import mongoose from "mongoose";

// Get a specific client with their sessions and reports
export async function GET(req, context) {
  try {
    // Get params and properly await them
    const params = await context.params;
    const id = params.id;

    // Check authentication first
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Assignment-based visibility — clinicians only see clients they're
    // assigned to; owner sees the whole practice. 404 (not 403) when the
    // user can't see it, so existence doesn't leak.
    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: id, ...scope }).lean();

    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    // Resolve the assigned clinician's display name (Round 12) without
    // changing `client.counselorId` from an ObjectId — callers compare it
    // as a string in several places.
    const counselor = client.counselorId
      ? await User.findById(client.counselorId).select("name email").lean()
      : null;

    // Attendance signal (Round 15): no-shows + cancellations in the last 90
    // days. Cheap signal that flags clients with attendance issues.
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const [noShows90, cancellations90] = await Promise.all([
      Session.countDocuments({
        clientId: id,
        practiceId: user.practiceId,
        status: "no-show",
        date: { $gte: ninetyDaysAgo },
      }),
      Session.countDocuments({
        clientId: id,
        practiceId: user.practiceId,
        status: "cancelled",
        date: { $gte: ninetyDaysAgo },
      }),
    ]);
    const attendance = { noShows90, cancellations90 };

    const recentSessions = await Session.find({
      clientId: id,
      practiceId: user.practiceId,
    })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    const recentReports = await Report.find({
      clientId: id,
      practiceId: user.practiceId,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "name")
      .lean();

    // Audit: viewing a client record is a PHI-touching event.
    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.READ,
      entityType: EntityTypes.CLIENT,
      entityId: id,
      ...auditMetaFromRequest(req),
    });

    return NextResponse.json({
      client,
      counselor,
      attendance,
      recentSessions,
      recentReports,
    });
  } catch (error) {
    console.error("Client GET error:", error);
    return NextResponse.json({ message: "Error fetching client" }, { status: 500 });
  }
}

// Update a client
export async function PATCH(req, context) {
  try {
    // Get params and properly await them
    const params = await context.params;
    const id = params.id;

    // Check authentication first
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();

    // Assignment-based visibility.
    const scope = await clientScope(user);
    const existingClient = await Client.findOne({ _id: id, ...scope });

    if (!existingClient) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    // Handle nested contactInfo structure
    if (body.contactInfo) {
      // Update email and phone if provided
      if (body.contactInfo.email !== undefined) {
        existingClient.contactInfo.email = body.contactInfo.email;
      }
      if (body.contactInfo.phone !== undefined) {
        existingClient.contactInfo.phone = body.contactInfo.phone;
      }

      // Ensure emergencyContact exists and has all required fields
      if (!existingClient.contactInfo.emergencyContact) {
        existingClient.contactInfo.emergencyContact = {
          name: "",
          relationship: "",
          phone: "",
        };
      }

      // Update emergencyContact fields if provided
      if (body.contactInfo.emergencyContact) {
        // Handle each field individually to preserve existing values
        if (body.contactInfo.emergencyContact.name !== undefined) {
          existingClient.contactInfo.emergencyContact.name = body.contactInfo.emergencyContact.name;
        }
        if (body.contactInfo.emergencyContact.relationship !== undefined) {
          existingClient.contactInfo.emergencyContact.relationship =
            body.contactInfo.emergencyContact.relationship;
        }
        if (body.contactInfo.emergencyContact.phone !== undefined) {
          existingClient.contactInfo.emergencyContact.phone =
            body.contactInfo.emergencyContact.phone;
        }
      }
    }

    // Update other fields
    const updateableFields = ["name", "dateOfBirth", "gender", "initialAssessment", "status"];
    updateableFields.forEach((field) => {
      if (body[field] !== undefined) {
        existingClient[field] = body[field];
      }
    });

    // Consent forms moved to the ConsentForm model (Round 12); manage via
    // `/api/consent-forms/*` instead of through this PATCH.

    // Handle billing updates (reference info only — invoices live in the
    // Invoice model since Round 12 and are managed at /api/clients/[id]/invoices).
    if (body.billing) {
      if (!existingClient.billing) {
        existingClient.billing = { paymentMethod: "cash", rate: 0, notes: "" };
      }
      if (body.billing.paymentMethod !== undefined) {
        existingClient.billing.paymentMethod = body.billing.paymentMethod;
      }
      if (body.billing.rate !== undefined) {
        existingClient.billing.rate = body.billing.rate;
      }
      if (body.billing.notes !== undefined) {
        existingClient.billing.notes = body.billing.notes;
      }
    }

    // Handle insurance updates
    if (body.insurance) {
      const insuranceUpdate = {};

      if (body.insurance.provider !== undefined) {
        insuranceUpdate["insurance.provider"] = body.insurance.provider;
      }
      if (body.insurance.policyNumber !== undefined) {
        insuranceUpdate["insurance.policyNumber"] = body.insurance.policyNumber;
      }
      if (body.insurance.groupNumber !== undefined) {
        insuranceUpdate["insurance.groupNumber"] = body.insurance.groupNumber;
      }
      if (body.insurance.coverage !== undefined) {
        insuranceUpdate["insurance.coverage"] = body.insurance.coverage;
      }
      if (body.insurance.notes !== undefined) {
        insuranceUpdate["insurance.notes"] = body.insurance.notes;
      }

      // Update just the insurance fields using findOneAndUpdate
      const updatedClient = await Client.findOneAndUpdate(
        { _id: id, ...scope },
        { $set: insuranceUpdate },
        { new: true }
      );

      if (!updatedClient) {
        return NextResponse.json({ message: "Client not found" }, { status: 404 });
      }

      // Return without initialAssessment field
      const { initialAssessment, ...clientWithoutAssessment } = updatedClient.toObject();
      return NextResponse.json(clientWithoutAssessment);
    }

    // Save the updated client
    await existingClient.save();

    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.UPDATE,
      entityType: EntityTypes.CLIENT,
      entityId: id,
      ...auditMetaFromRequest(req),
    });

    // Return without initialAssessment field
    const { initialAssessment, ...clientWithoutAssessment } = existingClient.toObject();
    return NextResponse.json(clientWithoutAssessment);
  } catch (error) {
    console.error("Client PATCH error:", error);
    return NextResponse.json({ message: "Error updating client" }, { status: 500 });
  }
}

// Delete a client
export async function DELETE(req, context) {
  try {
    // Get params and properly await them
    const params = await context.params;
    const id = params.id;

    // Check authentication first
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Delete client (assignment-scoped — same visibility as GET).
    const scope = await clientScope(user);
    const deletedClient = await Client.findOneAndDelete({ _id: id, ...scope });

    if (!deletedClient) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    // Delete associated sessions sequentially
    await Session.deleteMany({ clientId: id });

    // Delete associated reports sequentially
    await Report.deleteMany({ clientId: id });

    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.DELETE,
      entityType: EntityTypes.CLIENT,
      entityId: id,
      ...auditMetaFromRequest(req),
    });

    return NextResponse.json(
      { message: "Client and associated data deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Client DELETE error:", error);
    return NextResponse.json(
      { message: error.message || "Error deleting client" },
      { status: 500 }
    );
  }
}
