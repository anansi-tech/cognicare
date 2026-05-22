const consentFormTemplates = {
  general: {
    version: "1.0",
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
By signing below, you acknowledge that you have read and understand this consent form.

Signature: ________________________
Date: ____________________________
    `,
  },
  telehealth: {
    version: "1.0",
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

## Emergency Procedures
In case of technical difficulties or emergencies:
- Call [EMERGENCY_NUMBER]
- Use backup contact method: [BACKUP_CONTACT]

## Agreement
By signing below, you consent to receiving therapy services via telehealth.

Signature: ________________________
Date: ____________________________
    `,
  },
  minor: {
    version: "1.0",
    title: "Minor Therapy Consent Form",
    content: `
# Minor Therapy Consent Form

## Introduction
This form outlines the terms of therapy for minors and parental rights.

## Parental Rights
As the parent/guardian, you have the right to:
- Request general progress updates
- Be informed of safety concerns
- Access treatment records

## Confidentiality
While minors have rights to privacy, parents will be informed of:
- Safety concerns
- Treatment recommendations
- Major treatment decisions

## Agreement
By signing below, you consent to therapy services for your minor child.

Parent/Guardian Signature: ________________________
Date: ____________________________
    `,
  },
};

export function getConsentFormTemplate(type, version = "1.0") {
  const template = consentFormTemplates[type];
  if (!template) {
    throw new Error(`No template found for type: ${type}`);
  }
  if (template.version !== version) {
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
