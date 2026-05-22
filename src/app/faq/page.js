"use client";

import { useState } from "react";
import Link from "next/link";

export default function FAQPage() {
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const faqSections = [
    {
      id: "getting-started",
      title: "Getting Started",
      questions: [
        {
          id: "signup",
          question: "How do I sign up for CogniCare?",
          answer:
            "Signing up is easy! Click the 'Sign Up' button in the top right corner of our website. You'll need to provide some basic information and create a password. Once you verify your email, you can start using CogniCare immediately.",
        },
        {
          id: "onboarding",
          question: "What's included in the onboarding process?",
          answer:
            "Our onboarding process includes a guided tour of the platform, setting up your profile, and learning how to use our key features. We'll help you understand how to create client profiles, conduct sessions, and generate reports.",
        },
        {
          id: "requirements",
          question: "What are the system requirements?",
          answer:
            "CogniCare is a web-based platform that works on any modern browser. We recommend using the latest version of Chrome, Firefox, Safari, or Edge. A stable internet connection is required for optimal performance.",
        },
      ],
    },
    {
      id: "features",
      title: "Features & Functionality",
      questions: [
        {
          id: "reports",
          question: "What types of reports can I generate?",
          answer:
            "CogniCare offers five types of reports: Assessment, Diagnostic, Treatment, Progress, and Documentation. Each report type serves a specific purpose in tracking and documenting client care.",
        },
        {
          id: "ai-analysis",
          question: "How does the AI analysis work?",
          answer:
            "Our AI analyzes session data, client history, and treatment progress to provide insights and recommendations. It helps identify patterns, track progress, and suggest treatment adjustments based on evidence-based practices.",
        },
        {
          id: "data-export",
          question: "Can I export my data?",
          answer:
            "Yes, you can export your data in various formats including PDF and CSV. This allows you to maintain records offline or share information with other healthcare providers as needed.",
        },
      ],
    },
    {
      id: "security",
      title: "Security & Privacy",
      questions: [
        {
          id: "data-protection",
          question: "How is my data protected?",
          answer:
            "We use enterprise-grade encryption, secure servers, and regular security audits to protect your data. All information is stored in compliance with healthcare data protection regulations.",
        },
        {
          id: "compliance",
          question: "Is CogniCare HIPAA compliant?",
          answer:
            "Yes, CogniCare is fully HIPAA compliant. We follow all necessary protocols to ensure the security and privacy of protected health information (PHI).",
        },
        {
          id: "access-control",
          question: "How is access to client data controlled?",
          answer:
            "Access to client data is strictly controlled through role-based permissions. Only authorized personnel can view or modify client information, and all access is logged for audit purposes.",
        },
      ],
    },
    {
      id: "billing",
      title: "Billing & Support",
      questions: [
        {
          id: "pricing",
          question: "What are the pricing plans?",
          answer:
            "We offer several pricing tiers to suit different practice sizes and needs. Our plans include Basic, Professional, and Enterprise options. Visit our pricing page for detailed information.",
        },
        {
          id: "payment",
          question: "What payment methods do you accept?",
          answer:
            "We accept all major credit cards and offer annual billing options with discounts. Enterprise customers can also arrange for invoice-based billing.",
        },
        {
          id: "support",
          question: "What support options are available?",
          answer:
            "We provide 24/7 email support, business hours phone support, and a comprehensive knowledge base. Enterprise customers receive dedicated support representatives.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white">
        {/* Hero Section */}
        <div className="relative bg-blue-50">
          <div className="max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-6 text-xl text-gray-500 max-w-3xl">
              Find answers to common questions about CogniCare.
            </p>
          </div>
        </div>

        {/* FAQ Sections */}
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto divide-y-2 divide-gray-200">
            {faqSections.map((section) => (
              <div key={section.id} className="py-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{section.title}</h2>
                <div className="space-y-4">
                  {section.questions.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection(item.id)}
                        className="flex justify-between items-center w-full px-4 py-5 text-left focus:outline-none"
                      >
                        <span className="text-lg font-medium text-gray-900">{item.question}</span>
                        <svg
                          className={`h-6 w-6 text-gray-500 transform transition-transform ${
                            openSections[item.id] ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {openSections[item.id] && (
                        <div className="px-4 pb-5">
                          <p className="text-gray-500">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gray-50">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              <span className="block">Still have questions?</span>
              <span className="block text-blue-600">Contact our support team.</span>
            </h2>
            <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
              <div className="inline-flex rounded-md shadow">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Contact Support
                </Link>
              </div>
              <div className="ml-3 inline-flex rounded-md shadow">
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
