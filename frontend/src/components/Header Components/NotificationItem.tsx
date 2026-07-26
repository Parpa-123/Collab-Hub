import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useNavigate } from "react-router-dom"
import { GitPullRequest, MessageSquare, CircleDot, UserPlus, Bell, XCircle, CheckCircle2, Pin } from "lucide-react"

dayjs.extend(relativeTime)

export interface NotificationData {
  id: number
  actor_name: string
  content_object: {
    id: number
    type: string
    name: string
    repo_slug: string | null
  } | null
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

const getIcon = (verb: string) => {
  const v = verb.toLowerCase();
  if (v.includes("pull request") || v.includes("pullrequest")) {
    if (v.includes("comment") || v.includes("review")) return <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
    if (v.includes("merged")) return <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
    if (v.includes("closed")) return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
    return <GitPullRequest className="w-4 h-4 text-green-500 shrink-0" />
  }
  if (v.includes("issue")) {
    if (v.includes("comment")) return <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
    if (v.includes("closed")) return <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
    if (v.includes("assigned")) return <Pin className="w-4 h-4 text-amber-500 shrink-0" />
    return <CircleDot className="w-4 h-4 text-green-500 shrink-0" />
  }
  if (v.includes("collaborator") || v.includes("member")) {
    return <UserPlus className="w-4 h-4 text-blue-500 shrink-0" />
  }
  if (v.includes("comment")) {
    return <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
  }
  return <Bell className="w-4 h-4 text-gray-500 shrink-0" />
}

const NotificationItem = ({ notification, onMarkRead }: NotificationItemProps) => {
  const navigate = useNavigate()
  const initial = notification.actor_name?.trim()?.[0]?.toUpperCase() || "?"
  const IconNode = getIcon(notification.verb)

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id)
    }

    const { content_object } = notification
    if (content_object && content_object.repo_slug) {
      if (content_object.type === "PullRequest") {
        navigate(`/repo/${content_object.repo_slug}/pull-request/${content_object.id}`)
      } else if (content_object.type === "Issue") {
        navigate(`/repo/${content_object.repo_slug}/issues/${content_object.id}`)
      }
    }
  }

  return (
    <button
      id={`notification-${notification.id}`}
      onClick={handleClick}
      className={`
        w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
        ${notification.is_read
          ? "bg-transparent text-muted-foreground/80 hover:bg-accent/50"
          : "bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 text-foreground font-medium"
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
        <p className="text-sm leading-snug flex items-start gap-1.5">
          {IconNode}
          <span className="flex-1">
            <span className="font-semibold text-foreground">{notification.actor_name}</span>{" "}
            <span className="text-muted-foreground">{notification.verb}</span>
          </span>
        </p>
        
        {notification.content_object && (
          <p className="text-sm text-foreground truncate font-medium mt-1">
            {notification.content_object.name}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-xs text-muted-foreground">
            {dayjs(notification.created_at).fromNow()}
          </p>
          {notification.content_object?.repo_slug && (
            <>
              <span className="w-1 h-1 rounded-full bg-border" />
              <p className="text-xs text-muted-foreground truncate">
                {notification.content_object.repo_slug}
              </p>
            </>
          )}
        </div>
      </div>
    </button>
  )
}

export default NotificationItem
