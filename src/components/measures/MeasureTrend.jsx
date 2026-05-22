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
