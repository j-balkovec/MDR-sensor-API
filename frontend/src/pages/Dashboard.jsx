// Jakob Balkovec
// Dashboard.jsx

import { useEffect, useState, useRef } from "react";
import { fetchDevices } from "../api/client";
import LiveChart from "../components/LiveChart";
import { API_BASE_URL } from "../api/config.js";
import { ADMIN_KEY } from "../api/config";
import useAuth from "../hooks/useAuth";

const WS_URL = "ws://127.0.0.1:8000/ws/updates";
const WS_KEY = "super_secret_api_key";

// Seattle time formatter
function formatSeattleTime(ts) {
  const date = new Date(ts);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export default function Dashboard() {
  const { token, user, initGoogleLogin, logout } = useAuth();
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceData, setDeviceData] = useState({});
  const [tooltipData, setTooltipData] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);

  const [newDevEUI, setNewDevEUI] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newLat, setNewLat] = useState("");
  const [newLon, setNewLon] = useState("");
  const [newStatus, setNewStatus] = useState("active");
  const [newNotes, setNewNotes] = useState("");

  const wsRef = useRef(null);

  useEffect(() => {
    fetchDevices().then(setDevices).catch(console.error);
  }, []);

  // Fetch cached history
  const fetchHistory = (dev) => {
    fetch(`${API_BASE_URL}/api/readings/${dev}?limit=100`)
      .then((res) => res.json())
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setDeviceData((prev) => ({
          ...prev,
          [dev]: rows.map((r) => ({
            ts: new Date(r.timestamp + "Z").getTime(),
            moisture_pct: r.moisture_pct,
            raw_value: r.raw_value,
          })),
        }));
      })
      .catch(console.error);
  };

  const handleAddDevice = () => {
    if (!newDevEUI.trim()) return;

      fetch(`${API_BASE_URL}/api/device`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          dev_eui: newDevEUI.trim(),
          nickname: newNickname || newDevEUI.trim(),
          latitude: newLat ? parseFloat(newLat) : null,
          longitude: newLon ? parseFloat(newLon) : null,
          status: newStatus,
          notes: newNotes || null,
        }),
      })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to add device");
        }
        return res.json();
      })
      .then(() => {
        setDevices(prev => [
          ...prev,
          {
            dev_eui: newDevEUI.trim(),
            nickname: newNickname || newDevEUI.trim(),
            status: newStatus,
          },
        ]);

        setShowAddModal(false);
        setNewDevEUI("");
        setNewNickname("");
        setNewLat("");
        setNewLon("");
        setNewStatus("active");
        setNewNotes("");
      })
      .catch((err) => alert(err.message));
  };

  // WebSocket listener
  useEffect(() => {
    const ws = new WebSocket(WS_URL, [WS_KEY]);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const dev = msg.dev_eui;
        const point = {
          ts: msg.timestamp * 1000,
          moisture_pct: msg.moisture_pct,
          raw_value: msg.raw_value,
        };

        setDeviceData((prev) => ({
          ...prev,
          [dev]: [...(prev[dev] || []).slice(-99), point],
        }));

        if (dev === selectedDevice) setTooltipData(point);
      } catch (e) {
        console.error("WS parse:", e);
      }
    };

    return () => ws.close();
  }, [selectedDevice]);

  // Styling constants
  const page = {
    width: "100%",
    maxWidth: "100vw",
    minHeight: "auto",
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    background: "#f3f4f6",
    fontFamily: "'Inter', sans-serif",
    overflowX: "hidden",
  };

  const sidebar = {
    padding: "0px 20px",
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    maxHeight: "94.3%",
    gap: 20,
    overflowX: "auto",
    borderRadius: 16,
    position: "relative",
    zIndex: 1,
  };

  const main = {
    paddingLeft: "32px",
    paddingBottom: "100px",
    display: "flex",
    flexDirection: "column",
    gap: 32,
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
    position: "relative",
    zIndex: 1, // added
  };

  const deviceItem = (dev) => ({
    cursor: "pointer",
    padding: "10px 14px",
    borderRadius: 8,
    background: selectedDevice === dev ? "#2563eb" : "#e5e7eb",
    color: selectedDevice === dev ? "#ffffff" : "#111827",
    fontWeight: 600,
    transition: "0.15s",
    whiteSpace: "nowrap",
  });

  const card = {
    width: "100%",
    background: "#ffffff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  };

  const confirmBtn = {
    background: "#2563eb",
    color: "#fff",
    borderRadius: 6,
    padding: "6px 12px",
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
  };

  const cancelBtn = {
    background: "#e5e7eb",
    borderRadius: 6,
    padding: "6px 12px",
    border: "none",
    cursor: "pointer",
  };

  const input = {
    padding: 8,
    borderRadius: 6,
    border: "1px solid #d1d5db",
  };

  const primaryBtn = {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    width: 75,
    height: 38,
    fontWeight: 700,
    fontSize: 20,
    cursor: "pointer",
    transition: "background 0.18s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
  };

  const primaryBtnHover = {
    background: "#1e40af",
  };

  const deleteBtn = {
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  borderRadius: 8,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  transition: "all 0.18s",
  };

  const deleteBtnHover = {
    background: "#b91c1c",
    color: "#fff",
    borderColor: "#b91c1c",
  };

  const statusStyle = (status) => {
    const base = {
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 6px",
      borderRadius: 6,
      alignSelf: "flex-start",
      textTransform: "capitalize",
    };

    switch (status) {
      case "active":
        return { ...base, background: "#dcfce7", color: "#166534" };
      case "faulty":
        return { ...base, background: "#fee2e2", color: "#991b1b" };
      case "archived":
        return { ...base, background: "#e5e7eb", color: "#374151" };
      default:
        return base;
    }
  };

  return (
    <div style={page}>
        <div style={{
          position: "absolute",
          top: 10,
          right: 20,
          display: "flex",
          gap: 10,
          alignItems: "center"
        }}>
          {user ? (
            <>
              <img src={user.picture} alt="pfp" style={{ width: 32, height: 32, borderRadius: "50%" }} />
              <span>{user.name}</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <button onClick={initGoogleLogin}>Login</button>
          )}
      </div>
      <aside style={sidebar}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Devices</h2>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              ...primaryBtn,
              marginTop: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = primaryBtnHover.background)}
            onMouseLeave={(e) => (e.currentTarget.style.background = primaryBtn.background)}
          >
            +
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {devices.map((dev) => (
          <div
            key={dev.dev_eui}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              onClick={() => {
                setSelectedDevice(dev.dev_eui);
                setTooltipData(null);
                fetchHistory(dev.dev_eui);
              }}
              style={{
                ...deviceItem(dev.dev_eui),
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "10px 12px",
              }}
            >
              <span style={{ fontWeight: 700 }}>
                {dev.nickname || dev.dev_eui}
              </span>
              <span style={statusStyle(dev.status)}>
                {dev.status}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                  fetch(`${API_BASE_URL}/api/device/${dev.dev_eui}`, {
                    method: "DELETE",
                    headers: {
                      "Authorization": `Bearer ${token}`,
                    }
                  })
                  .then(() => {
                    setDevices((prev) => prev.filter((d) => d.dev_eui !== dev.dev_eui));
                    if (selectedDevice === dev.dev_eui) {
                      setSelectedDevice(null);
                      setTooltipData(null);
                    }
                  })
                  .catch(console.error);
              }}
              style={deleteBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = deleteBtnHover.background;
                e.currentTarget.style.color = deleteBtnHover.color;
                e.currentTarget.style.borderColor = deleteBtnHover.borderColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = deleteBtn.background;
                e.currentTarget.style.color = deleteBtn.color;
                e.currentTarget.style.borderColor = deleteBtn.borderColor;
              }}
            >
              ✕
            </button>
          </div>
        ))}
        </div>
      </aside>

      <main style={main}>
        <div style={card}>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Live Soil Moisture</h2>
          <div style={{ height: 400 }}>
            {selectedDevice ? (
              <LiveChart
                data={{ [selectedDevice]: deviceData[selectedDevice] || [] }}
                formatTime={formatSeattleTime}
              />
            ) : (
              <p>Select a device to view data</p>
            )}
          </div>

          {tooltipData && (
            <div style={{ marginTop: 16 }}>
              <strong>Time:</strong> {formatSeattleTime(tooltipData.ts)} |
              <strong> Moisture:</strong> {tooltipData.moisture_pct.toFixed(1)}% |
              <strong> Raw:</strong> {tooltipData.raw_value}
            </div>
          )}
        </div>

        {selectedDevice && (
          <div style={card}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Recent Readings</h2>
              <div
                style={{
                  maxHeight: "100%",
                  overflowY: "auto",
                  overflowX: "hidden",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <thead style={{ background: "#f9fafb" }}>
                    <tr>
                      <th style={{ padding: 10, textAlign: "left" }}>Timestamp</th>
                      <th style={{ padding: 10, textAlign: "left" }}>Moisture %</th>
                      <th style={{ padding: 10, textAlign: "left" }}>Raw</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(deviceData[selectedDevice] || []).map((d, i) => (
                      <tr key={i}>
                        <td style={{ padding: 8 }}>{formatSeattleTime(d.ts)}</td>
                        <td style={{ padding: 8 }}>{d.moisture_pct.toFixed(1)}%</td>
                        <td style={{ padding: 8 }}>{d.raw_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            paddingTop: "20px",
            zIndex: 999,
          }}
        >
          <form
            onSubmit={(e) => e.preventDefault()}
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              width: "350px",  // slightly wider for better layout
              maxWidth: "90vw",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
              position: "relative",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              Add Device
            </h3>

            <input
              value={newDevEUI}
              onChange={(e) => setNewDevEUI(e.target.value)}
              placeholder="Device EUI"
              style={input}
            />

            <input
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder="Nickname (optional)"
              style={input}
            />

            <input
              value={newLat}
              onChange={(e) => setNewLat(e.target.value)}
              placeholder="Latitude (optional)"
              style={input}
            />

            <input
              value={newLon}
              onChange={(e) => setNewLon(e.target.value)}
              placeholder="Longitude (optional)"
              style={input}
            />

            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              style={input}
            >
              <option value="active">Active</option>
              <option value="faulty">Faulty</option>
              <option value="archived">Archived</option>
            </select>

            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notes (optional)"
              style={{ ...input, minHeight: 60 }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={cancelBtn}
              >
                Cancel
              </button>
              <button type="button" onClick={handleAddDevice} style={confirmBtn}>
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
