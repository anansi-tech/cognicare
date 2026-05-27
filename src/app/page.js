"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PricingPlans from "@/app/components/PricingPlans";
import AgentPipeline from "@/app/components/AgentPipeline";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();

  // Authed users on `/` should land in the app, not see marketing layered
  // under the Navbar. Done in an effect so we never call router.replace
  // during render. The previous version disabled this to avoid a redirect
  // chain into /billing; the chain went away once SubscriptionGate stopped
  // bouncing dev-mode and unauthed users (Round 9 / Round 10).
  const isAuthed = status === "authenticated" && !!session?.user?.id;
  useEffect(() => {
    if (isAuthed) router.replace("/dashboard");
  }, [isAuthed, router]);

  if (isAuthed) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  }

  const handleGetStarted = () => {
    if (status === "authenticated") {
      router.push("/dashboard");
    } else {
      router.push("/signup");
    }
  };

  const handleUpgrade = () => {
    // Subscribing happens at /billing now (auth-gated). Send the user there;
    // anonymous visitors go through signup first.
    if (status === "authenticated") router.push("/billing");
    else router.push("/signup");
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-primary">
              CogniCare
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                Log In
              </Link>
              <button
                onClick={handleGetStarted}
                className="bg-primary text-white px-4 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">CogniCare</h1>
        <h2 className="text-2xl text-primary mb-8 font-medium">
          6 AI Agents. One Powerful Team.
        </h2>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
          Meet your team of 6 specialized AI agents, working together to enhance your therapy
          practice.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="bg-white text-primary px-8 py-3 rounded-full font-medium border border-border hover:bg-accent transition-colors"
          >
            Log In
          </Link>
          <button
            onClick={handleGetStarted}
            className="bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors shadow-lg hover:shadow"
          >
            Start 14-day free trial
          </button>
        </div>
      </section>

      {/* Hero — agent pipeline visual (Round 19 replaces the decorative SVG) */}
      <section className="py-12 px-4">
        <div className="max-w-screen-xl mx-auto">
          <AgentPipeline />
        </div>
      </section>

      {/* Agent Roles Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-12">
            How Each Agent Contributes
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-accent hover:bg-accent transition-colors">
                <h3 className="text-xl font-semibold text-primary mb-2">Assessment Agent</h3>
                <p className="text-gray-600">
                  Conducts initial and ongoing assessments, analyzing client responses and behaviors
                  to identify key areas of focus.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-accent hover:bg-accent transition-colors">
                <h3 className="text-xl font-semibold text-primary mb-2">Diagnostic Agent</h3>
                <p className="text-gray-600">
                  Analyzes assessment data to provide diagnostic insights and identify patterns in
                  client symptoms and behaviors.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-accent hover:bg-accent transition-colors">
                <h3 className="text-xl font-semibold text-primary mb-2">Treatment Agent</h3>
                <p className="text-gray-600">
                  Develops personalized treatment plans and suggests evidence-based interventions
                  based on diagnostic insights.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-accent hover:bg-accent transition-colors">
                <h3 className="text-xl font-semibold text-primary mb-2">Progress Agent</h3>
                <p className="text-gray-600">
                  Tracks and analyzes client progress, identifying trends and suggesting adjustments
                  to treatment plans.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-primary hover:bg-accent/80 transition-colors">
                <h3 className="text-xl font-semibold text-primary mb-2">Documentation Agent</h3>
                <p className="text-gray-600">
                  Coordinates with all agents to maintain comprehensive records and easy
                  access to client history.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-accent hover:bg-accent transition-colors">
                <h3 className="text-xl font-semibold text-primary mb-2">LIAM</h3>
                <p className="text-gray-600">
                  In-session AI copilot that answers from this client&apos;s entire record —
                  live support without breaking session flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-12">
            How CogniCare Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-accent transform hover:scale-105 transition-transform">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-6 mx-auto">
                <span className="text-2xl text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center text-primary">
                Record Your Session
              </h3>
              <p className="text-gray-600 text-center">
                Simply record your therapy session or take notes. Our AI will handle the rest,
                capturing all the important details.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-accent transform hover:scale-105 transition-transform">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-6 mx-auto">
                <span className="text-2xl text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center text-primary">
                Get AI Insights
              </h3>
              <p className="text-gray-600 text-center">
                Our AI analyzes the session and provides you with key insights, treatment
                suggestions, and progress tracking.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-accent transform hover:scale-105 transition-transform">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-6 mx-auto">
                <span className="text-2xl text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center text-primary">
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
          <h2 className="text-3xl font-bold text-center text-primary mb-12">
            Why Therapists Love CogniCare
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-primary"
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
              <h3 className="text-xl font-semibold mb-2 text-primary">Smart Documentation</h3>
              <p className="text-gray-600">
                Save 5+ hours per week on paperwork. Our AI handles the boring stuff so you can
                focus on your clients.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-primary"
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
              <h3 className="text-xl font-semibold mb-2 text-primary">Progress Tracking</h3>
              <p className="text-gray-600">
                Beautiful charts and insights help you track client progress and celebrate their
                wins.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-primary"
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
              <h3 className="text-xl font-semibold mb-2 text-primary">Treatment Planning</h3>
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
          <h2 className="text-3xl font-bold text-center text-primary mb-12">
            Everything You Need in One Place with CogniCare
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary"
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
                  <h3 className="text-lg font-semibold text-primary">AI Session Notes</h3>
                  <p className="text-gray-600">
                    No more late nights writing notes. Our AI captures everything important from
                    your sessions.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary"
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
                  <h3 className="text-lg font-semibold text-primary">Treatment Planning</h3>
                  <p className="text-gray-600">
                    Get personalized treatment suggestions based on evidence-based practices.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary"
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
                  <h3 className="text-lg font-semibold text-primary">Progress Analytics</h3>
                  <p className="text-gray-600">
                    Beautiful charts and insights to track client progress and celebrate their wins.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary"
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
                  <h3 className="text-lg font-semibold text-primary">Comprehensive Reporting</h3>
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
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary"
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
                  <h3 className="text-lg font-semibold text-primary">Risk Assessment</h3>
                  <p className="text-gray-600">
                    AI-powered tools to help you identify and monitor client risk factors.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary"
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
                  <h3 className="text-lg font-semibold text-primary">Session Prep</h3>
                  <p className="text-gray-600">
                    Get personalized recommendations and focus areas for each session.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary"
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
                  <h3 className="text-lg font-semibold text-primary">Secure by design</h3>
                  <p className="text-gray-600">
                    Practice-scoped access controls, encryption-ready storage, and full
                    audit logs. (Full HIPAA / BAA coverage rolling out before clinical use.)
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary"
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
                  <h3 className="text-lg font-semibold text-primary">Diagnostic Insights</h3>
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
              subscription={null}
              onUpgrade={handleUpgrade}
              upgrading={false}
              showUpgradeButton={true}
              showGetStartedButton={!session}
              onGetStarted={handleGetStarted}
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-20 px-4 text-center bg-primary text-white">
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
              className="bg-white text-primary px-8 py-3 rounded-full font-medium hover:bg-accent transition-colors shadow-lg"
            >
              Start 14-day free trial
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-accent">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">CogniCare</h3>
              <p className="text-gray-600">
                Helping therapists focus on what matters most — their clients.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#features" className="text-gray-600 hover:text-primary/80">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-gray-600 hover:text-primary/80">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-primary">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-primary/80">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-600 hover:text-primary/80">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-gray-600">
            <p>© {new Date().getFullYear()} CogniCare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
