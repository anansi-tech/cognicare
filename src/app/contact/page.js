"use client";

import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white">
        {/* Hero Section */}
        <div className="relative bg-blue-50">
          <div className="max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Contact Us
            </h1>
            <p className="mt-6 text-xl text-gray-500 max-w-3xl">
              Have questions or need assistance? We're here to help.
            </p>
          </div>
        </div>

        {/* Contact Form Section */}
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Get in Touch</h2>
              <p className="mt-4 text-lg text-gray-500">
                We're here to help with any questions you might have about CogniCare.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-blue-600"
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
                  </div>
                  <div className="ml-3">
                    <p className="text-lg font-medium text-gray-900">Email</p>
                    <p className="mt-1 text-gray-500">support@cognicare.com</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-blue-600"
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
                  </div>
                  <div className="ml-3">
                    <p className="text-lg font-medium text-gray-900">Phone</p>
                    <p className="mt-1 text-gray-500">+1 (555) 123-4567</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-blue-600"
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
                  </div>
                  <div className="ml-3">
                    <p className="text-lg font-medium text-gray-900">Office</p>
                    <p className="mt-1 text-gray-500">
                      123 Healthcare Way
                      <br />
                      San Francisco, CA 94107
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <h3 className="text-lg font-medium text-gray-900">Business Hours</h3>
                <p className="mt-2 text-gray-500">
                  Monday - Friday: 9:00 AM - 5:00 PM PST
                  <br />
                  Saturday - Sunday: Closed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-gray-50">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Can't find what you're looking for? Check our FAQ section.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-medium text-gray-900">How do I get started?</h3>
                <p className="mt-2 text-gray-500">
                  Getting started is easy! Simply sign up for an account and follow our onboarding
                  process. You'll be up and running in no time.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">What are your pricing plans?</h3>
                <p className="mt-2 text-gray-500">
                  We offer flexible pricing plans to suit your needs. Visit our pricing page for
                  detailed information about our subscription options.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">Is my data secure?</h3>
                <p className="mt-2 text-gray-500">
                  Yes, we take data security very seriously. Our platform uses enterprise-grade
                  security measures to protect your information.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">Do you offer support?</h3>
                <p className="mt-2 text-gray-500">
                  Yes, we provide comprehensive support through email, phone, and our help center.
                  Our team is always ready to assist you.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link href="/faq" className="text-blue-600 hover:text-blue-500 font-medium">
                View all FAQs →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
