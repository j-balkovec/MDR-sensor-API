# Jakob Balkovec
# Nov 27th 2025
# main.py
# Jakob Balkovec
# Final Device CRUD + WebSocket Security
# main.py

from typing import Optional
import datetime
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from pydantic import BaseModel

from app.websocket import ws_manager
from app.db.session import get_db, Base, engine
from app.db.models import SensorReading, DeviceStatus
from app.routers import auth, devices, readings
from app.crud import (
    get_latest_reading,
    get_recent_readings,
    list_all_devices,
    create_device,
    delete_device,
    update_device,
)
from app.mqtt import start_mqtt, bind_event_loop, is_mqtt_connected
from app.config import WS_API_KEY

# Ensure tables exist
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    bind_event_loop(loop)
    mqtt_client = start_mqtt()
    yield
    mqtt_client.loop_stop()



app = FastAPI(lifespan=lifespan)

app.include_router(auth.router)
app.include_router(devices.router)
app.include_router(readings.router)

origins = ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for device creation/update
class DeviceCreate(BaseModel):
    dev_eui: str
    nickname: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    installation_date: Optional[datetime.datetime] = None
    status: Optional[DeviceStatus] = DeviceStatus.active
    notes: Optional[str] = None


# ---- Reading Endpoints ----

@app.get("/api/readings/latest/{dev_eui}")
def api_latest(dev_eui: str, db=Depends(get_db)):
    reading = get_latest_reading(db, dev_eui)
    return reading or {"error": "No readings for this device"}


@app.get("/api/readings/{dev_eui}")
def api_recent(dev_eui: str, limit: int = 100, db=Depends(get_db)):
    return get_recent_readings(db, dev_eui, limit)


# ---- Device Info ----s

@app.get("/api/devices/{dev_eui}")
def api_device_info(dev_eui: str, db=Depends(get_db)):
    latest = get_latest_reading(db, dev_eui)
    if not latest:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"dev_eui": dev_eui, "latest": latest}


# ---- WebSocket for Live Updates ----
@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    raw = websocket.headers.get("sec-websocket-protocol")
    print("DEBUG: received protocol =", raw)

    if not raw:
        await websocket.close(code=4401, reason="Missing protocol")
        return

    protocols = [p.strip() for p in raw.split(",")]
    print("DEBUG: parsed protocols =", protocols)

    if WS_API_KEY not in protocols:
        print("DEBUG: WS_API_KEY not found in protocols")
        await websocket.close(code=4403, reason="Invalid protocol")
        return

    await websocket.accept(subprotocol=WS_API_KEY)
    ws_manager.connect(websocket)
    print("[WS] Connected + Authenticated")

    try:
        while True:
            try:
                msg = await websocket.receive_text()
                print("DEBUG: received msg:", msg)
            except Exception:
                await asyncio.sleep(10)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        print("[WS] Disconnected")


# ---- Health & Status ----

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/system/status")
def system_status(db=Depends(get_db)):
    status_report = {
        "api": "online",
        "database": "unknown",
        "mqtt": "connected" if is_mqtt_connected() else "disconnected",
        "websocket_connections": len(ws_manager.active_connections),
    }

    try:
        db.execute(text("SELECT 1"))
        status_report["database"] = "connected"
    except Exception as e:
        status_report["database"] = f"error: {str(e)}"

    return status_report


# ---- Device CRUD Routes ----

@app.post("/api/device")
def api_add_device(payload: DeviceCreate, db=Depends(get_db)):
    dev = create_device(db, payload.model_dump(exclude_unset=True))
    return {"message": "Device added", "dev_eui": dev.dev_eui}

@app.patch("/api/device/{dev_eui}")
def api_update_device(dev_eui: str, payload: DeviceCreate, db=Depends(get_db)):
    dev = update_device(db, dev_eui, payload.dict(exclude_unset=True))
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"message": "Device updated"}


@app.delete("/api/device/{dev_eui}")
def api_delete_device(dev_eui: str, db=Depends(get_db)):
    ok = delete_device(db, dev_eui)
    if not ok:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"message": "Device removed"}


@app.get("/api/devices")
def api_list_devices(db=Depends(get_db)):
    return list_all_devices(db)
