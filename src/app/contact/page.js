"use client";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-secondary">
      {/* Hero — same quiet treatment as /about. Page tint + thin divider. */}
      <div className="bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Contact Us
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-3xl">
            Have questions or need assistance? We&apos;re here to help.
          </p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Get in touch</h2>
        <p className="mt-3 text-base text-muted-foreground max-w-2xl">
          We&apos;re here to help with any questions you might have about CogniCare.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 max-w-4xl">
          <div className="rounded-lg border border-border bg-white p-5">
            <div className="flex items-start gap-3">
              <svg
                className="h-6 w-6 text-primary flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-foreground">Email</p>
                <p className="mt-0.5 text-sm text-muted-foreground">cognicare@anansi.xyz</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-5">
            <div className="flex items-start gap-3">
              <svg
                className="h-6 w-6 text-primary flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-foreground">Phone</p>
                <p className="mt-0.5 text-sm text-muted-foreground">+1 (555) 123-4567</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-5">
            <div className="flex items-start gap-3">
              <svg
                className="h-6 w-6 text-primary flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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
              <div>
                <p className="text-sm font-semibold text-foreground">Office</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  123 Healthcare Way
                  <br />
                  San Francisco, CA 94107
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-sm text-muted-foreground max-w-2xl">
          <p className="font-medium text-foreground">Business hours</p>
          <p className="mt-1">
            Monday – Friday: 9:00 AM – 5:00 PM PST
            <br />
            Saturday – Sunday: Closed
          </p>
        </div>
      </div>

      {/* FAQ Section — white surface for content cards */}
      <div className="bg-white border-y border-border">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              A few common ones below — if your question isn&apos;t answered, send us a note.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 max-w-5xl mx-auto">
            <div className="rounded-lg border border-border p-5">
              <h3 className="text-base font-semibold text-foreground">How do I get started?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign up for an account and follow the onboarding flow. You&apos;ll be up and
                running in a few minutes.
              </p>
            </div>

            <div className="rounded-lg border border-border p-5">
              <h3 className="text-base font-semibold text-foreground">
                What are your pricing plans?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Two plans: Solo at $69/mo for independent therapists, Practice at $59/mo per
                clinician for group practices. Both include a 14-day free trial.
              </p>
            </div>

            <div className="rounded-lg border border-border p-5">
              <h3 className="text-base font-semibold text-foreground">Is my data secure?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Practice-scoped access controls, encryption-ready storage, and full audit logs.
                HIPAA / BAA coverage is rolling out before clinical use — synthetic / test data
                only until then.
              </p>
            </div>

            <div className="rounded-lg border border-border p-5">
              <h3 className="text-base font-semibold text-foreground">Do you offer support?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Yes — email and in-app support. Send us a note at the address above and we&apos;ll
                get back to you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
