import { getDefaultWebSocketBaseUrl, ReconnectingWebSocketClient } from "./reconnectingWebSocket";
import type { Issue } from "@/components/RepoUI Component/Issues";

export type IssueEventType = "issue_created" | "issue_updated" | "issue_deleted" | "issue_moved";

export interface IssueRealtimeEvent {
  event_type: IssueEventType;
  issue: Issue | null;
  meta?: {
    actor_id?: number;
    repo_slug?: string;
    timestamp?: string;
    from_status?: string;
    to_status?: string;
    assignee_id?: number;
  };
}

export function createIssueRealtimeClient(
  slug: string,
  onEvent: (event: IssueRealtimeEvent) => void
): ReconnectingWebSocketClient {
  const urlProvider = () => {
    const base = getDefaultWebSocketBaseUrl();
    const token = localStorage.getItem("accessToken");
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
    return `${base}/ws/repositories/${slug}/issues/${tokenQuery}`;
  };

  return new ReconnectingWebSocketClient(urlProvider, {
    onMessage: (event) => {
      try {
        const parsed = JSON.parse(event.data) as IssueRealtimeEvent | { type?: string };
        if ("event_type" in parsed && parsed.event_type) {
          onEvent(parsed);
        }
      } catch {
        // Ignore non-JSON/non-event socket messages.
      }
    },
    onReconnectFailed: () => {
      // Caller can still manually refresh; no-op for infra baseline.
    },
  });
}
