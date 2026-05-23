# Round 3 — Measurement-Based Care: Capture + Trends

> Hand to Claude Code. Branch `dev`, working dir `products/cognicare`. You have the repo.
> Round 1 built the MBC engine (instruments, `scoreInstrument`, `MeasureAdministration`, `getTrend`)
> but nothing feeds or shows it. This round adds the therapist-facing flow: administer a measure,
> store the scored result, and see the trend — and surfaces the suicidal-ideation flag the moment
> it's endorsed.

## The loop this closes

Assessment agent recommends instruments → therapist administers them in-app → scored result is
stored → trend chart shows progress with reliable-change → Progress agent and LIAM already consume
that trend (Rounds 1 & 2). After this round the data actually flows.

## Scope guard

Therapist-administered, in-app, on the client page. **Not** in scope: client-portal
self-administration, org-wide analytics dashboards, adding new instruments beyond PHQ-9/GAD-7
(the registry takes more later), TanStack Query (later UX round — use plain `fetch` here).

---

## Part A — API

### `src/app/api/instruments/route.js`
```js
import { NextResponse } from "next/server";
import { listInstruments } from "@/lib/mbc/instruments";

export async function GET() {
  return NextResponse.json(listInstruments()); // [{ id, name, construct }]
}
```

### `src/app/api/instruments/[id]/route.js`
```js
import { NextResponse } from "next/server";
import { getInstrument } from "@/lib/mbc/instruments";

export async function GET(_req, { params }) {
  const { id } = await params;
  try {
    return NextResponse.json(getInstrument(id)); // full def: stem, items, responseOptions, bands
  } catch {
    return NextResponse.json({ error: "Unknown instrument" }, { status: 404 });
  }
}
```

### `src/app/api/clients/[id]/measures/route.js`
Submit (scored server-side — never trust a client-sent score) and read the trend.
```js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MeasureAdministration from "@/models/measureAdministration";
import { scoreInstrument } from "@/lib/mbc/score";
import { getTrend } from "@/lib/mbc/trend";

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;
  const { instrumentId, responses, sessionId } = await req.json();
  if (!instrumentId || !responses) {
    return NextResponse.json({ error: "instrumentId and responses required" }, { status: 400 });
  }

  const { total, severityBand, flags, complete } = scoreInstrument(instrumentId, responses);
  if (!complete) return NextResponse.json({ error: "Answer all items" }, { status: 400 });

  await connectDB();
  const doc = await MeasureAdministration.create({
    userId: user.id, clientId, sessionId, instrumentId, responses, total, severityBand, flags,
  });
  return NextResponse.json({ id: doc._id, total, severityBand, flags });
}

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;
  const instrumentId = req.nextUrl.searchParams.get("instrumentId");
  if (!instrumentId) return NextResponse.json({ error: "instrumentId required" }, { status: 400 });
  return NextResponse.json(await getTrend(clientId, instrumentId, 12));
}
```

---

## Part B — shadcn additions

```bash
npx shadcn@latest add radio-group card alert badge select label
```

---

## Part C — Capture UI

### `src/components/measures/MeasureForm.jsx`
Fetches the instrument definition, renders one row per item with its response options, submits, and
shows the scored result. **Server scores it** — this form only collects responses.

