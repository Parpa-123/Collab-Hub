import { useEffect, useRef } from "react";

const KEEP_ALIVE_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes (Render idle timeout is 15 min)
const VISIBILITY_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes cooldown between visibility change pings

const getHealthUrl = (): string => {
  const defaultApiBaseUrl = import.meta.env.PROD ? "/api" : "http://localhost:8001/api";
  const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
  const normalized = rawApiBaseUrl.replace(/\/$/, "");
  const apiBase = normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  return `${apiBase}/health/`;
};

/**
 * Periodically pings the backend health endpoint to prevent server spin-down (e.g. Render 15-min idle timeout),
 * and warms up the backend when a user returns to an inactive browser tab.
 */
export const useBackendKeepAlive = () => {
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    const healthUrl = getHealthUrl();

    const pingBackend = async () => {
      try {
        lastPingRef.current = Date.now();
        await fetch(`${healthUrl}?_t=${Date.now()}`, {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
          },
          credentials: "omit",
        });
      } catch {
        // Silently swallow errors during background keep-alive ping
      }
    };

    // 1. Initial health ping on app load / mount
    pingBackend();

    // 2. Scheduled 14-minute interval
    const intervalId = setInterval(pingBackend, KEEP_ALIVE_INTERVAL_MS);

    // 3. Tab visibility change listener (fires when user returns to tab after inactivity)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const timeSinceLastPing = Date.now() - lastPingRef.current;
        if (timeSinceLastPing >= VISIBILITY_COOLDOWN_MS) {
          pingBackend();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
};

export default useBackendKeepAlive;
