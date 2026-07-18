type WsMessageHandler = (event: MessageEvent<string>) => void;
type WsEventHandler = () => void;
type WsErrorHandler = (event: Event) => void;

export interface ReconnectingWebSocketOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  maxReconnectAttempts?: number;
  jitterFactor?: number;
  onOpen?: WsEventHandler;
  onClose?: WsEventHandler;
  onError?: WsErrorHandler;
  onMessage?: WsMessageHandler;
  onReconnectAttempt?: (attempt: number, delayMs: number) => void;
  onReconnectFailed?: () => void;
  onResubscribe?: (socket: WebSocket) => void;
}

const DEFAULT_OPTIONS: Required<
  Pick<
    ReconnectingWebSocketOptions,
    "initialDelayMs" | "maxDelayMs" | "maxReconnectAttempts" | "jitterFactor"
  >
> = {
  initialDelayMs: 500,
  maxDelayMs: 30_000,
  maxReconnectAttempts: 10,
  jitterFactor: 0.2,
};

export function getDefaultWebSocketBaseUrl(): string {
  const configuredBase = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.replace(/\/$/, "");
  if (configuredBase) {
    return configuredBase;
  }

  if (typeof window === "undefined") {
    return "ws://localhost";
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}`;
}

export class ReconnectingWebSocketClient {
  private readonly urlProvider: () => string;
  private readonly options: ReconnectingWebSocketOptions;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private manuallyClosed = false;

  constructor(url: string | (() => string), options: ReconnectingWebSocketOptions = {}) {
    this.urlProvider = typeof url === "function" ? url : () => url;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.clearReconnectTimer();
    this.manuallyClosed = false;
    this.socket = new WebSocket(this.urlProvider());

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.options.onOpen?.();
      this.options.onResubscribe?.(this.socket as WebSocket);
    };

    this.socket.onmessage = (event) => {
      this.options.onMessage?.(event);
    };

    this.socket.onerror = (event) => {
      this.options.onError?.(event);
    };

    this.socket.onclose = () => {
      this.options.onClose?.();
      this.socket = null;
      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
  }

  send(payload: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.socket.send(payload);
    return true;
  }

  get readyState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }

  private scheduleReconnect(): void {
    const maxAttempts = this.options.maxReconnectAttempts ?? DEFAULT_OPTIONS.maxReconnectAttempts;
    if (this.reconnectAttempts >= maxAttempts) {
      this.options.onReconnectFailed?.();
      return;
    }

    this.reconnectAttempts += 1;
    const delay = this.getReconnectDelay(this.reconnectAttempts);
    this.options.onReconnectAttempt?.(this.reconnectAttempts, delay);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private getReconnectDelay(attempt: number): number {
    const initial = this.options.initialDelayMs ?? DEFAULT_OPTIONS.initialDelayMs;
    const max = this.options.maxDelayMs ?? DEFAULT_OPTIONS.maxDelayMs;
    const jitterFactor = this.options.jitterFactor ?? DEFAULT_OPTIONS.jitterFactor;

    const baseDelay = Math.min(initial * 2 ** (attempt - 1), max);
    const jitter = baseDelay * jitterFactor * Math.random();
    return Math.floor(baseDelay + jitter);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

