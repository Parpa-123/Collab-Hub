import { useCallback, useEffect, useState } from "react"
import connect from "../../axios/connect"
import { fetchAllPages } from "@/lib/pagination"
import { errorToast, successToast } from "../../lib/toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, CheckCheck, Loader2, Inbox } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import NotificationItem, { type NotificationData } from "./NotificationItem"

interface NotificationPanelProps {
  isLoggedIn: boolean
}

const NotificationPanel = ({ isLoggedIn }: NotificationPanelProps) => {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await connect.get("/notifications/unread_count/")
      setUnreadCount(res.data.count)
    } catch (error) {
      errorToast(error, "Failed to load unread notifications count");
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAllPages<NotificationData>(connect, "/notifications/")
      setNotifications(data)
    } catch (error) {
      errorToast(error, "Failed to load notifications");
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll unread count every 30s while logged in
  useEffect(() => {
    if (!isLoggedIn) return
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30_000)
    return () => clearInterval(interval)
  }, [isLoggedIn, fetchUnreadCount])

  // Refresh list when panel opens
  useEffect(() => {
    if (open) {
      fetchNotifications()
      fetchUnreadCount()
    }
  }, [open, fetchNotifications, fetchUnreadCount])

  const markRead = async (id: number) => {
    try {
      await connect.post(`/notifications/${id}/mark_read/`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (error) {
      errorToast(error, "Failed to mark notification as read");
    }
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await connect.post("/notifications/mark_all_read/")
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
      successToast("All notifications marked as read");
    } catch (error) {
      errorToast(error, "Failed to mark all notifications as read");
    } finally {
      setMarkingAll(false)
    }
  }

  if (!isLoggedIn) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id="notification-bell"
          aria-label="Notifications"
          className="relative p-2 rounded-full text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
        >
          <Bell className="h-5 w-5" />

          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm animate-in zoom-in-50 duration-200">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50 transition-colors"
            >
              {markingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3" />
              )}
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={markRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationPanel
