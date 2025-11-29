# Jakob Balkovec
# Nov 28th 2025
# websocket_test.py

from websockets.sync.client import connect

ws_url = "ws://127.0.0.1:8000/ws/updates"
headers = [("x-api-key", "super_secret_api_key")]

print("Connecting to:", ws_url)

try:
    with connect(ws_url, additional_headers=headers) as ws:
        print("Connected to WebSocket")

        while True:
            msg = ws.recv()
            print("Received:", msg)

except KeyboardInterrupt:
    print("Client closed.")
