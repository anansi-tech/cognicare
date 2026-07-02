"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from "recharts";

export function MeasureTrend({ clientId, instrumentId, refreshKey }) {
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/measures?instrumentId=${instrumentId}`)
      .then((r) => r.json()).then(setTrend);
  }, [clientId, instrumentId, refreshKey]);

  if (!trend || !trend.points?.length) return null;

  if (trend.points.length === 1) {
    const only = trend.points[0];
    const pct = trend.percentageFactor ? only.total * trend.percentageFactor : null;
    return (
      <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 16, boxShadow: "0 20px 46px -40px rgba(11,43,107,.35)", padding: "18px 20px" }}>
        <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 15, margin: 0, color: "#0B2B6B" }}>{trend.shortName ?? trend.name}</h3>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
          <span style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 30, color: "#0B2B6B" }}>{only.total}</span>
          <span style={{ fontSize: 13, color: "#8298BC" }}>/ {trend.scoringMax}{pct != null ? ` (${pct}%)` : ""} · {only.band}</span>
          {only.isBaseline && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#A9821F", background: "#FBF2DA", padding: "2px 9px", borderRadius: 999 }}>Baseline</span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "#8298BC", lineHeight: 1.5, margin: "14px 0 0" }}>
          Insufficient data for a trend — administer the measure again to see change over time.
        </p>
      </div>
    );
  }

  const directionColor = trend.direction === "worsened" ? "#C0392B" : trend.direction === "improved" ? "#3B9E57" : "#55698F";

  const data = trend.points.map((p) => ({
    date: new Date(p.date).toLocaleDateString(),
    score: p.total,
    flagged: (p.flags ?? []).length > 0,
    isBaseline: p.isBaseline ?? false,
  }));

  const pct = trend.percentageFactor ? `${trend.latest * trend.percentageFactor}%` : null;
  const latestLabel = `Latest score ${trend.latest} of ${trend.scoringMax}${pct ? ` (${pct})` : ""}`;

  return (
    <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 16, boxShadow: "0 20px 46px -40px rgba(11,43,107,.35)", padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 15, margin: 0, color: "#0B2B6B" }}>
          {trend.shortName ?? trend.name}{" "}
          <span style={{ fontWeight: 500, color: directionColor, fontSize: 13 }}>— {trend.direction}</span>
        </h3>
        <span style={{ fontSize: 11.5, color: "#8298BC", whiteSpace: "nowrap", flexShrink: 0 }}>{latestLabel}</span>
      </div>
      <div style={{ marginTop: 14 }}>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <XAxis dataKey="date" fontSize={11} />
            <YAxis domain={[0, "dataMax"]} fontSize={11} />
            <Tooltip />
            <Line
              type="monotone" dataKey="score" stroke="#2F80FF" strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload, index } = props;
                const r = payload.flagged ? 5 : payload.isBaseline ? 5 : 3.5;
                const fill = payload.flagged ? "#C0392B" : payload.isBaseline ? "#d97706" : "#2F80FF";
                return <Dot key={index} cx={cx} cy={cy} r={r} fill={fill} />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, color: "#8298BC" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d97706", display: "inline-block" }} />
          Baseline
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C0392B", display: "inline-block" }} />
          Safety flag
        </span>
      </div>
    </div>
  );
}
