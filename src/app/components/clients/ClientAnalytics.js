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
      <div className="p-4 text-gray-600 flex items-center gap-2">
        <span className="animate-spin">⏳</span> Crunching the numbers...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 flex items-center gap-2">
        <span className="text-xl">⚠️</span> Oops! {error}
      </div>
    );
  }

  const riskTimeline = analytics?.riskTimeline ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-xl">🚨</span> Risk Level Over Time
        </h3>
        {riskTimeline.length === 0 ? (
          <p className="text-sm text-gray-500">
            No assessment reports yet — risk timeline will appear here once assessments are
            generated.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={riskTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
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
                stroke="#ff7300"
                name="Risk Level"
                strokeWidth={2}
                dot={{ r: 4, fill: "#ff7300" }}
                activeDot={{ r: 6, fill: "#ff7300" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
