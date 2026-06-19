const consentFormTemplates = {
  general: {
    version: "2.0",
    title: "General Therapy Consent Form",
    content: `
# General Therapy Consent Form

## Introduction
This document outlines the terms of our therapeutic relationship and your rights as a client.

## Confidentiality
All information shared in therapy is confidential, with the following exceptions:
- Risk of harm to self or others
- Suspected child or elder abuse
- Court orders

## Treatment Approach
Our therapy sessions will utilize evidence-based approaches tailored to your needs.

## Use of Artificial Intelligence in Your Care
This practice uses AI-assisted software to support your care. Information you provide — including
intake details, session notes, and assessment responses — may be processed by AI tools to help your
clinician with tasks such as preparing assessments, suggesting diagnostic considerations, drafting
treatment plans, tracking your progress, and preparing documentation.

Please understand:
- **Your clinician remains in control.** AI output is decision *support* only. Your licensed clinician
  reviews, edits, and approves all clinical content. AI does not make diagnostic or treatment
  decisions, and nothing becomes part of your record without your clinician's approval.
- **How your data is handled.** Your information is processed by a third-party AI provider under a
  business agreement that prohibits using your data to train their models and requires appropriate
  safeguards. Data is encrypted and access is limited to your care team.
- **It does not replace your therapist.** The AI assists your clinician; it is not a substitute for
  professional judgment or the therapeutic relationship.
- **Your choice.** You may ask questions about how AI is used in your care at any time. If you have
  concerns about AI-assisted processing, discuss them with your clinician.

## Fees and Payment
- Session fee: [RATE]
- Payment is due at the time of service
- 24-hour cancellation policy applies

## Electronic Communication
- Email communication is not encrypted
- Emergency contact should be made by phone

## Your Rights
You have the right to:
- Ask questions about treatment
- Request changes to treatment
- Terminate therapy at any time

## Agreement
By signing below, you acknowledge that you have read and understand this consent form, including the
use of AI-assisted software described above.
    `,
  },
  telehealth: {
    version: "2.0",
    title: "Telehealth Consent Form",
    content: `
# Telehealth Consent Form

## Introduction
This form outlines the terms of our telehealth sessions and your rights.

## Technology Requirements
- Stable internet connection
- Private, quiet space
- Video/audio capabilities

## Privacy Considerations
- Use secure, private internet connection
- Ensure no one else can hear/see sessions
- Close other applications during sessions

## Use of Artificial Intelligence in Your Care
This practice uses AI-assisted software to support your care. Information you provide — including
intake details, session notes, and assessment responses — may be processed by AI tools to help your
clinician prepare assessments, consider diagnoses, draft treatment plans, track progress, and prepare
documentation.

Please understand:
- **Your clinician remains in control.** AI output is decision *support* only. Your licensed clinician
  reviews, edits, and approves all clinical content; AI does not make diagnostic or treatment decisions.
- **How your data is handled.** Your information is processed by a third-party AI provider under a
  business agreement that prohibits training on your data and requires appropriate safeguards. Data is
  encrypted and access is limited to your care team.
- **It does not replace your therapist**, and you may ask how AI is used in your care at any time.

## Emergency Procedures
In case of technical difficulties or emergencies:
- Call [EMERGENCY_NUMBER]
- Use backup contact method: [BACKUP_CONTACT]

## Agreement
By signing below, you consent to receiving therapy services via telehealth and acknowledge the use of
AI-assisted software described above.
    `,
  },
  minor: {
    version: "2.0",
    title: "Minor Therapy Consent Form",
    content: `
# Minor Therapy Consent Form

## Introduction
This form is completed by the parent or legal guardian of a minor client. By signing
below, you confirm that you have the legal authority to consent to mental-health
services on behalf of the named minor, and that you do so willingly.

## Parental Rights
As the parent or legal guardian you have the right to:
- Request general progress updates
- Be informed of safety concerns
- Access treatment records, consistent with applicable state law

## Confidentiality
While the minor has rights to a private therapeutic relationship, you will be
informed of:
- Safety concerns
- Treatment recommendations
- Major treatment decisions

## Treatment Approach
Therapy with your minor child will use evidence-based approaches tailored to
their developmental stage and clinical needs.

## Use of Artificial Intelligence in Your Care
This practice uses AI-assisted software to support your child's care. Information provided — including
intake details, session notes, and assessment responses — may be processed by AI tools to help the
clinician prepare assessments, consider diagnoses, draft treatment plans, track progress, and prepare
documentation.

Please understand:
- **The clinician remains in control.** AI output is decision *support* only. The licensed clinician
  reviews, edits, and approves all clinical content; AI does not make diagnostic or treatment decisions,
  and nothing enters your child's record without the clinician's approval.
- **How your child's data is handled.** Information is processed by a third-party AI provider under a
  business agreement that prohibits training on the data and requires appropriate safeguards. Data is
  encrypted and access is limited to the care team.
- **It does not replace the therapist**, and you may ask how AI is used in your child's care at any time.

## Guardian Acknowledgement
By signing electronically below, you affirm that:
- You are the parent or legal guardian of the minor receiving therapy.
- You have stated your relationship to the minor in the signature block.
- You are consenting to therapy services on the minor's behalf, including the use of AI-assisted
  software described above.
    `,
  },
};

export function getConsentFormTemplate(type, version) {
  const template = consentFormTemplates[type];
  if (!template) {
    throw new Error(`No template found for type: ${type}`);
  }
  // Only assert the version if the caller pins one (legal-replay context).
  // Otherwise the current version of the template is what's served.
  if (version && template.version !== version) {
    throw new Error(`Version ${version} not available for ${type} template`);
  }
  return template;
}

export function getAvailableTemplates() {
  return Object.keys(consentFormTemplates).map((type) => ({
    type,
    version: consentFormTemplates[type].version,
    title: consentFormTemplates[type].title,
  }));
}

export const generateConsentFormPDF = async (type) => {
  const template = getConsentFormTemplate(type);
  const { PDFDocument, rgb } = require("pdf-lib");

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size

  // Add title
  page.drawText(template.title, {
    x: 50,
    y: 800,
    size: 20,
    color: rgb(0, 0, 0),
  });

  // Add version
  page.drawText(`Version: ${template.version}`, {
    x: 50,
    y: 770,
    size: 12,
    color: rgb(0, 0, 0),
  });

  // Parse markdown content into sections
  const sections = template.content.split("\n## ").map((section) => {
    const [title, ...content] = section.split("\n");
    return {
      title: title.replace("# ", "").trim(),
      content: content.join("\n").trim(),
    };
  });

  // Add sections
  let yPosition = 740;
  sections.forEach((section) => {
    // Add section title
    page.drawText(section.title, {
      x: 50,
      y: yPosition,
      size: 14,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    // Add section content
    page.drawText(section.content, {
      x: 50,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
      maxWidth: 495,
    });
    yPosition -= 100;
  });

  // Add signature fields
  page.drawText("Client Signature: ________________________", {
    x: 50,
    y: yPosition,
    size: 12,
    color: rgb(0, 0, 0),
  });
  yPosition -= 30;

  page.drawText("Date: ________________________", {
    x: 50,
    y: yPosition,
    size: 12,
    color: rgb(0, 0, 0),
  });

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};
