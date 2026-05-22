import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import Session from "@/models/session";
import Report from "@/models/report";
import { getCurrentUser } from "@/lib/auth";
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

    // Get client data
    const client = await Client.findOne({
      _id: id,
      counselorId: user.id,
    }).lean();

    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    // Get recent sessions
    const recentSessions = await Session.find({
      clientId: id,
      counselorId: user.id,
    })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    // Get recent reports
    const recentReports = await Report.find({
      clientId: id,
      createdBy: user.id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "name")
      .lean();

    console.log("Found reports:", recentReports);

    return NextResponse.json({
      client,
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

    // Find the client and ensure it belongs to the counselor
    const existingClient = await Client.findOne({
      _id: id,
      counselorId: user.id,
    });

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
    const updateableFields = ["name", "age", "gender", "initialAssessment", "status"];
    updateableFields.forEach((field) => {
      if (body[field] !== undefined) {
        existingClient[field] = body[field];
      }
    });

    // Handle consent forms updates
    if (body.consentForms) {
      if (Array.isArray(body.consentForms)) {
        // Replace entire consent forms array
        existingClient.consentForms = body.consentForms;
      } else if (typeof body.consentForms === "object") {
        // Add a new consent form
        if (!existingClient.consentForms) {
          existingClient.consentForms = [];
        }
        existingClient.consentForms.push({
          type: body.consentForms.type,
          version: body.consentForms.version || "1.0",
          dateSigned: body.consentForms.dateSigned ? new Date(body.consentForms.dateSigned) : null,
          status: body.consentForms.status || "active",
          document: body.consentForms.document,
          electronicSignature: body.consentForms.electronicSignature,
        });
      }
    }

    // Handle billing updates
    if (body.billing) {
      if (!existingClient.billing) {
        existingClient.billing = {
          paymentMethod: "self-pay",
          rate: 0,
          notes: "",
          invoices: [],
        };
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
      if (body.billing.invoices && Array.isArray(body.billing.invoices)) {
        if (!existingClient.billing.invoices) {
          existingClient.billing.invoices = [];
        }
        // Clear existing invoices and replace with new ones
        existingClient.billing.invoices = body.billing.invoices.map((invoice) => ({
          _id: invoice._id || new mongoose.Types.ObjectId(),
          date: new Date(invoice.date),
          amount: invoice.amount,
          status: invoice.status || "pending",
          notes: invoice.notes || "",
          document: invoice.document || null,
          documentKey: invoice.documentKey || null,
        }));
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
        { _id: id, counselorId: user.id },
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

    // Delete client
    const deletedClient = await Client.findOneAndDelete({
      _id: id,
      counselorId: user.id,
    });

    if (!deletedClient) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    // Delete associated sessions sequentially
    await Session.deleteMany({ clientId: id });

    // Delete associated reports sequentially
    await Report.deleteMany({ clientId: id });

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
