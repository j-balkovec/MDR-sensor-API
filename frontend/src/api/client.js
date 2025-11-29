const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchDevices() {
    const res = await fetch(`${API_BASE}/devices`);
    return res.json();
}

export async function fetchLatest(devEui) {
    const res = await fetch(`${API_BASE}/readings/latest/${devEui}`);
    return res.json();
}
