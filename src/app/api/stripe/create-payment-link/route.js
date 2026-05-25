import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import Client from "@/models/client";
import Invoice from "@/models/invoice";
import { connectDB } from "@/lib/mongodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    console.log("Creating Stripe payment link");
    const user = await getCurrentUser();
    if (!user) {
      console.log("Unauthorized: No user found");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { clientId, invoiceId, amount, description } = await req.json();
    console.log("Payment link request data:", { clientId, invoiceId, amount, description });

    await connectDB();

    // Verify client visibility (assignment-scoped)
    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: clientId, ...scope });
    if (!client) {
      console.log("Client not found:", clientId);
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    console.log("Creating Stripe payment link with amount:", amount);

    // First create a price
    const price = await stripe.prices.create({
      currency: "usd",
      product_data: {
        name: description || "Therapy Session Invoice",
      },
      unit_amount: amount * 100, // Convert to cents
    });

    // Then create the payment link using the price ID
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      after_completion: {
        type: "redirect",
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/clients/${clientId}/invoices/${invoiceId}/payment-complete`,
        },
      },
      metadata: {
        clientId,
        invoiceId,
        practiceId: String(user.practiceId ?? ""),
        counselorId: user.id,
      },
    });

    console.log("Stripe payment link created:", paymentLink.url);

    // Persist the link on the Invoice doc so reminders + UI can surface it.
    if (invoiceId) {
      await Invoice.updateOne(
        { _id: invoiceId, clientId, practiceId: client.practiceId },
        { $set: { paymentLink: paymentLink.url } }
      );
    }

    return NextResponse.json({ paymentLink: paymentLink.url });
  } catch (error) {
    console.error("Error creating payment link:", error);
    return NextResponse.json({ message: "Error creating payment link" }, { status: 500 });
  }
}
