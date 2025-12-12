# Jakob Balkovec
# Nov 28th 2025
# websocket_test.py

import websockets
import asyncio

async def test():
    url = "ws://127.0.0.1:8000/ws/updates"
    async with websockets.connect(url, subprotocols=["super_secret_api_key"]) as ws:
        print("Connected!")
        await asyncio.sleep(5)

asyncio.run(test())
