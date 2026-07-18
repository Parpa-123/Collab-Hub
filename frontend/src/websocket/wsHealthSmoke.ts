import { getDefaultWebSocketBaseUrl, ReconnectingWebSocketClient } from "./reconnectingWebSocket";

export interface WsHealthSmokeEvents {
  connectedAtLeastOnce: boolean;
  reconnectAttempts: number;
  reconnectSucceeded: boolean;
  messages: string[];
}

export function runWsHealthSmokeTest() {
  const events: WsHealthSmokeEvents = {
    connectedAtLeastOnce: false,
    reconnectAttempts: 0,
    reconnectSucceeded: false,
    messages: [],
  };

  let openedCount = 0;
  const client = new ReconnectingWebSocketClient(`${getDefaultWebSocketBaseUrl()}/ws/health/`, {
    onOpen: () => {
      openedCount += 1;
      events.connectedAtLeastOnce = true;
      if (openedCount > 1) {
        events.reconnectSucceeded = true;
      }
    },
    onMessage: (event) => {
      events.messages.push(event.data);
    },
    onReconnectAttempt: () => {
      events.reconnectAttempts += 1;
    },
  });

  client.connect();

  return {
    client,
    events,
  };
}

