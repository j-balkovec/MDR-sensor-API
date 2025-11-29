import { API_BASE_URL } from "./config";

export async function fetchDevices() {
  const res = await fetch(`${API_BASE_URL}/api/devices`);
  return res.json(); // now array of objects, not strings
}

export async function addDevice(payload) {
  const res = await fetch(`${API_BASE_URL}/api/device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateDevice(devEui, payload) {
  const res = await fetch(`${API_BASE_URL}/api/device/${devEui}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteDevice(devEui) {
  const res = await fetch(`${API_BASE_URL}/api/device/${devEui}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function fetchHistory(devEui) {
  const res = await fetch(`${API_BASE_URL}/api/readings/${devEui}?limit=100`);
  return res.json();
}
