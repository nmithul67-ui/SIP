"""
backend/routers/payment_websocket.py
─────────────────────────────────────────────────────────────────────────────
Real-time WebSocket Push Server for POS Tablet Payment Settlement Notifications.
Allows POS tablets to maintain an open WebSocket connection (/ws/payments/{table_id}).
When Decentro webhook receives payment confirmation, a PAYMENT_CONFIRMED frame is pushed.
"""

import json
import logging
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

ws_router = APIRouter()

class ConnectionManager:
    """Manages active WebSocket connections for POS tablet instances."""
    
    def __init__(self):
        # Maps table_id -> list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, table_id: str, websocket: WebSocket):
        await websocket.accept()
        if table_id not in self.active_connections:
            self.active_connections[table_id] = []
        self.active_connections[table_id].append(websocket)
        logger.info(f"[WebSocket] Tablet connected for table {table_id}")

    def disconnect(self, table_id: str, websocket: WebSocket):
        if table_id in self.active_connections:
            if websocket in self.active_connections[table_id]:
                self.active_connections[table_id].remove(websocket)
            if not self.active_connections[table_id]:
                del self.active_connections[table_id]
        logger.info(f"[WebSocket] Tablet disconnected for table {table_id}")

    async def broadcast_to_table(self, table_id: str, message: dict):
        """Broadcasts payment notification frame to connected tablets for table_id."""
        if table_id in self.active_connections:
            for connection in self.active_connections[table_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"[WebSocket] Error sending message to table {table_id}: {e}")

manager = ConnectionManager()

@ws_router.websocket("/ws/payments/{table_id}")
async def payment_websocket_endpoint(websocket: WebSocket, table_id: str):
    await manager.connect(table_id, websocket)
    try:
        while True:
            # Keep connection alive & listen for client ping
            data = await websocket.receive_text()
            # Send ack back
            await websocket.send_json({"event": "PONG", "received": data})
    except WebSocketDisconnect:
        manager.disconnect(table_id, websocket)
    except Exception as e:
        logger.error(f"[WebSocket] Exception in socket for table {table_id}: {e}")
        manager.disconnect(table_id, websocket)
