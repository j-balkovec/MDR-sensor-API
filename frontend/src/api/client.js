import { API_BASE } from "./config";

export async function fetchDevices() {
  const res = await fetch(`${API_BASE}/devices`);
  return res.json();
}

export async function addDevice(payload) {
  const res = await fetch(`${API_BASE}/device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateDevice(devEui, payload) {
  const res = await fetch(`${API_BASE}/device/${devEui}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteDevice(devEui) {
  const res = await fetch(`${API_BASE}/device/${devEui}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function fetchHistory(devEui) {
  const res = await fetch(`${API_BASE}/readings/${devEui}?limit=100`);
  return res.json();
}
