"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Spinner } from "@/components/ui/Spinner";

export default function ClientAnalytics({ clientId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}/analytics`);
        if (!response.ok) throw new Error("Failed to fetch analytics");
        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [clientId]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 16, boxShadow: "0 20px 46px -40px rgba(11,43,107,.35)", padding: "28px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Spinner size={40} />
        <p style={{ fontSize: 13, color: "#8298BC", margin: 0 }}>Loading risk data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, padding: "12px 16px", fontSize: 14, color: "#C0392B" }}>
        {error}
      </div>
    );
  }

  const riskTimeline = analytics?.riskTimeline ?? [];

  return (
    <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 16, boxShadow: "0 20px 46px -40px rgba(11,43,107,.35)", padding: "20px 22px" }}>
      {riskTimeline.length === 0 ? (
        <p style={{ fontSize: 13, color: "#8298BC", margin: 0 }}>
          No assessment reports yet — risk timeline will appear here once assessments are generated.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={riskTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} />
            <YAxis
              domain={[0, 4]}
              width={50}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) =>
                ({ 0: "None", 1: "Low", 2: "Mod", 3: "High", 4: "Imm" }[v] ?? v)
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-2 border border-border rounded shadow-lg">
                      <p className="font-medium text-primary">{formatDate(label)}</p>
                      <p className="text-gray-700">
                        Risk: {payload[0].payload.levelText || "Unknown"}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="level"
              stroke="var(--chart-4)"
              name="Risk Level"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--chart-4)" }}
              activeDot={{ r: 6, fill: "var(--chart-4)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
