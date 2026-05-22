"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function PaymentCompletePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const response = await fetch(
          `/api/clients/${params.id}/invoices/${params.invoiceId}/verify-payment`
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to verify payment");
        }

        const data = await response.json();
        setInvoice(data.invoice);
        setLoading(false);
      } catch (err) {
        console.error("Error verifying payment:", err);
        setError(err.message || "An error occurred while verifying your payment");
        setLoading(false);
      }
    };

    verifyPayment();
  }, [params.id, params.invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/clients/${params.id}`)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Return to Client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-green-500 text-4xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">
          Thank you for your payment of ${invoice.amount.toFixed(2)}.
        </p>
        <div className="space-y-4">
          <button
            onClick={() => router.push(`/clients/${params.id}`)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Return to Client
          </button>
          <div className="mt-6">
            <a
              href={invoice?.document}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Invoice
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
