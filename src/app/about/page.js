"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-secondary">
      {/* Hero — quiet header, page-body tint provides the calm color, border-b
          separates from the body. No heavy blue band. */}
      <div className="bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            About CogniCare
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-3xl">
            The Cognitive Care Collective. A team of 6 AI agents empowering mental-health
            professionals with AI-driven insights and tools to deliver better care.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Our Mission</h2>
          <p className="mt-3 text-base text-muted-foreground max-w-2xl mx-auto">
            To revolutionize mental-health care by giving professionals advanced AI tools that
            enhance their ability to understand, diagnose, and treat their clients effectively.
          </p>
        </div>
      </div>

      {/* Features Section — white cards on the page tint */}
      <div className="bg-white border-y border-border">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-white p-6">
              <div className="text-primary mb-4">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">AI-Powered Analysis</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Advanced AI algorithms analyze session data to provide insights and identify
                patterns in client behavior and progress.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-white p-6">
              <div className="text-primary mb-4">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Comprehensive Reports</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Generate detailed assessment, diagnostic, treatment, progress, and documentation
                reports with AI assistance.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-white p-6">
              <div className="text-primary mb-4">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Secure by design</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Practice-scoped access controls, encryption-ready storage, and full audit logs.
                HIPAA / BAA coverage rolling out before clinical use.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Benefits for Professionals
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-3 md:grid-cols-2 max-w-4xl mx-auto">
          {[
            "Save time with automated report generation",
            "Streamline documentation and record-keeping",
            "Gain deeper insights into client progress",
            "Improve client outcomes through better tracking",
            "Enhance treatment planning with data-driven insights",
            "Practice-scoped access and audit logs out of the box",
          ].map((text) => (
            <div key={text} className="flex items-start">
              <svg
                className="h-5 w-5 text-primary mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="ml-3 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA — neutral surface, primary button carries the blue */}
      <div className="bg-muted border-t border-border">
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ready to get started?
          </h2>
          <div className="mt-6 flex gap-3 lg:mt-0 lg:flex-shrink-0">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90"
            >
              Get started
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-md text-foreground bg-white border border-border hover:bg-accent/30"
            >
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
