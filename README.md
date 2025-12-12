# MDR Sensor API & Dashboard

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-044a64?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![MQTT](https://img.shields.io/badge/MQTT-660066?logo=eclipsemosquitto&logoColor=white)](https://mqtt.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)

FastAPI backend and React/Vite dashboard for monitoring LoRa soil sensors. Incoming MQTT frames are decoded, converted to moisture percentages, stored in SQLite, and pushed live to the UI over WebSockets while REST endpoints expose history and device metadata.

## Contents

- [Key Capabilities](#key-capabilities)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Setup & Prerequisites](#setup--prerequisites)
- [Configuration](#configuration-env-examples)
- [Backend: install & run](#backend-install--run-locally)
- [Frontend: install & run](#frontend-install--run-locally)
- [REST API](#rest-api-reference-observed)
- [WebSocket Stream](#websocket-stream)
- [Data Model](#data-model-sqlite)
- [Security & Limitations](#security-considerations--current-limitations)
- [Future Improvements](#future-improvements--todos)

## Key Capabilities

- Subscribe to `application/soilmoisture/device/+/rx` MQTT frames, decode base64 payloads, and compute soil moisture percentages using configurable calibration values.
- Persist sensor readings and device metadata in SQLite with FastAPI CRUD endpoints for querying and management.
- Broadcast new readings to WebSocket clients for live dashboards.
- React dashboard lists devices, streams real-time charts, and allows admin device management (auth fixes pending).

## Tech Stack

- **Backend:** FastAPI, Pydantic Settings, SQLAlchemy ORM, paho-mqtt, SQLite
- **Frontend:** React 19 + Vite, Recharts
- **Auth:** Google ID token verification with optional JWT minting (`/api/auth/google`)
- **Containerization:** Backend Dockerfile (compose not wired)

## Architecture

1. **Ingest:** `app.mqtt` subscribes to LoRa topic, decodes payloads, and computes moisture via `DRY_VALUE`/`WET_VALUE`.
2. **Persist:** Readings stored in `sensor_readings`; unknown devices auto-registered in `devices`.
3. **Broadcast:** New readings pushed to all WebSocket clients through `app.websocket.ws_manager.broadcast`.
4. **Serve:** FastAPI exposes REST for readings/devices/health; React UI consumes REST + WebSocket.

## Setup & Prerequisites

- Python 3.11+
- Node.js 20+ (Vite frontend)
- MQTT broker access
- Google OAuth client (if protecting routes)

## Configuration (.env examples)

Backend (`backend/.env` via Pydantic settings):

- `MQTT_BROKER`, `MQTT_PORT`, `MQTT_TOPIC` (topic currently hardcoded to `application/soilmoisture/device/+/rx`)
- `DATABASE_URL` (default `sqlite:///./mdr_api.db`)
- `DRY_VALUE`, `WET_VALUE` (calibration bounds)
- `WS_API_KEY` (intended WebSocket subprotocol token; see mismatch note)
- `ADMIN_API_KEY` (not enforced in code)
- `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS` (comma-separated admin list)
- `SECRET_KEY`, `TOKEN_EXPIRE_MINUTES` (for `/api/auth/google`)
- `HELIUM_INGEST_SECRET`, `API_HOST`, `API_PORT` (unused)

Frontend (`frontend/.env.local` or shell):

- `VITE_API_BASE_URL` (default `http://localhost:8000`)

## Backend: install & run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Tables are auto-created on startup; MQTT client starts in the app lifespan.

## Frontend: install & run locally

```bash
cd frontend
npm install
npm run dev -- --host --port 5173
```

Dashboard expects `VITE_API_BASE_URL` and a WebSocket at `ws://localhost:8000/ws/updates`.

## REST API Reference (observed)

- `GET /health` – Liveness probe.
- `GET /system/status` – API/db connectivity and MQTT/WebSocket status snapshot.
- `GET /api/readings/latest/{dev_eui}` – Most recent reading.
- `GET /api/readings/{dev_eui}?limit=100` – Recent readings (default 100).
- `GET /api/devices/{dev_eui}` – Latest reading with basic device info (404 if none).
- `GET /api/devices` – List registered devices.
- `POST /api/device` – Create device (router enforces Google admin; main app also exposes an unprotected variant).
- `PATCH /api/device/{dev_eui}` – Update device metadata (no auth in main app).
- `DELETE /api/device/{dev_eui}` – Delete device (admin-protected in router, unprotected duplicate in main app).
- `POST /api/auth/google` – Exchange Google ID token for backend-signed JWT (HS256); not enforced elsewhere yet.
- `GET /api/api/export/{dev_eui}` – CSV export route; path/table mismatch currently breaks it (see limitations).

## WebSocket Stream

- Endpoint: `ws://<host>:8000/ws/updates`
- Expected header: `Sec-WebSocket-Protocol: <WS_API_KEY>` (from backend `.env`). Manager also expects `Bearer <google-id-token>` subprotocol; auth handshake is inconsistent.
- Payload on new MQTT message:

```json
{
  "dev_eui": "abc123",
  "timestamp": 1732838400,
  "raw_value": 5123,
  "moisture_pct": 43.2
}
```

## Data Model (SQLite)

- `devices`: `dev_eui` (pk), `nickname`, `latitude`, `longitude`, `installation_date`, `status` (`active|archived|faulty`), `notes`
- `sensor_readings`: `id` (pk), `dev_eui` (idx), `timestamp`, `latitude`, `longitude`, `raw_value`, `moisture_pct`

## Security Considerations & Current Limitations

- Default secrets (`SECRET_KEY`, `WS_API_KEY`, `ADMIN_API_KEY`) are committed; override for any real deployment.
- Duplicate device routes: one admin-protected via router, one unprotected in `main.py` (bypasses admin checks).
- WebSocket auth mismatch: `main.py` expects `WS_API_KEY`, manager expects `Bearer <google-id-token>`; clients using only the key are closed after accept.
- CSV export route path/table is wrong (`/api/api/export/{dev_eui}` querying `readings` vs `sensor_readings`), so it currently fails.
- Frontend `useAuth` never returns `isAdmin` and uses Google ID token directly as `Authorization`; `/api/auth/google` token is unused.
- MQTT topic uses hardcoded `REAL_TOPIC`; `MQTT_TOPIC` env unused.
- No migrations; `docker-compose.yml` empty.

## Future Improvements / TODOs
- Imporove the frontend
- Allow for entering constants (`DRY` and `WET`) upon adding a sensor node through the UI
