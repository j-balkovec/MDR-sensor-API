// Jakob Balkovec
// Dashboard.jsx – Dark Mode Ops Console

import { useEffect, useState, useRef } from "react";
import { fetchDevices } from "../api/client";
import LiveChart from "../components/LiveChart";
import { API_BASE_URL } from "../api/config.js";
import { ADMIN_KEY } from "../api/config";
import useAuth from "../hooks/useAuth";

// --- Production URLs behind Apache reverse proxy ---
export const API_BASE = "https://dev.loralab.org/api";
const WS_URL = "wss://dev.loralab.org/ws/updates";
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
  const { token, user, isAdmin, initGoogleLogin, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
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
        Authorization: `Bearer ${token}`,
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
        setDevices((prev) => [
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

  // Styling – Dark Mode Ops Console
  const page = {
    width: "100vw",
    height: "100vh",
    display: "grid",
    gridTemplateColumns: "280px auto",
    background: "radial-gradient(circle at top, #020617 0%, #020617 40%, #020617 100%)",
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#e5e7eb",
    overflow: "hidden",
    position: "relative",
  };

  const sidebar = {
    height: "100%",
    padding: "72px 18px 24px 18px",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,1) 40%, rgba(15,23,42,1) 100%)",
    borderRight: "1px solid rgba(30,64,175,0.5)",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    overflowY: "auto",
    boxShadow: "8px 0 24px rgba(0,0,0,0.4)",
    borderRadius: "16px",
    maxHeight: "86%",
  };

  const main = {
    width: "100%",
    height: "100%",
    padding: "72px 32px 64px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    overflowY: "auto",
    overflowX: "hidden",
    position: "relative",
    zIndex: 1,
    maxHeight: "92.5%",
  };

  const deviceItem = (dev) => ({
    cursor: "pointer",
    padding: "10px 14px",
    borderRadius: 10,
    background:
      selectedDevice === dev
        ? "linear-gradient(135deg, #22c55e, #16a34a)"
        : "rgba(30,64,175,0.16)",
    color: selectedDevice === dev ? "#0b1120" : "#e5e7eb",
    fontWeight: 600,
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    border:
      selectedDevice === dev ? "1px solid rgba(22,163,74,0.7)" : "1px solid rgba(15,23,42,1)",
    boxShadow:
      selectedDevice === dev
        ? "0 0 0 1px rgba(22,163,74,0.6), 0 8px 18px rgba(22,163,74,0.28)"
        : "0 4px 10px rgba(0,0,0,0.45)",
  });

  const card = {
    width: "90%",
    background:
      "radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 55%)",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 18px 45px rgba(0,0,0,0.7)",
    border: "1px solid rgba(30,64,175,0.5)",
    backdropFilter: "blur(8px)",
    overflowY: "auto",
    marginBottom: "40px",
  };

  const confirmBtn = {
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "#0b1120",
    borderRadius: 8,
    padding: "7px 13px",
    fontWeight: 700,
    border: "1px solid rgba(21,128,61,0.9)",
    cursor: "pointer",
    fontSize: 13,
    boxShadow: "0 10px 25px rgba(21,128,61,0.45)",
    transition: "all 0.15s",
  };

  const cancelBtn = {
    background: "rgba(15,23,42,0.9)",
    borderRadius: 8,
    padding: "7px 13px",
    border: "1px solid rgba(55,65,81,0.9)",
    cursor: "pointer",
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: 500,
  };

  const input = {
    padding: 9,
    borderRadius: 8,
    border: "1px solid rgba(55,65,81,0.9)",
    background: "rgba(15,23,42,0.9)",
    color: "#e5e7eb",
    fontSize: 13,
    outline: "none",
  };

  const primaryBtn = {
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "#020617",
    border: "none",
    borderRadius: 10,
    width: 75,
    height: 38,
    fontWeight: 800,
    fontSize: 22,
    cursor: "pointer",
    transition: "transform 0.12s, box-shadow 0.12s, background 0.18s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
    boxShadow: "0 10px 25px rgba(21,128,61,0.45)",
  };

  const primaryBtnHover = {
    background: "linear-gradient(135deg, #16a34a, #15803d)",
  };

  const deleteBtn = {
    background: "rgba(127,29,29,0.12)",
    color: "#fecaca",
    border: "1px solid rgba(248,113,113,0.7)",
    borderRadius: 10,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    transition: "all 0.18s",
    boxShadow: "0 4px 10px rgba(0,0,0,0.6)",
  };

  const deleteBtnHover = {
    background: "rgba(239,68,68,0.95)",
    color: "#0b1120",
    borderColor: "rgba(248,113,113,1)",
  };

  const statusStyle = (status) => {
    const base = {
      fontSize: 11,
      fontWeight: 700,
      padding: "2px 7px",
      borderRadius: 999,
      alignSelf: "flex-start",
      textTransform: "capitalize",
      letterSpacing: 0.3,
    };

    switch (status) {
      case "active":
        return {
          ...base,
          background: "rgba(22,163,74,0.2)",
          color: "#bbf7d0",
          border: "1px solid rgba(34,197,94,0.8)",
        };
      case "faulty":
        return {
          ...base,
          background: "rgba(239,68,68,0.18)",
          color: "#fecaca",
          border: "1px solid rgba(248,113,113,0.8)",
        };
      case "archived":
        return {
          ...base,
          background: "rgba(31,41,55,0.9)",
          color: "#9ca3af",
          border: "1px solid rgba(75,85,99,0.9)",
        };
      default:
        return {
          ...base,
          background: "rgba(31,41,55,0.9)",
          color: "#e5e7eb",
          border: "1px solid rgba(55,65,81,0.9)",
        };
    }
  };

    return (
      <div style={page}>
        {/* Top-right auth cluster */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 65,
            display: "flex",
            gap: 12,
            alignItems: "center",
            zIndex: 50,
          }}
        >
          {/* New Export Button */}
          {selectedDevice && (
            <button
              onClick={() => {
                const url = `${API_BASE_URL}/api/export/${selectedDevice}`;
                fetch(url)
                  .then((res) => res.blob())
                  .then((blob) => {
                    const link = document.createElement("a");
                    link.href = window.URL.createObjectURL(blob);
                    link.download = `${selectedDevice}_readings.csv`;
                    link.click();
                  })
                  .catch(console.error);
              }}
              style={{
                background: "rgba(30,58,138,0.85)",
                color: "#e0f2fe",
                border: "1px solid rgba(96,165,250,0.45)",
                padding: "7px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                boxShadow: "0 6px 18px rgba(30,58,138,0.55)",
                cursor: "pointer",
                transition: "all .15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(29,78,216,0.95)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(30,58,138,0.85)")
              }
            >
              Export CSV
            </button>
          )}

          {user ? (
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>
                  {user.name}
                </span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                  {isAdmin ? "Admin • MDR Ops" : "Viewer"}
                </span>
              </div>

              <img
                src={user.picture}
                alt="profile"
                onClick={() => setShowUserMenu((prev) => !prev)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  cursor: "pointer",
                  border: "2px solid #22c55e",
                  objectFit: "cover",
                  boxShadow: "0 0 0 2px rgba(15,23,42,1), 0 8px 18px rgba(0,0,0,0.7)",
                }}
              />

              {showUserMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "48px",
                    right: 0,
                    background: "rgba(15,23,42,0.98)",
                    borderRadius: 14,
                    boxShadow: "0 18px 40px rgba(0,0,0,0.85)",
                    padding: "10px 16px 12px 16px",
                    zIndex: 2000,
                    width: 210,
                    border: "1px solid rgba(51,65,85,0.9)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      marginBottom: 2,
                      color: "#e5e7eb",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {user.name}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.8,
                      marginBottom: 12,
                      color: "#9ca3af",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {user.email}
                  </div>

                  {isAdmin && (
                    <div
                      style={{
                        fontSize: 11,
                        background: "rgba(34,197,94,0.12)",
                        color: "#bbf7d0",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 999,
                        marginBottom: 14,
                        border: "1px solid rgba(34,197,94,0.7)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#22c55e",
                        }}
                      ></span>
                      Admin Access
                    </div>
                  )}

                  <button
                    onClick={logout}
                    style={{
                      width: "100%",
                      background: "rgba(127,29,29,0.8)",
                      color: "#fee2e2",
                      border: "1px solid rgba(248,113,113,0.9)",
                      padding: "7px 0",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      boxShadow: "0 10px 25px rgba(127,29,29,0.7)",
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={initGoogleLogin}
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #22c55e)",
                color: "#f9fafb",
                fontWeight: 600,
                border: "1px solid rgba(59,130,246,0.9)",
                borderRadius: 999,
                padding: "7px 16px",
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.18s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 25px rgba(30,64,175,0.65)",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(135deg, #1e40af, #16a34a)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(135deg, #1d4ed8, #22c55e)";
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "2px solid #bbf7d0",
                  borderTopColor: "transparent",
                  transform: "rotate(45deg)",
                }}
              ></span>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>

      {/* Sidebar – devices */}
      <aside style={sidebar}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.18,
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            MDR / Soil Network
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              color: "#e5e7eb",
            }}
          >
            Devices
          </h2>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <button
              disabled={!isAdmin}
              onClick={() => setShowAddModal(true)}
              style={{
                ...primaryBtn,
                opacity: isAdmin ? 1 : 0.25,
                cursor: isAdmin ? "pointer" : "not-allowed",
              }}
              onMouseEnter={(e) => {
                if (isAdmin) {
                  e.currentTarget.style.background = primaryBtnHover.background;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(135deg, #22c55e, #16a34a)";
              }}
            >
              +
            </button>
            <div
              style={{
                fontSize: 11,
                color: "#64748b",
              }}
            >
              {devices.length} registered
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingRight: 4,
          }}
        >
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
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 2,
                  }}
                >
                  {dev.nickname || dev.dev_eui}
                </span>
                <span style={statusStyle(dev.status)}>{dev.status}</span>
              </div>

              {isAdmin ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fetch(`${API_BASE_URL}/api/device/${dev.dev_eui}`, {
                      method: "DELETE",
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    })
                      .then(() => {
                        setDevices((prev) =>
                          prev.filter((d) => d.dev_eui !== dev.dev_eui)
                        );
                        if (selectedDevice === dev.dev_eui) {
                          setSelectedDevice(null);
                          setTooltipData(null);
                        }
                      })
                      .catch(console.error);
                  }}
                  style={deleteBtn}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      deleteBtnHover.background;
                    e.currentTarget.style.color = deleteBtnHover.color;
                    e.currentTarget.style.borderColor =
                      deleteBtnHover.borderColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = deleteBtn.background;
                    e.currentTarget.style.color = deleteBtn.color;
                    e.currentTarget.style.borderColor = deleteBtn.borderColor;
                  }}
                >
                  ✕
                </button>
              ) : (
                <span style={{ width: 24 }}></span>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main content – chart + tables */}
      <main style={main}>
        <div style={{ ...card, marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 8,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  margin: 0,
                  color: "#f9fafb",
                }}
              >
                Live Soil Moisture
              </h2>
              <p
                style={{
                  margin: 0,
                  marginTop: 4,
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                Real-time readings streamed via WebSocket. All times in Seattle
                local time.
              </p>
            </div>
            {selectedDevice && (
              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.5)",
                  padding: "4px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(15,23,42,0.85)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 0 4px rgba(34,197,94,0.3)",
                  }}
                ></span>
                <span>{selectedDevice}</span>
              </div>
            )}
          </div>

          <div style={{ height: 400, marginTop: 6 }}>
            {selectedDevice ? (
              <LiveChart
                data={{ [selectedDevice]: deviceData[selectedDevice] || [] }}
                formatTime={formatSeattleTime}
              />
            ) : (
              <p
                style={{
                  width: "calc(100% - 48px)",
                  marginTop: 40,
                  fontSize: 14,
                  color: "#9ca3af",
                }}
              >
                Select a device from the left panel to view live data.
              </p>
            )}
          </div>

          {selectedDevice && (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "minmax(0,1.2fr) minmax(0,0.8fr)",
                gap: 16,
              }}
            >
              <div
                style={{
                  ...card,
                  padding: 14,
                  borderRadius: 14,
                  boxShadow: "0 10px 24px rgba(0,0,0,0.8)",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    marginBottom: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#e5e7eb",
                  }}
                >
                  Device Info
                </h3>
                {(() => {
                  const dev = devices.find(
                    (d) => d.dev_eui === selectedDevice
                  );
                  if (!dev) return <p>No info</p>;

                  return (
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        fontSize: 13,
                        color: "#d1d5db",
                        display: "grid",
                        gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
                        rowGap: 6,
                        columnGap: 18,
                      }}
                    >
                      <li>
                        <strong>EUI:</strong> {dev.dev_eui}
                      </li>
                      <li>
                        <strong>Nickname:</strong>{" "}
                        {dev.nickname || "—"}
                      </li>
                      <li>
                        <strong>Status:</strong> {dev.status}
                      </li>
                      {dev.latitude && (
                        <li>
                          <strong>Lat:</strong> {dev.latitude}
                        </li>
                      )}
                      {dev.longitude && (
                        <li>
                          <strong>Lon:</strong> {dev.longitude}
                        </li>
                      )}
                      {dev.notes && (
                        <li style={{ gridColumn: "1 / span 2" }}>
                          <strong>Notes:</strong> {dev.notes}
                        </li>
                      )}
                    </ul>
                  );
                })()}
              </div>

              {tooltipData && (
                <div
                  style={{
                    ...card,
                    padding: 14,
                    borderRadius: 14,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.8)",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      marginBottom: 10,
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#e5e7eb",
                    }}
                  >
                    Latest Sample
                  </h3>
                  <div style={{ fontSize: 13, color: "#d1d5db" }}>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Time:</strong> {formatSeattleTime(tooltipData.ts)}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Moisture:</strong>{" "}
                      {tooltipData.moisture_pct.toFixed(1)}%
                    </div>
                    <div>
                      <strong>Raw:</strong> {tooltipData.raw_value}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedDevice && (
          <div style={card}>
            <h2
              style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 10 }}
            >
              Recent Readings
            </h2>
            <div
              style={{
                maxHeight: 260,
                overflowY: "auto",
                overflowX: "hidden",
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.96)",
              }}
            >
              <table
                style={{
                  maxHeight: "360px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                }}
              >
                <thead
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(15,23,42,1), rgba(30,64,175,0.3))",
                  }}
                >
                  <tr>
                    <th
                      style={{
                        padding: 10,
                        textAlign: "left",
                        color: "#e5e7eb",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(55,65,81,0.9)",
                      }}
                    >
                      Timestamp
                    </th>
                    <th
                      style={{
                        padding: 10,
                        textAlign: "left",
                        color: "#e5e7eb",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(55,65,81,0.9)",
                      }}
                    >
                      Moisture %
                    </th>
                    <th
                      style={{
                        padding: 10,
                        textAlign: "left",
                        color: "#e5e7eb",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(55,65,81,0.9)",
                      }}
                    >
                      Raw
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(deviceData[selectedDevice] || []).map((d, i) => (
                    <tr
                      key={i}
                      style={{
                        background:
                          i % 2 === 0
                            ? "rgba(15,23,42,1)"
                            : "rgba(15,23,42,0.9)",
                      }}
                    >
                      <td
                        style={{
                          padding: 8,
                          color: "#d1d5db",
                          borderBottom:
                            "1px solid rgba(31,41,55,0.9)",
                        }}
                      >
                        {formatSeattleTime(d.ts)}
                      </td>
                      <td
                        style={{
                          padding: 8,
                          color: "#d1d5db",
                          borderBottom:
                            "1px solid rgba(31,41,55,0.9)",
                        }}
                      >
                        {d.moisture_pct.toFixed(1)}%
                      </td>
                      <td
                        style={{
                          padding: 8,
                          color: "#d1d5db",
                          borderBottom:
                            "1px solid rgba(31,41,55,0.9)",
                        }}
                      >
                        {d.raw_value}
                      </td>
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
            background: "rgba(15,23,42,0.85)",
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
              background: "rgba(15,23,42,0.98)",
              padding: 24,
              borderRadius: 16,
              width: 360,
              maxWidth: "90vw",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "0 20px 50px rgba(0,0,0,0.9)",
              position: "relative",
              border: "1px solid rgba(51,65,85,0.9)",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "#e5e7eb",
              }}
            >
              Add Device
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: 6,
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              Register a new soil sensor device to the MDR dashboard.
            </p>

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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
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
            </div>

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
              style={{ ...input, minHeight: 70, resize: "vertical" }}
            />

            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
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
