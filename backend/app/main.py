# Jakob Balkovec
# Nov 27th 2025
# main.py

from sqlalchemy import text
import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.websocket import ws_manager
from app.db.session import get_db, Base, engine
from app.crud import get_latest_reading, get_recent_readings, list_devices
from app.mqtt import start_mqtt, bind_event_loop
from app.config import WS_API_KEY
from app.mqtt import is_mqtt_connected

# Ensure DB tables exist
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    bind_event_loop(loop)  # Bind the event loop for MQTT
    mqtt_client = start_mqtt()
    yield
    mqtt_client.loop_stop()  # Stop MQTT thread on shutdown

app = FastAPI(lifespan=lifespan)

origins = ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/devices")
def api_list_devices(db=Depends(get_db)):
    return list_devices(db)

@app.get("/api/readings/latest/{dev_eui}")
def api_latest(dev_eui: str, db=Depends(get_db)):
    reading = get_latest_reading(db, dev_eui)
    return reading or {"error": "No readings for this device"}

@app.get("/api/readings/{dev_eui}")
def api_recent(dev_eui: str, limit: int = 100, db=Depends(get_db)):
    return get_recent_readings(db, dev_eui, limit)

@app.get("/api/devices/{dev_eui}")
def api_device_info(dev_eui: str, db=Depends(get_db)):
    latest = get_latest_reading(db, dev_eui)
    return {"dev_eui": dev_eui, "latest": latest} if latest else {"error": "No readings for this device"}

@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    client_key = websocket.headers.get("sec-websocket-protocol")
    if client_key != WS_API_KEY:
        await websocket.close(code=1008)
        return

    await websocket.accept(subprotocol=WS_API_KEY)
    await ws_manager.connect(websocket)
    print("[WS] Connected + Authenticated")
    try:
        while True:
            await asyncio.sleep(10)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        print("[WS] Client disconnected")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/system/status")
def system_status(db=Depends(get_db)):
    status_report = {
        "api": "online",
        "database": "unknown",
        "mqtt": "connected" if is_mqtt_connected() else "disconnected",
        "websocket_connections": len(ws_manager.active_connections)
    }
    try:
        db.execute(text("SELECT 1"))
        status_report["database"] = "connected"
    except Exception as e:
        status_report["database"] = f"error: {str(e)}"
    return status_report
