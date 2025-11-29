# Jakob Balkovec
# Fri Nov 28th
# mqtt.py

import json
import datetime
import asyncio
import paho.mqtt.client as mqtt

from app.crud import store_sensor_reading
from app.decode import decode_base64_to_decimal
from app.utils.calibration import convert_to_percentage
from app.schemas import SensorIn
from app.db.session import get_db
from app.config import MQTT_BROKER, MQTT_PORT, MQTT_TOPIC
from app.websocket import ws_manager

mqtt_connected = False
event_loop: asyncio.AbstractEventLoop | None = None

def bind_event_loop(loop: asyncio.AbstractEventLoop):
    global event_loop
    event_loop = loop

def on_connect(client, userdata, flags, rc):
    global mqtt_connected
    mqtt_connected = True
    print(f"MQTT connected with result code {rc}")
    client.subscribe(MQTT_TOPIC)

def is_mqtt_connected():
    return mqtt_connected

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode("utf-8")
        data = json.loads(payload)
        dev_eui = data.get("devEUI")
        raw_b64 = data.get("data")
        ts_unix = data.get("timestamp")

        if not dev_eui or not raw_b64:
            print("[WARN] Missing devEUI or data in MQTT payload")
            return

        raw_val = decode_base64_to_decimal(raw_b64)
        pct = convert_to_percentage(raw_val)
        ts_unix = ts_unix or int(datetime.datetime.now(datetime.timezone.utc).timestamp())
        ts = datetime.datetime.fromtimestamp(ts_unix, tz=datetime.timezone.utc)

        sensor_obj = SensorIn(dev_eui=dev_eui, timestamp=ts_unix, raw_value=raw_val, moisture_pct=pct)

        db = next(get_db())
        store_sensor_reading(
            db=db,
            dev_eui=dev_eui,
            timestamp=ts,
            latitude=data.get("rxInfo", [{}])[0].get("location", {}).get("latitude"),
            longitude=data.get("rxInfo", [{}])[0].get("location", {}).get("longitude"),
            raw_value=raw_val,
            moisture_pct=pct,
        )
        db.close()

        if event_loop and event_loop.is_running():
            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast({
                    "dev_eui": dev_eui,
                    "timestamp": ts_unix,
                    "raw_value": raw_val,
                    "moisture_pct": pct,
                }),
                event_loop
            )
        else:
            print("[WS WARNING] Event loop not ready, skipping broadcast")

        print(f"[INFO] Stored: {dev_eui}, raw={raw_val}, pct={pct:.2f}, ts={ts}")

    except Exception as e:
        print(f"[ERROR] MQTT handling failed: {e}")

def start_mqtt():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
    print("MQTT listening started")
    return client
