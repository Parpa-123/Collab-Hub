import { useCallback, useEffect, useState, useRef } from "react"
import connect from "../../axios/connect"
import { errorToast, successToast } from "../../lib/toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, CheckCheck, Loader2, Inbox, Trash2 } from "lucide-react"
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  
  const [nextPageUrl, setNextPageUrl] = useState<string | null>("/notifications/")
  const observerRef = useRef<IntersectionObserver | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await connect.get("/notifications/unread_count/")
      setUnreadCount(res.data.count)
    } catch (error) {
      errorToast(error, "Failed to load unread notifications count");
    }
  }, [])

  const fetchNotifications = useCallback(async (url: string, append = false, currentFilter = filter) => {
    if (!url) return
    append ? setLoadingMore(true) : setLoading(true)
    
    let fetchUrl = url
    if (!append && fetchUrl === "/notifications/") {
      if (currentFilter === "unread") {
        fetchUrl += "?is_read=false"
      }
    }

    try {
      const res = await connect.get(fetchUrl)
      setNotifications(prev => append ? [...prev, ...res.data.results] : res.data.results)
      // Extract everything after /api to maintain the correct connect base URL
      setNextPageUrl(res.data.next ? res.data.next.replace(/^.*\/api/, '') : null)
    } catch (error) {
      errorToast(error, "Failed to load notifications");
    } finally {
      append ? setLoadingMore(false) : setLoading(false)
    }
  }, [filter])

  // Initialize WebSockets and fetch initial count
  useEffect(() => {
    if (!isLoggedIn) return

    fetchUnreadCount()

    // WebSocket Setup
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000/ws/notifications/`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "notification.new") {
        fetchUnreadCount()
        // If panel is open, fetch fresh data
        if (open) {
          fetchNotifications("/notifications/", false, filter)
        }
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [isLoggedIn, fetchUnreadCount, open, fetchNotifications, filter])

  // Refresh list when panel opens or filter changes
  useEffect(() => {
    if (open) {
      fetchNotifications("/notifications/", false, filter)
      fetchUnreadCount()
    }
  }, [open, filter, fetchNotifications, fetchUnreadCount])

  // Intersection Observer for Infinite Scroll
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !nextPageUrl) return
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && nextPageUrl) {
        fetchNotifications(nextPageUrl, true)
      }
    })
    
    if (node) observerRef.current.observe(node)
  }, [loading, loadingMore, nextPageUrl, fetchNotifications])

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

  const clearAll = async () => {
    setClearingAll(true)
    try {
      await connect.delete("/notifications/clear_all/")
      setNotifications([])
      setUnreadCount(0)
      successToast("All notifications cleared")
    } catch (error) {
      errorToast(error, "Failed to clear notifications")
    } finally {
      setClearingAll(false)
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
        <div className="flex flex-col border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-3">
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
                  Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  disabled={clearingAll}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive font-medium disabled:opacity-50 transition-colors"
                >
                  {clearingAll ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Clear
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center px-4 pb-2 gap-4 text-sm">
            <button
              onClick={() => setFilter("all")}
              className={`pb-1 border-b-2 transition-colors ${filter === "all" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`pb-1 border-b-2 transition-colors flex items-center gap-1.5 ${filter === "unread" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notification list */}
        <ScrollArea className="h-[400px]">
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
              {/* Intersection target for infinite scroll */}
              <div ref={loadMoreRef} className="py-2 text-center">
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />}
              </div>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationPanel

