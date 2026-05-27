// Plan + feature config shared between landing pricing + the in-app
// /billing surface so the two can't drift again (R19 fix — the old landing
// advertised a defunct $99 / 25-client plan that didn't match billing).
export const features = {
  aiAgents: {
    id: "aiAgents",
    name: "6 AI Agents + LIAM",
    description: "Assessment, diagnostic, treatment, progress, documentation — plus LIAM in-session copilot",
  },
  fullAccess: {
    id: "fullAccess",
    name: "Unlimited clients & sessions",
    description: "No client limit, no session caps",
  },
  emailSupport: {
    id: "emailSupport",
    name: "Email Support",
    description: "Priority email support",
  },
  sessionNotes: {
    id: "sessionNotes",
    name: "AI Session Notes",
    description: "SOAP notes drafted for your review and approval",
  },
  progressAnalytics: {
    id: "progressAnalytics",
    name: "Progress Analytics",
    description: "PHQ-9 / GAD-7 trends with reliable-change detection",
  },
};

export const plans = {
  solo: {
    id: "solo",
    name: "Solo",
    price: 69,
    duration: "month",
    priceEnvVar: "NEXT_PUBLIC_STRIPE_PRICE_SOLO",
    features: [
      { ...features.aiAgents, included: true },
      { ...features.fullAccess, included: true },
      { ...features.sessionNotes, included: true },
      { ...features.progressAnalytics, included: true },
      { ...features.emailSupport, included: true },
    ],
    cta: "Start 14-day free trial",
    description: "For independent therapists.",
    popular: true,
  },
  practice: {
    id: "practice",
    name: "Practice",
    price: 59,
    duration: "month / clinician",
    priceEnvVar: "NEXT_PUBLIC_STRIPE_PRICE_PRACTICE",
    features: [
      { ...features.aiAgents, included: true },
      { ...features.fullAccess, included: true },
      { ...features.sessionNotes, included: true },
      { ...features.progressAnalytics, included: true },
      { ...features.emailSupport, included: true },
    ],
    cta: "Start 14-day free trial",
    description: "For group practices. Billed per clinician.",
  },
};
