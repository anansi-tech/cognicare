export const features = {
  aiAgents: {
    id: "aiAgents",
    name: "6 AI Agents",
    description: "Access to all 6 AI agents for therapy assistance",
  },
  clientLimit: {
    id: "clientLimit",
    name: "Client Limit",
    description: "Maximum number of clients you can manage",
  },
  fullAccess: {
    id: "fullAccess",
    name: "Full Feature Access",
    description: "Access to all platform features",
  },
  emailSupport: {
    id: "emailSupport",
    name: "Email Support",
    description: "Priority email support",
  },
  sessionNotes: {
    id: "sessionNotes",
    name: "AI Session Notes",
    description: "Automated session note generation",
  },
  treatmentPlanning: {
    id: "treatmentPlanning",
    name: "Treatment Planning",
    description: "AI-assisted treatment planning",
  },
  progressAnalytics: {
    id: "progressAnalytics",
    name: "Progress Analytics",
    description: "AI-powered progress tracking and analytics",
  },
  reporting: {
    id: "reporting",
    name: "Comprehensive Reporting",
    description: "Detailed session and progress reports",
  },
  riskAssessment: {
    id: "riskAssessment",
    name: "Risk Assessment",
    description: "AI-powered risk assessment tools",
  },
  diagnosticTools: {
    id: "diagnosticTools",
    name: "Diagnostic Tools",
    description: "AI-powered diagnostic tools",
  },
  sessionPrep: {
    id: "sessionPrep",
    name: "Session Preparation",
    description: "AI-assisted session preparation",
  },
  hipaaCompliance: {
    id: "hipaaCompliance",
    name: "HIPAA Compliance",
    description: "Fully HIPAA compliant platform",
  },
};

export const plans = {
  trial: {
    id: "trial",
    name: "Free Trial",
    price: 0,
    duration: "14 days",
    features: [
      { ...features.aiAgents, included: true },
      { ...features.clientLimit, included: true, value: 3 },
      { ...features.fullAccess, included: true },
      { ...features.emailSupport, included: true },
      { ...features.hipaaCompliance, included: true },
    ],
    cta: "Start Free Trial",
    description: "Try all features for 14 days",
  },
  paid: {
    id: "paid",
    name: "Single Therapist",
    price: 99,
    duration: "month",
    features: [
      { ...features.aiAgents, included: true },
      { ...features.clientLimit, included: true, value: 25 },
      { ...features.fullAccess, included: true },
      { ...features.emailSupport, included: true },
      { ...features.hipaaCompliance, included: true },
    ],
    cta: "Subscribe Now",
    description: "Perfect for individual practitioners",
    popular: true,
  },
};
