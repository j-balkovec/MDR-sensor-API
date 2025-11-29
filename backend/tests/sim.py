# Jakob Balkovec
# Nov 27th 2025
# sim.py

import time
import json
import base64
import random
import paho.mqtt.client as mqtt

BROKER = "127.0.0.1"
PORT = 1883
TOPIC = "sensor/moisture"

DEVICES = [
    "f0a1b2c3d4e5f678",  # Device A (need to run insert_dummy.py)
]

MIN_RAW = 4000
MAX_RAW = 8000

device_values = {
    DEVICES[0]: random.randint(5000, 7000),
}

def encode_value(val: int) -> str:
    return base64.b64encode(val.to_bytes(2, "big")).decode()

client = mqtt.Client()
client.connect(BROKER, PORT, 60)

print("Sending multi-device sensor packets...\n")

while True:
    dev = random.choice(DEVICES)
    current = device_values[dev]

    drift = random.randint(-300, 300)
    jitter = random.randint(-100, 100)
    new_val = current + drift + jitter

    new_val = max(MIN_RAW, min(MAX_RAW, new_val))
    device_values[dev] = new_val

    payload = {
        "devEUI": dev,
        "data": encode_value(new_val),
        "timestamp": int(time.time())
    }

    client.publish(TOPIC, json.dumps(payload))

    print(f"Sent -> {dev} | raw={new_val} | ts={payload['timestamp']}")

    sleep_time = random.uniform(1.5, 4.5)
    time.sleep(sleep_time)