```jsx
"use client";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MeasureResult } from "./MeasureResult";

export function MeasureForm({ clientId, instrumentId, sessionId, onSaved }) {
  const [inst, setInst] = useState(null);
  const [responses, setResponses] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/instruments/${instrumentId}`).then((r) => r.json()).then(setInst);
  }, [instrumentId]);

  if (!inst) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (result) return <MeasureResult instrument={inst} result={result} />;

  const answered = inst.items.every((it) => responses[it.id] !== undefined);

  const submit = async () => {
    setSubmitting(true); setError("");
    const payload = {
      instrumentId,
      sessionId,
      responses: inst.items.map((it) => ({ itemId: it.id, value: responses[it.id] })),
    };
    const res = await fetch(`/api/clients/${clientId}/measures`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed to save"); return; }
    const saved = await res.json();
    setResult(saved);
    onSaved?.(saved);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{inst.stem}</p>
      {inst.items.map((it, i) => (
        <div key={it.id} className="space-y-2 border-b pb-3">
          <Label className="text-sm">{i + 1}. {it.text}</Label>
          <RadioGroup
            className="flex flex-wrap gap-3"
            value={responses[it.id]?.toString()}
            onValueChange={(v) => setResponses((r) => ({ ...r, [it.id]: Number(v) }))}
          >
            {inst.responseOptions.map((opt) => (
              <div key={opt.value} className="flex items-center gap-1.5">
                <RadioGroupItem value={opt.value.toString()} id={`${it.id}-${opt.value}`} />
                <Label htmlFor={`${it.id}-${opt.value}`} className="text-xs font-normal">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={submit} disabled={!answered || submitting}>
        {submitting ? "Scoring…" : "Submit"}
      </Button>
    </div>
  );
}
```

### `src/components/measures/MeasureResult.jsx`
Shows score + band, and — critically — surfaces a flag calmly but unmissably. **Safety wording must
be measured, not alarmist; never describe methods.**

```jsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function MeasureResult({ instrument, result }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold">{result.total}</span>
        <span className="text-sm text-muted-foreground">/ {instrument.scoring.max}</span>
        <Badge variant="secondary">{result.severityBand}</Badge>
      </div>
      {result.flags?.some((f) => f.flag === "suicidal-ideation") && (
        <Alert variant="destructive">
          <AlertTitle>Safety item endorsed</AlertTitle>
          <AlertDescription>
            This response set includes a non-zero answer on the self-harm item. Consider a safety
            review with the client before the session ends.
          </AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-muted-foreground">Saved. The trend updates below.</p>
    </div>
  );
}
```

---

## Part D — Trend chart (recharts is already a dependency)

### `src/components/measures/MeasureTrend.jsx`
Score-over-time with severity bands shaded, flagged administrations marked, and the latest
reliable-change called out. Lower score = improvement for PHQ-9/GAD-7.

```jsx
"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, ResponsiveContainer, Dot } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function MeasureTrend({ clientId, instrumentId, refreshKey }) {
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/measures?instrumentId=${instrumentId}`)
      .then((r) => r.json()).then(setTrend);
  }, [clientId, instrumentId, refreshKey]);

  if (!trend || trend.direction === "insufficient-data" || !trend.points?.length) {
    return null; // nothing to chart yet
  }

  const data = trend.points.map((p) => ({
    date: new Date(p.date).toLocaleDateString(),
    score: p.total,
    flagged: (p.flags ?? []).length > 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {trend.name} — {trend.direction}
          {trend.reliableChange && trend.direction !== "unchanged" && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (reliable change: {trend.delta > 0 ? "+" : ""}{trend.delta})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <XAxis dataKey="date" fontSize={11} />
            <YAxis domain={[0, "dataMax"]} fontSize={11} />
            <Tooltip />
            <Line
              type="monotone" dataKey="score" strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                return <Dot cx={cx} cy={cy} r={payload.flagged ? 5 : 3}
                  fill={payload.flagged ? "var(--destructive)" : "var(--primary)"} />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

> Optionally shade severity bands with `<ReferenceArea>` per band (`y1`/`y2` from
> `instrument.bands`). Nice-to-have, not required — keep it readable first.

---

## Part E — Wire into the client page

In `src/app/components/clients/ClientDetail.js`, add a **Measures** section (a new tab, or a card on
the overview — match the existing pattern, don't restructure the page):

- A small "Administer measure" control: an instrument `Select` (from `GET /api/instruments`) + a
  button that opens a `Sheet`/`Dialog` containing `<MeasureForm clientId instrumentId sessionId? />`.
- Below it, render `<MeasureTrend clientId instrumentId />` for each instrument that has data
  (phq9, gad7 to start). Pass a `refreshKey` you bump in the form's `onSaved` so the chart re-fetches
  after a new administration.
- If the open Assessment report lists `recommendedInstruments`, show them as quick-administer chips
  here (closes the assessment→measure loop). Optional but high-value.

Keep all new UI in `src/components/measures/`; touch `ClientDetail.js` minimally.

---

## Acceptance criteria (smoke)

1. `GET /api/instruments` → PHQ-9 + GAD-7 list. `GET /api/instruments/phq9` → full definition.
2. On a client page, open the administer flow, answer all 9 PHQ-9 items, submit → a
   `MeasureAdministration` doc is created with a **server-computed** `total`/`severityBand`
   (confirm the client never sends a score).
3. Submitting a set with the self-harm item > 0 shows the destructive safety alert; with it = 0, no alert.
4. After two administrations (e.g. 18 then 11), the trend card renders, shows "improved", and notes
   reliable change (−7). The flagged administration's point is visibly marked.
5. Re-administering updates the chart without a page reload (refreshKey).
6. Open LIAM on that client and ask about progress — it now cites the real trend you just entered.
7. `npm run lint` clean; no console errors.

## Suggested commits

```
feat(cognicare): MBC API — instruments + scored administration + trend
chore(cognicare): shadcn radio-group, card, alert, badge, select, label
feat(cognicare): measure capture form with server-side scoring + safety flag
feat(cognicare): measure trend chart (recharts) on client page
```

## After 3: the clinical core is complete

Agents (R1), LIAM (R2), MBC capture + trends (R3) — the product premise is now real and usable.
Remaining are the plan's infrastructure rounds: pricing rip-out (Stripe-as-source-of-truth),
Auth.js v5 + MFA, DB hardening (discriminators + field-level PHI encryption), and the full UX/theme
pass. None block your wife from trialing the clinical workflow on synthetic data — which, with the
PHI gate still open, is exactly where to get her feedback before we build billing and auth on top.
