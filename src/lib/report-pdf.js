import path from "path";
import React from "react";
import { parseReportSections } from "@/lib/reports/sections";
import { ageFromDob, genderLabel } from "@/lib/age";

const FONTS = path.join(process.cwd(), "public", "fonts");

// ---------------------------------------------------------------------------
// Color palette
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

// ---------------------------------------------------------------------------
// Lazy setup — dynamic import keeps react-pdf in its own module realm.
// Caches on a promise so concurrent first-calls don't double-register fonts.
// ---------------------------------------------------------------------------
let _setupPromise = null;

function getSetup() {
  if (!_setupPromise) {
    _setupPromise = (async () => {
      const R = await import("@react-pdf/renderer");

      R.Font.register({
        family: "Bricolage Grotesque",
        src: path.join(FONTS, "BricolageGrotesque-700.ttf"),
        fontWeight: 700,
      });
      R.Font.register({
        family: "Source Serif 4",
        fonts: [
          { src: path.join(FONTS, "SourceSerif4-400.ttf"), fontWeight: 400 },
          { src: path.join(FONTS, "SourceSerif4-400-italic.ttf"), fontWeight: 400, fontStyle: "italic" },
        ],
      });
      R.Font.registerHyphenationCallback((word) => [word]);

      const S = R.StyleSheet.create({
        page: {
          fontFamily: "Helvetica",
          fontSize: 11,
          color: C.navyMid,
          paddingTop: 54,
          paddingBottom: 72,
          paddingHorizontal: 54,
          backgroundColor: "#fff",
        },
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
        letterhead: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          paddingBottom: 14,
          borderBottomWidth: 2,
          borderBottomColor: C.navy,
          marginBottom: 20,
        },
        logoRow: { flexDirection: "row", alignItems: "center" },
        logoTile: {
          width: 44,
          height: 44,
          borderRadius: 11,
          backgroundColor: C.navy,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
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
        title: {
          fontFamily: "Bricolage Grotesque",
          fontWeight: 700,
          fontSize: 27,
          color: C.navy,
          letterSpacing: -0.5,
          marginBottom: 14,
        },
        metaPanel: {
          backgroundColor: C.panelBg,
          borderWidth: 1,
          borderColor: C.panelBorder,
          borderRadius: 12,
          padding: 16,
          marginBottom: 18,
          flexDirection: "row",
        },
        metaCell: { flex: 1, marginRight: 16 },
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
        section: { marginTop: 20 },
        sectionHeadRow: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
        accentBar: { width: 4, height: 15, borderRadius: 2, backgroundColor: C.blue, marginRight: 9 },
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
        riskHeadRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
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
        sigBlock: { marginTop: 30, flexDirection: "row" },
        sigCol1: {
          flex: 1,
          borderTopWidth: 1.5,
          borderTopColor: C.navy,
          paddingTop: 7,
          marginRight: 32,
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

      return { R, S };
    })();
  }
  return _setupPromise;
}

// ---------------------------------------------------------------------------
// Document builder — pure React.createElement, no JSX.
// Primitives come from the same dynamic-import realm as renderToBuffer.
// ---------------------------------------------------------------------------
function buildDoc(R, S, props) {
  const ce = React.createElement;
  const { Document, Page, View, Text, Svg, Path } = R;

  const {
    practiceName, practiceAddress,
    clientName, clientDob, clientGender,
    reportType, startDate, endDate,
    narrative, clinicianName, clinicianLicense,
    sourcesCount, status, generatedAt,
  } = props;

  const isDraft = status === "draft";
  const sections = parseReportSections(narrative || "");
  const stamp = formatStamp(generatedAt);
  const clientAge = ageFromDob(clientDob);
  const clientGenderStr = genderLabel(clientGender);

  function LogoTile() {
    return ce(View, { style: S.logoTile },
      ce(Svg, { width: "26", height: "26", viewBox: "0 0 512 512" },
        ce(Path, {
          d: "M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38",
          stroke: C.cyan, strokeWidth: "46", strokeLinecap: "round", fill: "none",
        })
      )
    );
  }

  function WarningIcon() {
    return ce(View, { style: { marginTop: 1, marginRight: 8 } },
      ce(Svg, { width: "16", height: "16", viewBox: "0 0 24 24" },
        ce(Path, {
          d: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
          stroke: C.riskLeft, strokeWidth: "2.2", fill: "none", strokeLinejoin: "round",
        }),
        ce(Path, {
          d: "M12 9v4M12 17h.01",
          stroke: C.riskLeft, strokeWidth: "2.2", strokeLinecap: "round",
        })
      )
    );
  }

  function SectionBlock({ title, body }) {
    return ce(View, { style: S.section },
      ce(View, { style: S.sectionHeadRow },
        ce(View, { style: S.accentBar }),
        ce(Text, { style: S.sectionTitle }, title.toUpperCase())
      ),
      ...body.split(/\n\n+/).filter(Boolean).map((para, i) =>
        ce(Text, { key: i, style: S.prose }, para.replace(/\n/g, " ").trim())
      )
    );
  }

  function RiskCallout({ body }) {
    return ce(View, { style: S.riskOuter },
      ce(View, { style: S.riskBar }),
      ce(View, { style: S.riskInner },
        ce(View, { style: S.riskHeadRow },
          ce(WarningIcon, null),
          ce(Text, { style: S.riskTitle }, "Risk assessment")
        ),
        ...body.split(/\n\n+/).filter(Boolean).map((para, i) =>
          ce(Text, { key: i, style: S.riskProse }, para.replace(/\n/g, " ").trim())
        )
      )
    );
  }

  const sectionEls = sections.length === 0
    ? [ce(Text, { key: "empty", style: S.prose }, "(No narrative content)")]
    : sections.map((sec, i) =>
        sec.title.toLowerCase() === "risk"
          ? ce(RiskCallout, { key: i, body: sec.body })
          : ce(SectionBlock, { key: i, title: sec.title || "Summary", body: sec.body })
      );

  return ce(Document, null,
    ce(Page, { size: "LETTER", style: S.page },
      isDraft ? ce(Text, { fixed: true, style: S.watermark }, "DRAFT") : null,

      ce(View, { fixed: true, style: S.footer },
        ce(Text, { style: S.footerText }, `Generated ${stamp}`),
        ce(Text, {
          style: S.footerText,
          render: ({ pageNumber, totalPages }) =>
            `${practiceName} · Confidential clinical record · Page ${pageNumber} of ${totalPages}`,
        })
      ),

      ce(View, { style: S.letterhead },
        ce(View, { style: S.logoRow },
          ce(LogoTile, null),
          ce(View, null,
            ce(Text, { style: S.practiceName }, practiceName || "CogniCare"),
            practiceAddress ? ce(Text, { style: S.practiceAddress }, practiceAddress) : null
          )
        ),
        ce(Text, { style: S.eyebrow }, "Clinical Documentation")
      ),

      ce(Text, { style: S.title }, `${titleCase(reportType)} Report`),

      ce(View, { style: S.metaPanel },
        ce(View, { style: S.metaCell },
          ce(Text, { style: S.metaLabel }, "Client"),
          ce(Text, { style: S.metaValue }, clientName),
          (clientAge || clientGenderStr)
            ? ce(Text, { style: S.metaSub },
                [clientAge ? `${clientAge} yrs` : null, clientGenderStr].filter(Boolean).join(" · ")
              )
            : null
        ),
        ce(View, { style: S.metaCell },
          ce(Text, { style: S.metaLabel }, "Reporting period"),
          ce(Text, { style: S.metaValue }, formatDay(startDate)),
          ce(Text, { style: S.metaSub }, `to ${formatDay(endDate)}`)
        ),
        ce(View, { style: S.metaCell },
          ce(Text, { style: S.metaLabel }, "Prepared by"),
          ce(Text, { style: S.metaValue }, clinicianName || "—"),
          sourcesCount != null
            ? ce(Text, { style: S.metaSub },
                `${sourcesCount} source record${sourcesCount === 1 ? "" : "s"}`
              )
            : null
        ),
        ce(View, { style: [S.metaCell, { marginRight: 0 }] },
          ce(Text, { style: S.metaLabel }, "Status"),
          isDraft
            ? ce(View, { style: S.pillDraft }, ce(Text, { style: S.pillDraftText }, "Draft"))
            : ce(View, { style: S.pillDone }, ce(Text, { style: S.pillDoneText }, "Completed"))
        )
      ),

      ...sectionEls,

      ce(View, { style: S.sigBlock, wrap: false },
        ce(View, { style: S.sigCol1 },
          ce(Text, { style: S.sigName }, clinicianName || "—"),
          ce(Text, { style: S.sigSub },
            `Clinician of record${clinicianLicense ? ` · License #${clinicianLicense}` : ""}`
          )
        ),
        ce(View, { style: S.sigCol2 },
          ce(Text, { style: S.sigDateLabel }, "Date signed"),
          ce(Text, { style: S.sigDateValue }, formatDay(generatedAt))
        )
      ),

      ce(Text, { style: S.disclosure },
        "This report was prepared with AI clinical decision support and reviewed by the clinician of record."
      )
    )
  );
}

// ---------------------------------------------------------------------------
// Public API — signature unchanged
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
  const { R, S } = await getSetup();
  const doc = buildDoc(R, S, {
    practiceName, practiceAddress,
    clientName, clientDob, clientGender,
    reportType, startDate, endDate,
    narrative, clinicianName, clinicianLicense,
    sourcesCount, status, generatedAt,
  });
  return R.renderToBuffer(doc);
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
