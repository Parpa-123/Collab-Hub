import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

dayjs.extend(relativeTime)

export interface NotificationData {
  id: number
  actor_name: string
  content_type: number
  object_id: number
  is_read: boolean
  read_at: string | null
  created_at: string
  verb: string
}

interface NotificationItemProps {
  notification: NotificationData
  onMarkRead: (id: number) => void
}

const verbIcon: Record<string, string> = {
  "created a pull request": "🔀",
  "commented on your pull request": "💬",
  "commented on pull request": "💬",
  "opened an issue": "🐛",
  "assigned you to an issue": "📌",
}

const NotificationItem = ({ notification, onMarkRead }: NotificationItemProps) => {
  const initial = notification.actor_name?.trim()?.[0]?.toUpperCase() || "?"

  const matchedIcon = Object.entries(verbIcon).find(([key]) =>
    notification.verb.includes(key)
  )?.[1] ?? "🔔"

  return (
    <button
      id={`notification-${notification.id}`}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
      className={`
        w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
        ${notification.is_read
          ? "bg-transparent opacity-60"
          : "bg-blue-50/60 hover:bg-blue-50"
        }
      `}
    >
      {/* Unread dot */}
      <div className="pt-2.5 shrink-0 w-2">
        {!notification.is_read && (
          <span className="block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        )}
      </div>

      {/* Actor avatar */}
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {initial}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold text-foreground">{notification.actor_name}</span>{" "}
          <span className="text-muted-foreground">{notification.verb}</span>{" "}
          <span>{matchedIcon}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {dayjs(notification.created_at).fromNow()}
        </p>
      </div>
    </button>
  )
}

export default NotificationItem
