"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PricingPlans from "@/app/components/PricingPlans";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/subscriptions/status")
        .then((res) => res.json())
        .then((data) => {
          setSubscription(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching subscription:", error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleGetStarted = () => {
    if (status === "authenticated") {
      router.push("/dashboard");
    } else {
      router.push("/signup");
    }
  };

  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      const response = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: "paid",
        }),
      });

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
      alert(error.message);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-indigo-900">
              CogniCare
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
                Log In
              </Link>
              <button
                onClick={handleGetStarted}
                className="bg-indigo-600 text-white px-4 py-2 rounded-full font-medium hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <h1 className="text-6xl font-bold text-indigo-900 mb-4">CogniCare</h1>
        <h2 className="text-2xl text-indigo-700 mb-8 font-medium">
          6 AI Agents. One Powerful Team.
        </h2>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
          Meet your team of 6 specialized AI agents, working together to enhance your therapy
          practice.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="bg-white text-indigo-600 px-8 py-3 rounded-full font-medium border border-indigo-200 hover:bg-indigo-50 transition-colors"
          >
            Log In
          </Link>
          <button
            onClick={handleGetStarted}
            className="bg-indigo-600 text-white px-8 py-3 rounded-full font-medium hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-200"
          >
            Start Free Trial
          </button>
        </div>
      </section>

      {/* Hero Image Section */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h3 className="text-3xl font-bold text-indigo-900">The CogniCare AI Team</h3>
                <p className="text-lg text-gray-700">
                  Our team of 6 specialized AI agents in the CogniCare platform works together
                  seamlessly to provide comprehensive support for your practice.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center group">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                    <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">
                      Assessment Agent
                    </span>
                  </div>
                  <div className="flex items-center group">
                    <div className="w-3 h-3 bg-blue-600 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                    <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                      Diagnostic Agent
                    </span>
                  </div>
                  <div className="flex items-center group">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                    <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">
                      Treatment Agent
                    </span>
                  </div>
                  <div className="flex items-center group">
                    <div className="w-3 h-3 bg-blue-600 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                    <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                      Progress Agent
                    </span>
                  </div>
                  <div className="flex items-center group">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                    <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">
                      Documentation Agent
                    </span>
                  </div>
                  <div className="flex items-center group">
                    <div className="w-3 h-3 bg-blue-600 rounded-full mr-2 group-hover:scale-125 transition-transform"></div>
                    <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                      Conversational Agent
                    </span>
                  </div>
                </div>
              </div>
              <div className="relative">
                {/* AI Team Illustration */}
                <div className="relative w-full h-[300px]">
                  {/* Main Team Circle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg width="200" height="200" viewBox="0 0 200 200" className="text-indigo-600">
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="currentColor"
                        fillOpacity="0.1"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      {/* Connecting Lines with Natural Flow Animation */}
                      <line
                        x1="100"
                        y1="20"
                        x2="100"
                        y2="180"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="flow-line"
                      >
                        <animate
                          attributeName="stroke-dasharray"
                          values="0,200;200,0"
                          dur="4s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="stroke-width"
                          values="2;3;2"
                          dur="4s"
                          repeatCount="indefinite"
                        />
                      </line>
                      <line
                        x1="20"
                        y1="100"
                        x2="180"
                        y2="100"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="flow-line"
                      >
                        <animate
                          attributeName="stroke-dasharray"
                          values="0,200;200,0"
                          dur="4s"
                          repeatCount="indefinite"
                          begin="1s"
                        />
                        <animate
                          attributeName="stroke-width"
                          values="2;3;2"
                          dur="4s"
                          repeatCount="indefinite"
                          begin="1s"
                        />
                      </line>
                      <line
                        x1="40"
                        y1="40"
                        x2="160"
                        y2="160"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="flow-line"
                      >
                        <animate
                          attributeName="stroke-dasharray"
                          values="0,200;200,0"
                          dur="4s"
                          repeatCount="indefinite"
                          begin="2s"
                        />
                        <animate
                          attributeName="stroke-width"
                          values="2;3;2"
                          dur="4s"
                          repeatCount="indefinite"
                          begin="2s"
                        />
                      </line>
                      <line
                        x1="160"
                        y1="40"
                        x2="40"
                        y2="160"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="flow-line"
                      >
                        <animate
                          attributeName="stroke-dasharray"
                          values="0,200;200,0"
                          dur="4s"
                          repeatCount="indefinite"
                          begin="3s"
                        />
                        <animate
                          attributeName="stroke-width"
                          values="2;3;2"
                          dur="4s"
                          repeatCount="indefinite"
                          begin="3s"
                        />
                      </line>
                    </svg>
                  </div>

                  {/* AI Agent Icons with Human-like Interaction */}
                  {/* AI Agent Icons with Sequential Highlight */}
                  <div className="absolute top-1/4 left-1/4 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center animate-float group hover:bg-indigo-200 transition-colors">
                    <svg
                      className="w-5 h-5 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="pulse-ring"
                    >
                      <animate
                        attributeName="r"
                        values="45%;60%;45%"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="1;0;1"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </div>
                  <div className="absolute top-1/4 right-1/4 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center animate-float-delay group hover:bg-indigo-200 transition-colors">
                    <svg
                      className="w-5 h-5 text-indigo-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="pulse-ring"
                    >
                      <animate
                        attributeName="r"
                        values="45%;60%;45%"
                        dur="2s"
                        repeatCount="indefinite"
                        begin="0.5s"
                      />
                      <animate
                        attributeName="opacity"
                        values="1;0;1"
                        dur="2s"
                        repeatCount="indefinite"
                        begin="0.5s"
                      />
                    </circle>
                  </div>
                  <div className="absolute bottom-1/4 left-1/4 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center animate-float-delay-2 group hover:bg-indigo-200 transition-colors">
                    <svg
                      className="w-5 h-5 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="pulse-ring"
                    >
                      <animate
                        attributeName="r"
                        values="45%;60%;45%"
                        dur="2s"
                        repeatCount="indefinite"
                        begin="1s"
                      />
                      <animate
                        attributeName="opacity"
                        values="1;0;1"
                        dur="2s"
                        repeatCount="indefinite"
                        begin="1s"
                      />
                    </circle>
                  </div>
                  <div className="absolute bottom-1/4 right-1/4 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center animate-float group hover:bg-indigo-200 transition-colors">
                    <svg
                      className="w-5 h-5 text-indigo-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="pulse-ring"
                    >
                      <animate
                        attributeName="r"
                        values="45%;60%;45%"
                        dur="2s"
                        repeatCount="indefinite"
                        begin="1.5s"
                      />
                      <animate
                        attributeName="opacity"
                        values="1;0;1"
                        dur="2s"
                        repeatCount="indefinite"
                        begin="1.5s"
                      />
                    </circle>
                  </div>
                  <div className="absolute top-1/2 left-1/2 w-12 h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center animate-float-delay group hover:scale-110 transition-transform">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      className="pulse-ring"
                    >
                      <animate
                        attributeName="r"
                        values="45%;70%;45%"
                        dur="2s"
                        repeatCount="indefinite"
                        begin="2s"
                      />
                      <animate
                        attributeName="opacity"
                        values="1;0;1"
                        dur="2s"
                        repeatCount="indefinite"
                        begin="2s"
                      />
                    </circle>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Roles Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-indigo-900 mb-12">
            How Each Agent Contributes
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Assessment Agent</h3>
                <p className="text-gray-600">
                  Conducts initial and ongoing assessments, analyzing client responses and behaviors
                  to identify key areas of focus.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Diagnostic Agent</h3>
                <p className="text-gray-600">
                  Analyzes assessment data to provide diagnostic insights and identify patterns in
                  client symptoms and behaviors.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Treatment Agent</h3>
                <p className="text-gray-600">
                  Develops personalized treatment plans and suggests evidence-based interventions
                  based on diagnostic insights.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Progress Agent</h3>
                <p className="text-gray-600">
                  Tracks and analyzes client progress, identifying trends and suggesting adjustments
                  to treatment plans.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 transition-colors">
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Documentation Agent</h3>
                <p className="text-gray-600">
                  Coordinates with all agents to maintain comprehensive records, ensuring HIPAA
                  compliance and easy access to client history.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Conversational Agent</h3>
                <p className="text-gray-600">
                  Real-time AI chat assistant that provides live support during therapy
                  sessions,without breaking session flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-indigo-900 mb-12">
            How CogniCare Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-indigo-50 transform hover:scale-105 transition-transform">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <span className="text-2xl text-indigo-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center text-indigo-900">
                Record Your Session
              </h3>
              <p className="text-gray-600 text-center">
                Simply record your therapy session or take notes. Our AI will handle the rest,
                capturing all the important details.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-indigo-50 transform hover:scale-105 transition-transform">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <span className="text-2xl text-indigo-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center text-indigo-900">
                Get AI Insights
              </h3>
              <p className="text-gray-600 text-center">
                Our AI analyzes the session and provides you with key insights, treatment
                suggestions, and progress tracking.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-indigo-50 transform hover:scale-105 transition-transform">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <span className="text-2xl text-indigo-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center text-indigo-900">
                Focus on Therapy
              </h3>
              <p className="text-gray-600 text-center">
                Spend less time on paperwork and more time helping your clients. All your
                documentation is automatically organized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-indigo-900 mb-12">
            Why Therapists Love CogniCare
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-indigo-900">Smart Documentation</h3>
              <p className="text-gray-600">
                Save 5+ hours per week on paperwork. Our AI handles the boring stuff so you can
                focus on your clients.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-indigo-900">Progress Tracking</h3>
              <p className="text-gray-600">
                Beautiful charts and insights help you track client progress and celebrate their
                wins.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-indigo-900">Treatment Planning</h3>
              <p className="text-gray-600">
                Get AI-powered treatment suggestions and goal tracking to help your clients succeed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-indigo-900 mb-12">
            Everything You Need in One Place with CogniCare
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-indigo-900">AI Session Notes</h3>
                  <p className="text-gray-600">
                    No more late nights writing notes. Our AI captures everything important from
                    your sessions.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-indigo-900">Treatment Planning</h3>
                  <p className="text-gray-600">
                    Get personalized treatment suggestions based on evidence-based practices.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-indigo-900">Progress Analytics</h3>
                  <p className="text-gray-600">
                    Beautiful charts and insights to track client progress and celebrate their wins.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-indigo-900">Comprehensive Reporting</h3>
                  <p className="text-gray-600">
                    Generate detailed reports for insurance, supervision, and client progress
                    tracking. Export in multiple formats with custom branding.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-indigo-900">Risk Assessment</h3>
                  <p className="text-gray-600">
                    AI-powered tools to help you identify and monitor client risk factors.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-indigo-900">Session Prep</h3>
                  <p className="text-gray-600">
                    Get personalized recommendations and focus areas for each session.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-indigo-900">HIPAA Compliant</h3>
                  <p className="text-gray-600">
                    Your client&apos;s data is always safe and secure with enterprise-grade
                    protection.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-indigo-900">Diagnostic Insights</h3>
                  <p className="text-gray-600">
                    Get diagnostic insights to help you understand your clients needs better.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <div id="pricing" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Simple, Fair Pricing
            </h2>
            <p className="mt-4 text-xl text-gray-600">Choose the plan that works best for you</p>
          </div>
          <div className="mt-12">
            <PricingPlans
              subscription={subscription}
              onUpgrade={handleUpgrade}
              upgrading={upgrading}
              showUpgradeButton={true}
              showGetStartedButton={!session}
              onGetStarted={handleGetStarted}
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Transform Your Practice with CogniCare?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of therapists who are using CogniCare to enhance their practice and
            improve client outcomes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="bg-white text-indigo-600 px-8 py-3 rounded-full font-medium hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-indigo-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-indigo-900">CogniCare</h3>
              <p className="text-gray-600">
                Helping therapists focus on what matters most - their clients.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-indigo-900">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#features" className="text-gray-600 hover:text-indigo-500">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/demo" className="text-gray-600 hover:text-indigo-500">
                    Demo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-indigo-900">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/blog" className="text-gray-600 hover:text-teal-500">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-gray-600 hover:text-teal-500">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="text-gray-600 hover:text-teal-500">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-teal-800">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-teal-500">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-gray-600 hover:text-teal-500">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-600 hover:text-teal-500">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-600">
            <p>© 2025 CogniCare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
