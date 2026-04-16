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
    <div className="px-5 py-12 text-center text-[#57606a]">
      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
      <p className="text-sm">Loading activity...</p>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="px-5 py-12 text-center">
      <Inbox className="w-10 h-10 text-[#8c959f] mx-auto mb-3" />
      <p className="text-sm text-[#57606a]">No recent activity.</p>
      <p className="text-xs text-[#6e7781] mt-1">
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
      <div className="bg-white border border-[#d0d7de] rounded-md shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#d8dee4] flex items-center justify-between bg-[#f6f8fa]">
          <h2 className="text-sm font-semibold text-[#24292f] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#57606a]" />
            Recent Activity
            {unreadCount > 0 && (
              <span className="bg-[#ddf4ff] text-[#0969da] text-xs font-semibold px-2 py-0.5 rounded-full border border-[#b6e3ff]">
                {unreadCount} new
              </span>
            )}
          </h2>
        </div>

        <div className="divide-y divide-[#d8dee4]">
          {loading ? (
            <LoadingActivity />
          ) : notifications.length === 0 ? (
            <EmptyActivity />
          ) : (
            notifications.slice(0, 10).map((notification) => (
              <div
                className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${
                  notification.is_read
                    ? "hover:bg-[#f6f8fa]"
                    : "bg-[#f6f8fa] hover:bg-[#eef6ff]"
                }`}
                key={notification.id}
              >
                <div className="mt-0.5 shrink-0">
                  {renderNotificationIcon(notification.content_object?.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#24292f]">
                    <span className="font-semibold text-[#1f2328]">
                      {notification.actor_name || "Someone"}
                    </span>{" "}
                    {notification.verb}
                  </p>

                  {notification.content_object && (
                    <p className="text-xs text-[#57606a] mt-0.5 truncate">
                      {notification.content_object.name}
                    </p>
                  )}

                  <p className="text-xs text-[#6e7781] mt-1">
                    {dayjs(notification.created_at).fromNow()}
                  </p>
                </div>

                {!notification.is_read && (
                  <span className="w-2 h-2 rounded-full bg-[#0969da] mt-1.5 shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
