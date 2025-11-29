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

DEV_EUI = "ce9c49e5db72508d"

def encode_value(val: int) -> str:
    return base64.b64encode(val.to_bytes(2, "big")).decode()

client = mqtt.Client()
client.connect(BROKER, PORT, 60)

print("Sending fake packets...")

val = 6000

while True:
    val += random.randint(-1000, 1000)
    val = max(4000, min(8000, val))

    payload = {
        "devEUI": DEV_EUI,
        "data": encode_value(val),
        "timestamp": int(time.time())
    }

    client.publish(TOPIC, json.dumps(payload))
    print("Sent:", payload)

    time.sleep(random.uniform(2, 5)) # to simulate irregular readings
