# Jakob Balkovec
# Nov 28th 2025
# test_mqtt_publish.py

import json
import paho.mqtt.client as mqtt
import base64
import time

MQTT_BROKER = "mqtt.loralab.org"
MQTT_PORT = 1883
TOPIC = "application/soilmoisture/device/ce9c49e5db72508d/rx"

client = mqtt.Client()
client.connect(MQTT_BROKER, MQTT_PORT, 60)

payload = {
    "devEUI": "ce9c49e5db72508d",
    "data": base64.b64encode(b"\x30\x6c").decode("utf-8")  # example raw bytes
}

print("Publishing test message...")
client.publish(TOPIC, json.dumps(payload))
time.sleep(1)
client.disconnect()
print("Done")
