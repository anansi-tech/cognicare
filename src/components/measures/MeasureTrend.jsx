"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function MeasureTrend({ clientId, instrumentId, refreshKey }) {
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/measures?instrumentId=${instrumentId}`)
      .then((r) => r.json()).then(setTrend);
  }, [clientId, instrumentId, refreshKey]);

  if (!trend || !trend.points?.length) return null; // truly no data yet

  // Exactly one administration — show the score so the therapist sees their entry
  // landed, plus a note that a trend appears with the next one.
  if (trend.points.length === 1) {
    const only = trend.points[0];
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{trend.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold">{only.total}</span>
            <span className="text-sm text-muted-foreground">· {only.band}</span>
            {only.isBaseline && (
              <span className="text-xs font-medium text-amber-600">Baseline</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Insufficient data for a trend — administer the measure again to see change over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = trend.points.map((p) => ({
    date: new Date(p.date).toLocaleDateString(),
    score: p.total,
    flagged: (p.flags ?? []).length > 0,
    isBaseline: p.isBaseline ?? false,
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
                const { cx, cy, payload, index } = props;
                const r = payload.flagged ? 5 : payload.isBaseline ? 5 : 3;
                const fill = payload.flagged ? "var(--destructive)" : payload.isBaseline ? "#d97706" : "var(--primary)";
                return <Dot key={index} cx={cx} cy={cy} r={r} fill={fill} />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
