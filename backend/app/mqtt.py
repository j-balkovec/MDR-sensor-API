# Jakob Balkovec
# Fri Nov 28th
# mqtt.py

# Jakob Balkovec
# FINAL - Reliable MQTT → DB → WS Bridge
# mqtt.py

import json
import datetime
import asyncio
import paho.mqtt.client as mqtt

from app.crud import store_sensor_reading, create_device_if_missing
from app.decode import decode_base64_to_decimal
from app.utils.calibration import convert_to_percentage
from app.db.session import get_db
from app.websocket import ws_manager
from app.config import MQTT_BROKER, MQTT_PORT

mqtt_connected = False
event_loop = None

REAL_TOPIC = "application/soilmoisture/device/+/rx"

def bind_event_loop(loop):
    global event_loop
    event_loop = loop
    print("[MQTT] Event loop bound.")


def on_connect(client, userdata, flags, rc):
    global mqtt_connected
    mqtt_connected = True

    print(f"[MQTT] Connected rc={rc}")

    client.subscribe(REAL_TOPIC)
    print(f"[MQTT] SUBSCRIBED: {REAL_TOPIC}")


def is_mqtt_connected():
    return mqtt_connected


def parse_message(payload: str):
    try:
        data = json.loads(payload)
    except Exception as e:
        print("[WARN] Payload not JSON:", payload, e)
        return None

    dev = data.get("devEUI")
    if not dev:
        print("[WARN] Missing devEUI:", data)
        return None

    if "raw_value" in data and isinstance(data["raw_value"], int):
        raw = data["raw_value"]
    else:
        b64val = data.get("data")
        if not b64val:
            print("[WARN] No raw_value or data field:", data)
            return None
        try:
            raw = decode_base64_to_decimal(b64val)
        except Exception as e:
            print("[WARN] Base64 decode failed:", b64val, e)
            return None

    pct = convert_to_percentage(raw)
    ts = int(data.get("timestamp") or datetime.datetime.now(datetime.timezone.utc).timestamp())

    return {
        "dev_eui": dev,
        "timestamp": ts,
        "raw_value": raw,
        "moisture_pct": pct,
    }

def save_and_broadcast(msg):
    db = next(get_db())

    from app.crud import ensure_device

    ensure_device(
        db=db,
        dev_eui=msg["dev_eui"],
    )

    ts_dt = datetime.datetime.fromtimestamp(
        msg["timestamp"], tz=datetime.timezone.utc
    )

    store_sensor_reading(
        db=db,
        dev_eui=msg["dev_eui"],
        timestamp=ts_dt,
        latitude=None,
        longitude=None,
        raw_value=msg["raw_value"],
        moisture_pct=msg["moisture_pct"],
    )
    db.close()

    if event_loop and event_loop.is_running():
        asyncio.run_coroutine_threadsafe(ws_manager.broadcast(msg), event_loop)
    else:
        print("[WS FALLBACK] Loop not ready, skipping broadcast")

    print(
        f"[OK] {msg['dev_eui']} stored+sent raw={msg['raw_value']} pct={msg['moisture_pct']:.2f}"
    )


def on_message(client, userdata, msg):
    payload = msg.payload.decode("utf-8")
    topic = msg.topic

    print(f"[MQTT] RX TOPIC={topic}")

    db = next(get_db())

    parsed = parse_message(payload)
    if parsed:
        create_device_if_missing(db, parsed["dev_eui"])
        save_and_broadcast(parsed)

    db.close()

def start_mqtt():
    print("[MQTT] Init client...")
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
    print("[MQTT] MQTT listening...")
    return client
