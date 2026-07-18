from channels.generic.websocket import AsyncJsonWebsocketConsumer


class HealthConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send_json(
            {
                "type": "health.connected",
                "message": "WebSocket health endpoint connected.",
            }
        )

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "health.ping":
            await self.send_json({"type": "health.pong"})

