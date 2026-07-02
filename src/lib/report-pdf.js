import path from "path";
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Svg,
  Path,
  Font,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { parseReportSections } from "@/lib/reports/sections";
import { ageFromDob, genderLabel } from "@/lib/age";

// ---------------------------------------------------------------------------
// Font registration (WOFF files from public/fonts — included in Vercel deploy)
// ---------------------------------------------------------------------------
const FONTS = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "Bricolage Grotesque",
  src: path.join(FONTS, "BricolageGrotesque-700.woff"),
  fontWeight: 700,
});
Font.register({
  family: "Source Serif 4",
  fonts: [
    { src: path.join(FONTS, "SourceSerif4-400.woff"), fontWeight: 400 },
    { src: path.join(FONTS, "SourceSerif4-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
  ],
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const C = {
  navy: "#0B2B6B",
  navyMid: "#24344F",
  slate: "#33465F",
  muted: "#55698F",
  light: "#8298BC",
  blue: "#2F80FF",
  cyan: "#25B9C8",
  panelBg: "#F4F8FD",
  panelBorder: "#E3ECF7",
  footerBorder: "#E3ECF7",
  disclosureBorder: "#EEF3FA",
  sigBorder2: "#C7D5E8",
  greenBg: "#E7F6EC",
  greenText: "#3B9E57",
  amberBg: "#FBF2DA",
  amberText: "#A9821F",
  riskBg: "#FDF6F5",
  riskBorder: "#F0D9D6",
  riskLeft: "#C0392B",
  riskHead: "#A6322A",
  riskBody: "#6B4340",
};

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: C.navyMid,
    paddingTop: 54,
    paddingBottom: 72, // space for fixed footer
    paddingHorizontal: 54,
    backgroundColor: "#fff",
  },
  // Fixed footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 54,
    right: 54,
    borderTopWidth: 1,
    borderTopColor: C.footerBorder,
    paddingTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 9.5, color: C.light },
  // Watermark
  watermark: {
    position: "absolute",
    top: 260,
    left: 90,
    fontSize: 80,
    fontFamily: "Helvetica-Bold",
    color: C.riskLeft,
    opacity: 0.07,
    transform: "rotate(-35deg)",
  },
  // Letterhead
  letterhead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
    marginBottom: 20,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoTile: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  practiceName: {
    fontFamily: "Bricolage Grotesque",
    fontWeight: 700,
    fontSize: 19,
    color: C.navy,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  practiceAddress: { fontSize: 11, color: C.muted },
  eyebrow: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: C.blue,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  // Title
  title: {
    fontFamily: "Bricolage Grotesque",
    fontWeight: 700,
    fontSize: 27,
    color: C.navy,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  // Metadata panel
  metaPanel: {
    backgroundColor: C.panelBg,
    borderWidth: 1,
    borderColor: C.panelBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    flexDirection: "row",
    gap: 16,
  },
  metaCell: { flex: 1 },
  metaLabel: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: C.light,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
    marginBottom: 1,
  },
  metaSub: { fontSize: 11, color: C.muted },
  pillDone: {
    alignSelf: "flex-start",
    backgroundColor: C.greenBg,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
    marginTop: 3,
    marginBottom: 2,
  },
  pillDoneText: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: C.greenText },
  pillDraft: {
    alignSelf: "flex-start",
    backgroundColor: C.amberBg,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
    marginTop: 3,
    marginBottom: 2,
  },
  pillDraftText: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: C.amberText },
  // Section
  section: { marginTop: 20 },
  sectionHeadRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 7 },
  accentBar: { width: 4, height: 15, borderRadius: 2, backgroundColor: C.blue },
  sectionTitle: {
    fontFamily: "Bricolage Grotesque",
    fontWeight: 700,
    fontSize: 14,
    color: C.navy,
    textTransform: "uppercase",
    letterSpacing: 0.1,
  },
  prose: {
    fontFamily: "Source Serif 4",
    fontSize: 12.5,
    lineHeight: 1.62,
    color: C.slate,
    marginBottom: 7,
  },
  // Risk callout
  riskOuter: { flexDirection: "row", marginTop: 20 },
  riskBar: { width: 4, backgroundColor: C.riskLeft, borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
  riskInner: {
    flex: 1,
    backgroundColor: C.riskBg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: C.riskBorder,
    borderBottomColor: C.riskBorder,
    borderRightColor: C.riskBorder,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    padding: 14,
  },
  riskHeadRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  riskTitle: {
    fontFamily: "Bricolage Grotesque",
    fontWeight: 700,
    fontSize: 14,
    color: C.riskHead,
    textTransform: "uppercase",
  },
  riskProse: {
    fontFamily: "Source Serif 4",
    fontSize: 12.5,
    lineHeight: 1.62,
    color: C.riskBody,
    marginBottom: 7,
  },
  // Signature block
  sigBlock: { marginTop: 30, flexDirection: "row", gap: 32 },
  sigCol1: {
    flex: 1,
    borderTopWidth: 1.5,
    borderTopColor: C.navy,
    paddingTop: 7,
  },
  sigCol2: {
    flex: 1,
    borderTopWidth: 1.5,
    borderTopColor: C.sigBorder2,
    paddingTop: 7,
  },
  sigName: {
    fontFamily: "Bricolage Grotesque",
    fontWeight: 700,
    fontSize: 14,
    color: C.navy,
    marginBottom: 2,
  },
  sigSub: { fontSize: 11, color: C.muted },
  sigDateLabel: { fontSize: 11, color: C.light, marginBottom: 3 },
  sigDateValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.navy },
  // AI disclosure
  disclosure: {
    fontFamily: "Source Serif 4",
    fontStyle: "italic",
    fontSize: 10,
    color: C.light,
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.disclosureBorder,
  },
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function LogoTile() {
  return (
    <View style={S.logoTile}>
      <Svg width="26" height="26" viewBox="0 0 512 512">
        <Path
          d="M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38"
          stroke={C.cyan}
          strokeWidth="46"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function WarningIcon() {
  return (
    <Svg width="16" height="16" viewBox="0 0 24 24" style={{ marginTop: 1 }}>
      <Path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke={C.riskLeft}
        strokeWidth="2.2"
        fill="none"
        strokeLinejoin="round"
      />
      <Path d="M12 9v4M12 17h.01" stroke={C.riskLeft} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

function SectionBlock({ title, body }) {
  return (
    <View style={S.section} wrap={false}>
      <View style={S.sectionHeadRow}>
        <View style={S.accentBar} />
        <Text style={S.sectionTitle}>{title.toUpperCase()}</Text>
      </View>
      {body.split(/\n\n+/).filter(Boolean).map((para, i) => (
        <Text key={i} style={S.prose}>{para.replace(/\n/g, " ").trim()}</Text>
      ))}
    </View>
  );
}

function RiskCallout({ body }) {
  return (
    <View style={S.riskOuter} wrap={false}>
      <View style={S.riskBar} />
      <View style={S.riskInner}>
        <View style={S.riskHeadRow}>
          <WarningIcon />
          <Text style={S.riskTitle}>Risk assessment</Text>
        </View>
        {body.split(/\n\n+/).filter(Boolean).map((para, i) => (
          <Text key={i} style={S.riskProse}>{para.replace(/\n/g, " ").trim()}</Text>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main document
// ---------------------------------------------------------------------------
function ReportDocument({
  practiceName, practiceAddress,
  clientName, clientDob, clientGender,
  reportType, startDate, endDate,
  narrative, clinicianName, clinicianLicense,
  sourcesCount, status, generatedAt,
}) {
  const isDraft = status === "draft";
  const sections = parseReportSections(narrative || "");
  const stamp = formatStamp(generatedAt);
  const clientAge = ageFromDob(clientDob);
  const clientGenderStr = genderLabel(clientGender);

  return (
    <Document>
      <Page size="LETTER" style={S.page}>
        {/* Watermark — every page */}
        {isDraft && (
          <Text fixed style={S.watermark}>DRAFT</Text>
        )}

        {/* Running footer — every page */}
        <View fixed style={S.footer}>
          <Text style={S.footerText}>Generated {stamp}</Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) =>
              `${practiceName} · Confidential clinical record · Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

        {/* Letterhead */}
        <View style={S.letterhead}>
          <View style={S.logoRow}>
            <LogoTile />
            <View>
              <Text style={S.practiceName}>{practiceName || "CogniCare"}</Text>
              {practiceAddress ? <Text style={S.practiceAddress}>{practiceAddress}</Text> : null}
            </View>
          </View>
          <Text style={S.eyebrow}>Clinical Documentation</Text>
        </View>

        {/* Title */}
        <Text style={S.title}>{titleCase(reportType)} Report</Text>

        {/* Metadata panel */}
        <View style={S.metaPanel}>
          <View style={S.metaCell}>
            <Text style={S.metaLabel}>Client</Text>
            <Text style={S.metaValue}>{clientName}</Text>
            {(clientAge || clientGenderStr) ? (
              <Text style={S.metaSub}>
                {[clientAge ? `${clientAge} yrs` : null, clientGenderStr].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
          </View>
          <View style={S.metaCell}>
            <Text style={S.metaLabel}>Reporting period</Text>
            <Text style={S.metaValue}>{formatDay(startDate)}</Text>
            <Text style={S.metaSub}>to {formatDay(endDate)}</Text>
          </View>
          <View style={S.metaCell}>
            <Text style={S.metaLabel}>Prepared by</Text>
            <Text style={S.metaValue}>{clinicianName || "—"}</Text>
            {sourcesCount != null ? (
              <Text style={S.metaSub}>{sourcesCount} source record{sourcesCount === 1 ? "" : "s"}</Text>
            ) : null}
          </View>
          <View style={S.metaCell}>
            <Text style={S.metaLabel}>Status</Text>
            {isDraft ? (
              <View style={S.pillDraft}><Text style={S.pillDraftText}>Draft</Text></View>
            ) : (
              <View style={S.pillDone}><Text style={S.pillDoneText}>Completed</Text></View>
            )}
          </View>
        </View>

        {/* Sections */}
        {sections.length === 0 ? (
          <Text style={S.prose}>(No narrative content)</Text>
        ) : (
          sections.map((sec, i) =>
            sec.title.toLowerCase() === "risk" ? (
              <RiskCallout key={i} body={sec.body} />
            ) : (
              <SectionBlock key={i} title={sec.title || "Summary"} body={sec.body} />
            )
          )
        )}

        {/* Signature block */}
        <View style={S.sigBlock} wrap={false}>
          <View style={S.sigCol1}>
            <Text style={S.sigName}>{clinicianName || "—"}</Text>
            <Text style={S.sigSub}>
              Clinician of record{clinicianLicense ? ` · License #${clinicianLicense}` : ""}
            </Text>
          </View>
          <View style={S.sigCol2}>
            <Text style={S.sigDateLabel}>Date signed</Text>
            <Text style={S.sigDateValue}>{formatDay(generatedAt)}</Text>
          </View>
        </View>

        {/* AI disclosure */}
        <Text style={S.disclosure}>
          This report was prepared with AI clinical decision support and reviewed by the clinician of record.
        </Text>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Public API — signature matches existing callers
// ---------------------------------------------------------------------------
export async function buildReportPdf({
  practiceName,
  practiceAddress,
  clientName,
  clientDob,
  clientGender,
  reportType,
  startDate,
  endDate,
  narrative,
  clinicianName,
  clinicianLicense,
  sourcesCount,
  status,
  generatedAt = new Date(),
}) {
  const doc = React.createElement(ReportDocument, {
    practiceName, practiceAddress,
    clientName, clientDob, clientGender,
    reportType, startDate, endDate,
    narrative, clinicianName, clinicianLicense,
    sourcesCount, status, generatedAt,
  });
  return await renderToBuffer(doc);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function titleCase(s) {
  if (!s) return s;
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function formatDay(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return String(d);
  }
}

function formatStamp(d) {
  try {
    return new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return String(d);
  }
}
