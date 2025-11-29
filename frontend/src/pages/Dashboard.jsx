// Jakob Balkovec
// Nov 28th 2025
// Dashboard.jsx

import { useEffect, useState, useRef } from "react";
import { fetchDevices } from "../api/client";
import LiveChart from "../components/LiveChart";

const WS_URL = "ws://127.0.0.1:8000/ws/updates";
const WS_KEY = "super_secret_api_key";

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [liveData, setLiveData] = useState([]);
  const [filter, setFilter] = useState("all");
  const [tooltipData, setTooltipData] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices().then(setDevices).catch(console.error);
  }, []);

  // WebSocket connection for live updates
  useEffect(() => {
    if (!selectedDevice) return;

    const connectWS = () => {
      const ws = new WebSocket(WS_URL, [WS_KEY]);
      wsRef.current = ws;

      ws.onopen = () => console.log("[WS] Connected for", selectedDevice);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.dev_eui !== selectedDevice) return;

          const newPoint = {
            ts: msg.timestamp * 1000,
            moisture: msg.moisture_pct,
            raw: msg.raw_value,
          };

          // Use functional update to avoid stale state
          setLiveData((prev) => [...prev.slice(-99), { ...newPoint }]);
          setTooltipData({ ...newPoint });
        } catch (err) {
          console.error("[WS] Parse error:", err);
        }
      };

      ws.onclose = () => {
        console.warn("[WS] Closed, reconnecting in 2s...");
        reconnectRef.current = setTimeout(connectWS, 2000);
      };

      ws.onerror = (err) => {
        console.error("[WS] Error", err);
        ws.close();
      };
    };

    connectWS();

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedDevice]);

  // Styles
  const containerStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 3fr",
    gap: 24,
    padding: 32,
    width: "80vw",
    minHeight: "80vh",
    margin: "0 auto",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    boxShadow: "0 12px 48px rgba(0,0,0,0.12)",
    fontFamily: "'Inter', sans-serif",
  };

  const sidebarStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    background: "#ffffff",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  };

  const mainStyle = { display: "flex", flexDirection: "column", gap: 24 };

  const deviceItemStyle = (dev) => ({
    cursor: "pointer",
    padding: "10px 14px",
    borderRadius: 6,
    background: selectedDevice === dev ? "#2563eb" : "#e5e7eb",
    color: selectedDevice === dev ? "#fff" : "#111827",
    fontWeight: 500,
    transition: "all 0.2s ease-in-out",
    userSelect: "none",
  });

  const dropdownStyle = {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    width: "100%",
    fontSize: 16,
  };

  const tableStyle = { width: "100%", borderCollapse: "collapse" };
  const thTdStyle = { padding: "8px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "left" };

  return (
    <div style={containerStyle}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Devices</h2>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {devices.map((dev) => (
            <li
              key={dev}
              onClick={() => {
                setSelectedDevice(dev);
                setLiveData([]);
                setTooltipData(null);
              }}
              style={deviceItemStyle(dev)}
            >
              {dev}
            </li>
          ))}
        </ul>

        <label style={{ marginTop: 24, fontWeight: 500 }}>Filter:</label>
        <select style={dropdownStyle} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="high">High Moisture</option>
          <option value="low">Low Moisture</option>
        </select>
      </aside>

      {/* Main Content */}
      <main style={mainStyle}>
        <h2 style={{ fontSize: 24, fontWeight: 600 }}>Live Chart</h2>
        <div
          style={{
            width: "100%",
            height: 450,
            padding: 16,
            borderRadius: 16,
            background: "linear-gradient(180deg, #ffffff, #f3f4f6)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            position: "relative",
          }}
        >
          {selectedDevice ? (
            <LiveChart data={liveData.length ? liveData : null} />
          ) : (
            <p style={{ color: "#6b7280", fontSize: 16 }}>Select a device to view live updates</p>
          )}

          {/* Floating toolbox */}
          {tooltipData && (
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "#ffffff",
                padding: 12,
                borderRadius: 8,
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                fontSize: 14,
                minWidth: 150,
              }}
            >
              <div><strong>Time:</strong> {new Date(tooltipData.ts).toLocaleTimeString()}</div>
              <div><strong>Moisture:</strong> {tooltipData.moisture.toFixed(1)}%</div>
              <div><strong>Raw:</strong> {tooltipData.raw ?? "-"}</div>
            </div>
          )}
        </div>

        {/* Recent Readings Table */}
        <h2 style={{ fontSize: 24, fontWeight: 600, marginTop: 32 }}>Recent Readings</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thTdStyle}>Timestamp</th>
              <th style={thTdStyle}>Moisture %</th>
              <th style={thTdStyle}>Raw Value</th>
            </tr>
          </thead>
          <tbody>
            {liveData.map((d, i) => (
              <tr key={d.ts + "-" + i}>
                <td style={thTdStyle}>{new Date(d.ts).toLocaleTimeString()}</td>
                <td style={thTdStyle}>{d.moisture.toFixed(1)}%</td>
                <td style={thTdStyle}>{d.raw ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
