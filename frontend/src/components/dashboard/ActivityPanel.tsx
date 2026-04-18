import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Bell, Inbox, Loader2 } from "lucide-react";
import { renderNotificationIcon } from "./helpers";
import type { NotificationItem } from "./types";

dayjs.extend(relativeTime);

interface ActivityPanelProps {
  loading: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
}

function LoadingActivity() {
  return (
    <div className="px-5 py-12 text-center text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
      <p className="text-sm">Loading activity...</p>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="px-5 py-12 text-center">
      <Inbox className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">No recent activity.</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Activity from your repositories will show up here.
      </p>
    </div>
  );
}

export default function ActivityPanel({
  loading,
  notifications,
  unreadCount,
}: ActivityPanelProps) {
  return (
    <main>
      <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/50">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            Recent Activity
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full border border-primary/20">
                {unreadCount} new
              </span>
            )}
          </h2>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <LoadingActivity />
          ) : notifications.length === 0 ? (
            <EmptyActivity />
          ) : (
            notifications.slice(0, 10).map((notification) => (
              <div
                className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${
                  notification.is_read
                    ? "hover:bg-muted/30"
                    : "bg-muted/50 hover:bg-muted/70"
                }`}
                key={notification.id}
              >
                <div className="mt-0.5 shrink-0">
                  {renderNotificationIcon(notification.content_object?.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90">
                    <span className="font-semibold text-foreground">
                      {notification.actor_name || "Someone"}
                    </span>{" "}
                    {notification.verb}
                  </p>

                  {notification.content_object && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {notification.content_object.name}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {dayjs(notification.created_at).fromNow()}
                  </p>
                </div>

                {!notification.is_read && (
                  <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
