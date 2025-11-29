// Jakob Balkovec
// LiveChart.jsx (fixed multi-device rendering)

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];

export default function LiveChart({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div style={{ textAlign: "center", color: "#6b7280", paddingTop: 40 }}>
        Waiting for live data…
      </div>
    );
  }

  // Build merged data with separate series keys per device
  const merged = [];
  Object.entries(data).forEach(([dev, arr]) => {
    arr.forEach((p) => {
      merged.push({
        ts: p.ts,
        raw_value: p.raw_value,
        [`moisture_pct_${dev}`]: p.moisture_pct, // <-- UNIQUE KEY
      });
    });
  });

  return (
    <div
      style={{
        width: "100%",
        height: 420,
        minWidth: 500,
        minHeight: 320,
        overflow: "hidden",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["auto", "auto"]}
            tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
          />

          <YAxis domain={[0, 100]} unit="%" />
          <Tooltip labelFormatter={(ts) => new Date(ts).toLocaleTimeString()} />
          <Legend />

          {/* One line per device */}
          {Object.keys(data).map((dev, i) => (
            <Line
              key={dev}
              type="monotone"
              dataKey={`moisture_pct_${dev}`}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              name={dev}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
