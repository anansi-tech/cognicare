import { NextResponse } from "next/server";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import Session from "@/models/session";
import Report from "@/models/report";
import Practice from "@/models/practice";
import Client from "@/models/client";
import AIReport from "@/models/aiReport";
import ConsentForm from "@/models/consentForm";
import MeasureAdministration from "@/models/measureAdministration";
import SafetyPlan from "@/models/safetyPlan";
import { dayRangeInTz } from "@/lib/timezone";
import { notesHash } from "@/lib/hash";
import { isConsented } from "@/lib/consent";
import { computeDirection } from "@/lib/mbc/trend";
import { getInstrument } from "@/lib/mbc/instruments";

export const GET = requireAuth(async (req) => {
  try {
    const user = await getCurrentUser();
    const practiceId = user.practiceId;

    await connectDB();

    // Assignment-based stats: clinicians see numbers for their own caseload;
    // owners see everything in the practice. Sessions/Reports inherit from
    // client visibility.
    const allowedClientIds = await visibleClientIds(user);
    const totalClients = allowedClientIds.length;

    const sessionScope = { practiceId, clientId: { $in: allowedClientIds } };
    const reportScope = { practiceId, clientId: { $in: allowedClientIds } };

    const activeSessions = await Session.countDocuments({
      ...sessionScope,
      status: { $in: ["scheduled", "in-progress"] },
    });

    const completedSessions = await Session.countDocuments({
      ...sessionScope,
      status: "completed",
    });

    const reportsGenerated = await Report.countDocuments({
      ...reportScope,
      status: "completed",
    });

    // Today's schedule + a forward-looking "this week" count (Round 17).
    // Same scoping as the rest — clinicians see their own caseload only.
    const practice = await Practice.findById(practiceId).select("timezone").lean();
    const tz = practice?.timezone ?? "America/New_York";
    const { start: startOfToday, end: endOfToday } = dayRangeInTz(tz);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [recentSessions, recentReports, todaysAppointmentsRaw, upcomingThisWeek] =
      await Promise.all([
        Session.find(sessionScope)
          .sort({ updatedAt: -1 })
          .limit(5)
          .populate("clientId", "name")
          .lean(),
        Report.find(reportScope)
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("clientId", "name")
          .lean(),
        Session.find({
          ...sessionScope,
          status: "scheduled",
          date: { $gte: startOfToday, $lte: endOfToday },
        })
          .sort({ date: 1 })
          .populate("clientId", "name")
          .lean(),
        Session.countDocuments({
          ...sessionScope,
          status: "scheduled",
          date: { $gt: endOfToday, $lte: endOfWeek },
        }),
      ]);

    // ------------------------------------------------------------------
    // Dashboard v2 (additive): reviewQueue + signals + schedule enrichment.
    // Metadata-only AND decryption-free: content hashes are stamped on write
    // (model pre-save hooks, same lib/hash functions the client/session views
    // compare with), so staleness here is lean stored-hash comparisons — the
    // dashboard can never disagree with the views, and never decrypts.
    // Docs that predate the hash backfill simply don't produce items until
    // the backfill stamps them.
    // ------------------------------------------------------------------
    const clientScopeFilter = { practiceId, clientId: { $in: allowedClientIds } };

    const [
      clientDocs,
      sessionsLean,          // dates/status only — first-session + meta lookups
      draftReports,          // unencrypted metadata via lean
      consentDocs,
      administrationsLean,   // unencrypted measure metadata
      treatmentsLean,        // version + stored source hash (unencrypted)
      diagnosticsLean,       // stored payloadHash (unencrypted)
      pairReportsLean,       // session-scoped pair stamps (unencrypted)
      completedSessionsLean, // stored notesHash (unencrypted)
    ] = await Promise.all([
      Client.find({ _id: { $in: allowedClientIds } }).select("name status consentOverride").lean(),
      Session.find(sessionScope).select("date status clientId").lean(),
      AIReport.find({ ...clientScopeFilter, status: "draft" })
        .select("agentType clientId sessionId createdAt version").lean(),
      ConsentForm.find({ ...clientScopeFilter, status: { $in: ["pending", "signed"] } })
        .select("clientId status requestedAt createdAt").lean(),
      MeasureAdministration.find(clientScopeFilter)
        .select("clientId instrumentId total administeredAt tier").sort({ administeredAt: 1 }).lean(),
      AIReport.find({ ...clientScopeFilter, agentType: "treatment" })
        .select("clientId sessionId version status sourceDiagnosticHash createdAt").lean(),
      AIReport.find({ ...clientScopeFilter, agentType: "diagnostic", sessionId: null })
        .select("clientId payloadHash createdAt editedAt").lean(),
      AIReport.find({ ...clientScopeFilter, sessionId: { $ne: null }, agentType: { $in: ["progress", "documentation"] } })
        .select("agentType clientId sessionId sourceNotesHash createdAt").lean(),
      Session.find({ ...sessionScope, status: "completed" })
        .select("clientId date notesHash").lean(),
    ]);

    const nameById = new Map(clientDocs.map((c) => [c._id.toString(), c.name]));
    const clientName = (id) => nameById.get(id?.toString()) ?? "Unknown";
    const sessionById = new Map(sessionsLean.map((s) => [s._id.toString(), s]));

    // --- Review queue: items requiring clinician ACTION -----------------
    const reviewItems = [];

    // Stored notes hashes (stamped on write). Empty notes are detected by
    // comparing against the constant hash of "" — no decryption. Empty-notes
    // sessions get an "Add notes" item and are excluded from staleness —
    // regenerating from empty notes is never the right action. Sessions
    // without a stamp (pre-backfill) are skipped until the backfill runs.
    const EMPTY_NOTES_HASH = notesHash("");
    const notesHashBySession = new Map();
    const emptyNoteSessions = [];
    for (const s of completedSessionsLean) {
      if (!s.notesHash) continue;
      if (s.notesHash === EMPTY_NOTES_HASH) {
        emptyNoteSessions.push(s);
      } else {
        notesHashBySession.set(s._id.toString(), s.notesHash);
      }
    }

    for (const s of emptyNoteSessions) {
      reviewItems.push({
        type: "missing-notes",
        clientId: s.clientId.toString(),
        clientName: clientName(s.clientId),
        sessionId: s._id.toString(),
        date: s.date,
      });
    }

    // Stale note+progress pairs — one item per session (the pair regenerates
    // as a unit). Same comparison as SessionAIInsights: current notes hash vs
    // each report's sourceNotesHash stamp.
    const staleSessions = new Map();
    for (const r of pairReportsLean) {
      const sid = r.sessionId.toString();
      const current = notesHashBySession.get(sid);
      if (!current) continue; // not completed, or empty notes (handled above)
      if (r.sourceNotesHash !== current && !staleSessions.has(sid)) {
        const s = sessionById.get(sid);
        staleSessions.set(sid, {
          type: "stale-notes",
          clientId: r.clientId.toString(),
          clientName: clientName(r.clientId),
          sessionId: sid,
          date: s?.date ?? r.createdAt,
        });
      }
    }
    reviewItems.push(...staleSessions.values());

    // Diagnosis changed since the current plan version — same comparison as
    // ClientInsights (payloadHash of the latest diagnostic vs the treatment's
    // sourceDiagnosticHash stamp).
    const latestTreatmentByClient = new Map();
    for (const t of treatmentsLean) {
      const cid = t.clientId.toString();
      const cur = latestTreatmentByClient.get(cid);
      if (!cur || t.version > cur.version || (t.version === cur.version && t.createdAt > cur.createdAt)) {
        latestTreatmentByClient.set(cid, t);
      }
    }
    const latestDiagnosticByClient = new Map();
    for (const d of diagnosticsLean) {
      const cid = d.clientId.toString();
      const cur = latestDiagnosticByClient.get(cid);
      if (!cur || d.createdAt > cur.createdAt) latestDiagnosticByClient.set(cid, d);
    }
    for (const [cid, tx] of latestTreatmentByClient) {
      const dx = latestDiagnosticByClient.get(cid);
      if (!dx?.payloadHash) continue; // pre-backfill stamp missing — skip until backfilled
      if (dx.payloadHash !== tx.sourceDiagnosticHash) {
        reviewItems.push({
          type: "stale-plan",
          clientId: cid,
          clientName: clientName(cid),
          version: tx.version ?? 1,
          date: dx.editedAt ?? dx.createdAt,
        });
      }
    }

    // Draft AI reports + draft SOAP notes.
    for (const r of draftReports) {
      const sid = r.sessionId?.toString() ?? null;
      reviewItems.push({
        type: r.agentType === "documentation" ? "draft-note" : "draft-report",
        reportType: r.agentType,
        version: r.version,
        clientId: r.clientId.toString(),
        clientName: clientName(r.clientId),
        sessionId: sid,
        reportId: r._id.toString(),
        date: sid ? (sessionById.get(sid)?.date ?? r.createdAt) : r.createdAt,
      });
    }

    // Unsigned consent forms — pending forms for clients who are NOT
    // consented (no signed form AND no in-person override). Same isConsented
    // helper as the consent-status route and the agent-workflow gate, so the
    // dashboard can never disagree with them: an overridden client with a
    // stale pending form is consented, not a review item.
    const formsByClient = new Map();
    for (const c of consentDocs) {
      const cid = c.clientId.toString();
      if (!formsByClient.has(cid)) formsByClient.set(cid, []);
      formsByClient.get(cid).push(c);
    }
    const clientDocById = new Map(clientDocs.map((c) => [c._id.toString(), c]));
    const consentSeen = new Set();
    for (const c of consentDocs) {
      const cid = c.clientId.toString();
      if (c.status !== "pending" || consentSeen.has(cid)) continue;
      if (isConsented({ forms: formsByClient.get(cid) ?? [], client: clientDocById.get(cid) })) continue;
      consentSeen.add(cid);
      reviewItems.push({
        type: "consent",
        clientId: cid,
        clientName: clientName(cid),
        date: c.requestedAt ?? c.createdAt,
      });
    }

    // Oldest first — longest-waiting on top.
    reviewItems.sort((a, b) => new Date(a.date) - new Date(b.date));
    const reviewTotal = reviewItems.length;
    const reviewQueue = reviewItems.slice(0, 10);

    // --- Signals: informational measure movements ------------------------
    // Reuses the trend lib's direction + reliable-change rule (|delta| >= RCI).
    // getInstrument (not listInstruments — that's a picker summary WITHOUT
    // reliableChange/direction) for the full definitions getTrend uses.
    const instById = new Map();
    const fullInstrument = (id) => {
      if (!instById.has(id)) {
        try { instById.set(id, getInstrument(id)); } catch { instById.set(id, null); }
      }
      return instById.get(id);
    };
    // Signals are about ongoing care: only ACTIVE clients. A discharged
    // client's last measure would otherwise read "overdue" forever, and a
    // signal about someone no longer in care isn't actionable. (The review
    // queue is deliberately NOT filtered this way — drafts still need
    // sign-off for the record regardless of client status.)
    const activeClients = new Set(
      clientDocs.filter((c) => c.status === "active").map((c) => c._id.toString())
    );
    const byClientInstrument = new Map();
    for (const a of administrationsLean) {
      if (!activeClients.has(a.clientId.toString())) continue;
      const key = `${a.clientId}:${a.instrumentId}`;
      if (!byClientInstrument.has(key)) byClientInstrument.set(key, []);
      byClientInstrument.get(key).push(a);
    }
    const worsened = [], overdue = [], improved = [];
    // Elevated C-SSRS (Round 55): the LATEST categorical administration's
    // tier decides — a newer lower-tier administration clears it, time never
    // does. `tier` is unencrypted metadata; no decryption happens here.
    const latestCategoricalByClient = new Map();
    // Heuristic overdue threshold pending a per-practice cadence setting.
    const OVERDUE_MS = 28 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const [key, list] of byClientInstrument) {
      const inst = fullInstrument(list[0].instrumentId);
      if (!inst) continue;
      // Categorical screeners: no RCI/overdue math — they surface as risk
      // signals below, not as trend movements or cadence reminders.
      if (inst.scoring?.method === "categorical") {
        const latest = list[list.length - 1];
        const cid = latest.clientId.toString();
        const cur = latestCategoricalByClient.get(cid);
        if (!cur || new Date(latest.administeredAt) > new Date(cur.administeredAt)) {
          latestCategoricalByClient.set(cid, { ...latest, shortName: inst.shortName });
        }
        continue;
      }
      const latest = list[list.length - 1];
      const prev = list.length > 1 ? list[list.length - 2] : null;
      const cid = latest.clientId.toString();
      const base = { clientId: cid, clientName: clientName(cid), date: latest.administeredAt };
      if (prev) {
        const delta = latest.total - prev.total;
        const direction = computeDirection(delta, inst);
        const reliable = Math.abs(delta) >= inst.reliableChange;
        const signed = `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`;
        if (reliable && direction === "worsened") {
          worsened.push({ ...base, severity: "worsened", text: `${inst.shortName} reliably worsened (${signed}) since last administration` });
        } else if (reliable && direction === "improved") {
          improved.push({ ...base, severity: "improved", text: `${inst.shortName} reliable improvement (${signed})` });
        }
      }
      const age = now - new Date(latest.administeredAt).getTime();
      if (age > OVERDUE_MS) {
        const weeks = Math.round(age / (7 * 24 * 60 * 60 * 1000));
        overdue.push({ ...base, severity: "overdue", text: `${inst.shortName} re-administration overdue (last: ${weeks} weeks ago)` });
      }
    }
    // Elevated C-SSRS goes ABOVE deteriorations. Safety-plan existence +
    // reviewedAt are lean-safe metadata; content stays encrypted.
    const elevatedEntries = [...latestCategoricalByClient.entries()]
      .filter(([, a]) => a.tier === "moderate" || a.tier === "high");
    const plansByClient = elevatedEntries.length
      ? new Set(
          (await SafetyPlan.find({ practiceId, clientId: { $in: elevatedEntries.map(([cid]) => cid) } })
            .select("clientId").lean()).map((p) => p.clientId.toString())
        )
      : new Set();
    const risk = elevatedEntries.map(([cid, a]) => ({
      clientId: cid,
      clientName: clientName(cid),
      date: a.administeredAt,
      severity: "risk",
      text: `${a.shortName} elevated (${a.tier})${plansByClient.has(cid) ? "" : " · no safety plan on file"}`,
    }));

    const byRecency = (a, b) => new Date(b.date) - new Date(a.date);
    const signals = [
      ...risk.sort(byRecency),
      ...worsened.sort(byRecency),
      ...overdue.sort(byRecency),
      ...improved.sort(byRecency),
    ].slice(0, 5);

    // --- Schedule enrichment (additive fields on existing items) ---------
    const firstSessionDateByClient = new Map();
    for (const s of sessionsLean) {
      const cid = s.clientId.toString();
      const cur = firstSessionDateByClient.get(cid);
      if (!cur || new Date(s.date) < new Date(cur)) firstSessionDateByClient.set(cid, s.date);
    }
    const prepSessionIds = new Set(
      treatmentsLean.filter((t) => t.sessionId).map((t) => t.sessionId.toString())
    );
    const pendingConsentClients = new Set(consentSeen);

    const todaysAppointments = todaysAppointmentsRaw.map((s) => {
      const cid = s.clientId?._id?.toString() ?? null;
      return {
        id: s._id.toString(),
        clientName: s.clientId?.name ?? "Unknown",
        date: s.date,
        format: s.format,
        type: s.type,
        clientId: cid,
        isFirstSession:
          cid != null &&
          new Date(firstSessionDateByClient.get(cid) ?? s.date).getTime() === new Date(s.date).getTime(),
        prepReady: prepSessionIds.has(s._id.toString()),
        consentPending: cid != null && pendingConsentClients.has(cid),
      };
    });

    // Format recent activity
    const recentActivity = [
      ...recentSessions.map((session) => ({
        type: "session",
        date: session.createdAt,
        clientName: session.clientId?.name || "Unknown Client",
        status: session.status,
        id: session._id.toString(),
        duration: session.duration,
      })),
      ...recentReports.map((report) => ({
        type: "report",
        date: report.createdAt,
        clientName: report.clientId?.name || "Unknown Client",
        status: report.status,
        reportType: report.type,
        id: report._id.toString(),
        // Needed to deep-link to the real viewer at /clients/:cid/reports/:rid/view.
        clientId: report.clientId?._id?.toString() ?? null,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return NextResponse.json({
      totalClients,
      activeSessions,
      completedSessions,
      reportsGenerated,
      recentActivity,
      todaysAppointments,
      upcomingThisWeek,
      timezone: tz,
      reviewQueue,
      reviewTotal,
      signals,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
});
