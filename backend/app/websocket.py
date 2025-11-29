# Jakob Balkovec
# Thu 27th Nov
# websocket.py

from fastapi import WebSocket, WebSocketDisconnect, status
from typing import List
from google.oauth2 import id_token
from google.auth.transport import requests

from app.config import GOOGLE_CLIENT_ID
from app.security import User

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[tuple[WebSocket, User]] = []

    async def connect(self, websocket: WebSocket):
        # Expect the token to arrive in subprotocol list: ["Bearer <token>"]
        token = None
        if websocket.headers.get("sec-websocket-protocol"):
            raw = websocket.headers.get("sec-websocket-protocol")
            if raw.startswith("Bearer "):
                token = raw.removeprefix("Bearer ").strip()

        if not token:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        try:
            idinfo = id_token.verify_oauth2_token(
                token, requests.Request(), GOOGLE_CLIENT_ID
            )
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        user = User(
            email=idinfo.get("email"),
            name=idinfo.get("name"),
            picture=idinfo.get("picture")
        )

        # Accept the connection and record user
        await websocket.accept(subprotocol=f"Bearer {token}")
        self.active_connections.append((websocket, user))
        print(f"WS Connected: {user.email}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections = [
            (ws, user) for ws, user in self.active_connections if ws != websocket
        ]
        print("WS Disconnected")

    async def broadcast(self, message: dict):
        living = []
        for conn, user in self.active_connections:
            try:
                await conn.send_json(message)
                living.append((conn, user))
            except WebSocketDisconnect:
                pass
            except Exception:
                pass
        self.active_connections = living


ws_manager = WebSocketManager()
