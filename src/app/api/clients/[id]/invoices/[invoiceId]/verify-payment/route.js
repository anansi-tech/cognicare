import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";

export async function GET(request, { params }) {
  try {
    const { id, invoiceId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Call the status endpoint to update the invoice and regenerate PDF
    const statusResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/clients/${id}/invoices/${invoiceId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: request.headers.get("cookie"),
        },
        body: JSON.stringify({
          status: "paid",
          paymentDate: new Date().toISOString(),
          paymentMethod: "credit",
        }),
      }
    );

    if (!statusResponse.ok) {
      const error = await statusResponse.json();
      throw new Error(error.message || "Failed to update invoice status");
    }

    const { invoice } = await statusResponse.json();
    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { message: error.message || "Error verifying payment" },
      { status: 500 }
    );
  }
}
