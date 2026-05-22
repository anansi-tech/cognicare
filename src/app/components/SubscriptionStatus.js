"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SubscriptionStatus({ isDashboard = false }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);
  const { data: session } = useSession();

  const fetchSubscription = async () => {
    if (!session) return;

    try {
      setError(null);
      const response = await fetch("/api/subscriptions/status");
      if (!response.ok) {
        throw new Error("Failed to fetch subscription status");
      }
      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [session]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;

    try {
      setCancelling(true);
      setError(null);
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel subscription");
      }

      // Get updated subscription from response and update state directly
      const updatedSubscription = await response.json();
      setSubscription(updatedSubscription);

      toast.success("Subscription cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error(error.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    // Store the current autoRenew state to display the correct toast message later
    const currentAutoRenewState = subscription?.autoRenew;

    try {
      setTogglingAutoRenew(true);
      setError(null);
      const response = await fetch("/api/subscriptions/auto-renew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ autoRenew: !currentAutoRenewState }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update auto-renewal status");
      }

      // Get updated subscription from response and update state directly
      const updatedSubscription = await response.json();
      setSubscription(updatedSubscription);

      // Use the state *before* the update for the toast message logic
      toast.success(`Auto-renewal ${currentAutoRenewState ? "disabled" : "enabled"} successfully!`);
    } catch (error) {
      console.error("Error toggling auto-renewal:", error);
      toast.error(error.message);
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  if (!session) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-yellow-800">Please sign in to view subscription status</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <svg
          className="animate-spin h-5 w-5 text-indigo-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span className="ml-2">Loading subscription status...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchSubscription();
          }}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Full version for subscription page
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Subscription Status</h2>
      {subscription ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-gray-600">Current Plan</p>
              <p className="text-lg font-medium">
                {subscription.tier === "free" ? "Free Trial" : "Single Therapist"}
              </p>
              <p className="text-sm text-gray-500">
                {subscription.tier === "free" ? "3 clients" : "25 clients"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600">Status</p>
              <p className="text-lg font-medium capitalize">{subscription.status}</p>
              <p className="text-sm text-gray-500">
                {subscription.autoRenew ? "Auto-renewing" : "Not auto-renewing"}
              </p>
              {subscription.status === "active" && (
                <button
                  onClick={handleToggleAutoRenew}
                  disabled={togglingAutoRenew}
                  className={`mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                    subscription.autoRenew
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {togglingAutoRenew ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Updating...
                    </span>
                  ) : subscription.autoRenew ? (
                    "Turn Off Auto-Renewal"
                  ) : (
                    "Turn On Auto-Renewal"
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-gray-600">Subscription ID</p>
            <p className="text-sm font-mono">{subscription.stripeSubscriptionId || "N/A"}</p>
            <p className="text-gray-600 mt-2">Customer ID</p>
            <p className="text-sm font-mono">{subscription.stripeCustomerId || "N/A"}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-gray-600">Start Date</p>
              <p className="text-sm">{new Date(subscription.startDate).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600">
                {subscription.status === "active" ? "Next Billing Date" : "End Date"}
              </p>
              <p className="text-sm">
                {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>

          {subscription.status === "active" && (
            <div className="pt-4">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-red-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Cancelling...
                  </span>
                ) : (
                  "Cancel Subscription"
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">No active subscription</p>
          <Link
            href="/subscription"
            className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            View Pricing Plans
          </Link>
        </div>
      )}
    </div>
  );
}
