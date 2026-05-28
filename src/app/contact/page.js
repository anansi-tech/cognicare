"use client";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Header Section — Merged intro to remove redundancy, scaled down typography */}
      <section className="bg-secondary/50 border-b border-border">
        <div className="max-w-3xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact Us</h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Have questions about CogniCare? We&apos;re here to help. The fastest way to reach us is
            by email — we usually reply the same day on weekdays.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main>
        <section className="max-w-5xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8">
          {/* Emergency Alert Box */}
          <div className="mb-10 max-w-3xl mx-auto flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-sm">
            <svg
              className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm leading-relaxed">
              <strong>CogniCare support is not an emergency service.</strong> If you or someone else
              is in immediate danger, call <strong>911</strong>. For 24/7 emotional crisis support
              in the U.S., call or text <strong>988</strong>.
            </p>
          </div>

          {/* Contact Cards Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
            {/* Email Card (Interactive) */}
            <a
              href="mailto:cognicare@anansi.xyz"
              className="group flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-primary/40"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-base font-semibold">Email Support</h2>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Drop us a line anytime.</p>
                <p className="text-sm font-medium text-primary">cognicare@anansi.xyz</p>
              </div>
            </a>

            {/* Mailing Address Card (Static) */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-base font-semibold">Mailing Address</h2>
              </div>
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  1000 Brickell Ave, Ste 715
                  <br />
                  PMB 2209
                  <br />
                  Miami, FL 33131
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-secondary/30 border-t border-border">
          <div className="max-w-5xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              {/* Scaled down to match the quieter tone */}
              <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
                A few common questions to get you started. If you don&apos;t see your answer here,
                feel free to reach out.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* FAQ 1 */}
              <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <h3 className="text-base font-semibold">How do I get started?</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Sign up for an account and follow the interactive onboarding flow. You&apos;ll be
                  up and running in just a few minutes.
                </p>
              </div>

              {/* FAQ 2 */}
              <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <h3 className="text-base font-semibold">What are your pricing plans?</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  We offer a <strong>Solo</strong> plan at $69/mo for independent therapists, and a{" "}
                  <strong>Practice</strong> plan at $59/mo per clinician for groups. Both include a
                  14-day free trial.
                </p>
              </div>

              {/* FAQ 3 */}
              <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <h3 className="text-base font-semibold">Is my data secure?</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  We enforce practice-scoped access controls, encryption-ready storage, and full
                  audit logs. HIPAA / BAA coverage is rolling out before clinical use (synthetic
                  data only until then).
                </p>
                <a
                  href="/about"
                  className="inline-flex items-center mt-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  See security overview
                  <svg
                    className="ml-1 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
              </div>

              {/* FAQ 4 */}
              <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <h3 className="text-base font-semibold">Do you offer live support?</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Yes, we offer both email and in-app support. Send us a note at the address above
                  and our team will get back to you promptly.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
