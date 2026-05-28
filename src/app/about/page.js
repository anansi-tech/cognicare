"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Hero & Mission Section — Combined for immediate impact */}
      <section className="bg-secondary/50 border-b border-border">
        <div className="max-w-4xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">About CogniCare</h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto leading-relaxed">
            We are the <strong>Cognitive Care Collective</strong>. Our mission is to revolutionize
            mental health care by empowering professionals with a specialized team of AI agents. We
            build advanced, secure tools that enhance your ability to understand, diagnose, and
            treat clients effectively.
          </p>
        </div>
      </section>

      <main>
        {/* Core Features Section */}
        <section className="max-w-5xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold sm:text-3xl">How We Help</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-primary/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-5 group-hover:bg-primary/20 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">AI-Powered Analysis</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Advanced algorithms analyze session data to provide immediate insights and identify
                crucial patterns in client behavior and progress.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-primary/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-5 group-hover:bg-primary/20 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Comprehensive Reports</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Generate detailed assessment, diagnostic, treatment, and progress documentation
                effortlessly with AI assistance.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-primary/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-5 group-hover:bg-primary/20 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Secure by Design</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Practice-scoped access controls, encryption-ready storage, and full audit logs.
                HIPAA & BAA coverage rolling out prior to clinical use.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-secondary/30 border-y border-border">
          <div className="max-w-4xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold sm:text-3xl">Benefits for Professionals</h2>
              <p className="mt-3 text-muted-foreground">
                Designed to let you focus on what matters most: your clients.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 bg-card rounded-xl border border-border p-8 shadow-sm">
              {[
                "Save hours with automated report generation",
                "Streamline documentation & record-keeping",
                "Gain deeper insights into client progress",
                "Improve client outcomes through better tracking",
                "Enhance treatment planning with data-driven insights",
                "Practice-scoped access & audit logs out of the box",
              ].map((text) => (
                <div key={text} className="flex items-start">
                  <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="ml-3 text-sm text-foreground font-medium">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="bg-background">
          <div className="max-w-5xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ready to transform your practice?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Join the Cognitive Care Collective today.
              </p>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 lg:mt-0 lg:flex-shrink-0">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 transition-colors shadow-sm"
              >
                Get started
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg text-foreground bg-card border border-border hover:bg-secondary/50 transition-colors shadow-sm"
              >
                Contact us
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
