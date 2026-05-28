"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PricingPlans from "@/app/components/PricingPlans";
import { Brand } from "@/components/Brand";

export default function LandingPage() {
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
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
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
      {/* Hero Section */}
      <section className="py-16 sm:py-20 px-4 text-center">
        <h1 className="mb-4">
          <Brand className="text-6xl font-bold" />
        </h1>
        <h2 className="text-2xl text-foreground/80 mb-8 font-medium">
          6 AI Agents. One Powerful Team.
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Meet your team of 6 specialized AI agents, working together to enhance your therapy
          practice.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="bg-white text-primary px-8 py-3 rounded-full font-medium border border-border hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
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

      {/* Hero — the canonical agent-pipeline illustration. The image's own
          light-blue backdrop matches --muted, so we let it blend with the
          page surround instead of framing it in a hard white card. */}
      <section className="py-8 px-4">
        <div className="max-w-screen-xl mx-auto">
          <div className="rounded-3xl shadow-sm overflow-hidden">
            <Image
              src="/hero2.png"
              alt="How CogniCare works — five specialists, one workflow: Assessment → Diagnostic → Treatment → Progress → Documentation, with LIAM as the in-session copilot."
              width={1600}
              height={900}
              className="w-full h-auto block"
              priority
            />
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Why therapists love it
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-accent-foreground"
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
              <p className="text-muted-foreground">
                Save 5+ hours per week on paperwork. Our AI handles the boring stuff so you can
                focus on your clients.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-accent-foreground"
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
              <p className="text-muted-foreground">
                Beautiful charts and insights help you track client progress and celebrate their
                wins.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-accent-foreground"
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
              <p className="text-muted-foreground">
                Get AI-powered treatment suggestions and goal tracking to help your clients succeed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Everything you need in one place
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-accent-foreground"
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
                  <p className="text-muted-foreground">
                    No more late nights writing notes. Our AI captures everything important from
                    your sessions.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-accent-foreground"
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
                  <p className="text-muted-foreground">
                    Get personalized treatment suggestions based on evidence-based practices.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-accent-foreground"
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
                  <p className="text-muted-foreground">
                    Beautiful charts and insights to track client progress and celebrate their wins.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-accent-foreground"
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
                  <p className="text-muted-foreground">
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
                      className="w-4 h-4 text-accent-foreground"
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
                  <p className="text-muted-foreground">
                    AI-powered tools to help you identify and monitor client risk factors.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-accent-foreground"
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
                  <p className="text-muted-foreground">
                    Get personalized recommendations and focus areas for each session.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-accent-foreground"
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
                  <p className="text-muted-foreground">
                    Practice-scoped access controls, encryption-ready storage, and full audit logs.
                    (Full HIPAA / BAA coverage rolling out before clinical use.)
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-accent-foreground"
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
                  <p className="text-muted-foreground">
                    Get diagnostic insights to help you understand your clients needs better.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <div id="pricing" className="py-16 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Simple, Fair Pricing
            </h2>
            <p className="mt-4 text-xl text-muted-foreground">
              Choose the plan that works best for you
            </p>
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
          <h2 className="text-3xl font-bold mb-6">Ready to transform your practice?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join therapists using CogniCare to streamline their work and improve client outcomes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="bg-white text-primary px-8 py-3 rounded-full font-medium hover:bg-accent hover:text-accent-foreground transition-colors shadow-lg"
            >
              Start 14-day free trial
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted border-t border-border">
        <div className="max-w-screen-xl mx-auto px-4 pt-12 pb-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">CogniCare</h3>
              <p className="text-sm text-muted-foreground">
                Helping therapists focus on what matters most — their clients.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#features" className="text-muted-foreground hover:text-primary">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-muted-foreground hover:text-primary">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-muted-foreground hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground hover:text-primary">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* Copyright bottom bar — its own row, edge-to-edge divider above. */}
        <div className="border-t border-border">
          <div className="max-w-screen-xl mx-auto px-4 py-4 text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} CogniCare. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
