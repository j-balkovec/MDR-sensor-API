# Jakob Balkovec
# Thu 27th Nov
# websocket.py

from fastapi import WebSocket, WebSocketDisconnect
from typing import List

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        living = []
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
                living.append(conn)
            except WebSocketDisconnect:
                pass
            except Exception:
                pass
        self.active_connections = living


ws_manager = WebSocketManager()
