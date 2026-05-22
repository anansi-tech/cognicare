"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import SubscriptionStatus from "@/app/components/SubscriptionStatus";
import PricingPlans from "@/app/components/PricingPlans";
import Link from "next/link";

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState(null);
  const [clientCount, setClientCount] = useState(0);
  const [clientLimit, setClientLimit] = useState(3);
  const [upgrading, setUpgrading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const [autoRenew, setAutoRenew] = useState(true);
  // const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!session) return;

      try {
        setError(null);
        // Fetch subscription status
        const subscriptionResponse = await fetch("/api/subscriptions/status");
        if (!subscriptionResponse.ok) {
          throw new Error("Failed to fetch subscription status");
        }
        const subscriptionData = await subscriptionResponse.json();
        setSubscription(subscriptionData);
        //setAutoRenew(subscriptionData.autoRenew);

        // Fetch client count
        const clientsResponse = await fetch("/api/clients");
        if (!clientsResponse.ok) {
          throw new Error("Failed to fetch client count");
        }
        const clientsData = await clientsResponse.json();
        setClientCount(clientsData.length);

        // Set client limit based on subscription tier
        setClientLimit(subscriptionData.tier === "free" ? 3 : 25);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      setError(null);
      const response = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: "paid",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create subscription");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.url) {
        throw new Error("No checkout URL received");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Subscription error:", error);
      setError(error.message);
    } finally {
      setUpgrading(false);
    }
  };

  // const handleToggleAutoRenew = async () => {
  //   try {
  //     setTogglingAutoRenew(true);
  //     const response = await fetch("/api/subscriptions/auto-renew", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({ autoRenew: !autoRenew }),
  //     });

  //     if (!response.ok) {
  //       throw new Error("Failed to update auto-renewal status");
  //     }

  //     setAutoRenew(!autoRenew);
  //     // Refresh subscription data
  //     const subscriptionResponse = await fetch("/api/subscriptions/status");
  //     if (!subscriptionResponse.ok) {
  //       throw new Error("Failed to fetch subscription status");
  //     }
  //     const subscriptionData = await subscriptionResponse.json();
  //     setSubscription(subscriptionData);
  //   } catch (error) {
  //     console.error("Error toggling auto-renewal:", error);
  //     setError(error.message);
  //   } finally {
  //     setTogglingAutoRenew(false);
  //   }
  // };

  const progressPercentage = Math.min((clientCount / clientLimit) * 100, 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <svg
              className="animate-spin h-8 w-8 text-indigo-600"
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
            <span className="ml-2">Loading subscription data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchData();
              }}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Subscription Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your subscription and billing information
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <SubscriptionStatus />
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Client Limit</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Current Clients</span>
              <span className="text-sm font-medium">
                {clientCount}/{clientLimit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {clientCount >= clientLimit
                ? subscription?.tier === "free"
                  ? "You've reached your trial client limit. Upgrade to add more clients."
                  : "You've reached your client limit."
                : subscription?.tier === "free"
                  ? `Upgrade to add up to ${clientLimit} clients.`
                  : `You can add up to ${clientLimit} clients.`}
            </p>
            {subscription?.tier === "free" && (
              <Link
                href="/subscription#pricing"
                className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>

        {/* {subscription?.tier === "paid" && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Auto-Renewal</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {autoRenew
                    ? "Your subscription will automatically renew at the end of the billing period."
                    : "Your subscription will not automatically renew."}
                </p>
              </div>
              <button
                onClick={handleToggleAutoRenew}
                disabled={togglingAutoRenew}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  autoRenew
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                } disabled:opacity-50`}
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
                ) : autoRenew ? (
                  "Turn Off Auto-Renewal"
                ) : (
                  "Turn On Auto-Renewal"
                )}
              </button>
            </div>
          </div>
        )} */}

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h2>
          <PricingPlans
            subscription={subscription}
            onUpgrade={handleUpgrade}
            upgrading={upgrading}
            showUpgradeButton={true}
          />
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Billing History</h2>
          {subscription?.billingHistory && subscription.billingHistory.length > 0 ? (
            <div className="space-y-4">
              {subscription.billingHistory.map((bill, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">${bill.amount}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(bill.date).toLocaleDateString()}
                    </p>
                    {bill.description && (
                      <p className="text-sm text-gray-500">{bill.description}</p>
                    )}
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bill.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : bill.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">
              {subscription?.tier === "paid"
                ? "No billing history available yet."
                : "Your billing history will appear here once you have an active subscription."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
