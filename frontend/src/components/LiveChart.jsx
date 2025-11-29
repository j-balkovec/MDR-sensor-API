// Jakob Balkovec
// Live Moisture Chart with Debug
// LiveChart.jsx

import { useEffect, useState } from "react";
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

export default function LiveChartDebug({ wsUrl, wsKey, selectedDevice }) {
  const [data, setData] = useState([]);
  const [lastPackets, setLastPackets] = useState([]);

  useEffect(() => {
    if (!selectedDevice) return;

    const ws = new WebSocket(wsUrl, [wsKey]);

    ws.onopen = () => console.log(`[WS] Connected for ${selectedDevice}`);

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.dev_eui !== selectedDevice) return;

        const entry = {
          ts: msg.timestamp * 1000,
          moisture: msg.moisture_pct,
          raw: msg.raw_value,
        };

        // Maintain last 100 points
        setData((prev) => [...prev.slice(-99), entry]);

        // Maintain last 5 packets for debug panel
        setLastPackets((prev) => [entry, ...prev.slice(0, 4)]);
      } catch (err) {
        console.error("[WS PARSE ERROR]", err);
      }
    };

    ws.onclose = () => console.warn("[WS] Closed, attempting reconnect...");

    ws.onerror = (err) => {
      console.error("[WS] Error", err);
      ws.close();
    };

    return () => ws.close();
  }, [selectedDevice, wsUrl, wsKey]);

  if (!selectedDevice) {
    return (
      <div style={{ textAlign: "center", color: "#6b7280", paddingTop: 40 }}>
        Select a device to view live readings
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 400, position: "relative", fontFamily: "'Inter', sans-serif" }}>
      {/* Floating debug panel */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          background: "rgba(255,255,255,0.95)",
          padding: 12,
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          fontSize: 12,
          minWidth: 180,
        }}
      >
        <strong style={{ display: "block", marginBottom: 6 }}>Last 5 packets</strong>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {lastPackets.map((p, i) => (
            <li
              key={p.ts + "-" + i}
              style={{
                padding: "2px 0",
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? "#2563eb" : "#111827",
              }}
            >
              {new Date(p.ts).toLocaleTimeString()} | {p.moisture.toFixed(1)}% | {p.raw ?? "-"}
            </li>
          ))}
        </ul>
      </div>

      {/* Live chart */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["auto", "auto"]}
            tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
          />
          <YAxis domain={[0, 100]} unit="%" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6, backgroundColor: "#ffffff" }}
            labelFormatter={(ts) => `Time: ${new Date(ts).toLocaleTimeString()}`}
          />
          <Legend verticalAlign="top" height={36} />
          <Line
            type="monotone"
            dataKey="moisture"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            name="Soil Moisture"
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
