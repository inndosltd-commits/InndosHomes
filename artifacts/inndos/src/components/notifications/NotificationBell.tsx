import { useState, useEffect, useCallback } from "react";
import { Bell, Check, Info, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";

interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  bookingId?: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function notificationTitle(type: string): string {
  switch (type) {
    case "new_booking": return "New Link-Up Request";
    case "booking_confirmed": return "Link-Up Confirmed";
    case "booking_cancelled": return "Link-Up Declined";
    case "booking_cancelled_by_guest": return "Link-Up Cancelled by Guest";
    case "new_user": return "New User Registered";
    case "listing_submitted": return "New Listing Submitted";
    default: return "Notification";
  }
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications/unread-count", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      // silent
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Poll unread count every 30 seconds
  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  // Fetch full list when panel opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST", credentials: "include" });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative mr-1 md:mr-2 hover:bg-gray-100 rounded-full" data-testid="btn-notifications">
          <Bell className="h-5 w-5 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0 z-[600]" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800 font-medium" onClick={markAllAsRead}>
              <Check className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        <div className="bg-blue-50/50 px-4 py-2 border-b flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-blue-700 leading-tight">
            Notifications are sent from <span className="font-semibold">notifications@inndos.com</span>. Enable push notifications in your device settings for app alerts.
          </p>
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading…
            </div>
          ) : notifications.length > 0 ? (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`p-4 border-b last:border-0 transition-colors cursor-pointer ${!n.isRead ? "bg-blue-50/30 hover:bg-blue-50/60" : "hover:bg-gray-50"}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h5 className={`text-sm ${!n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                    {notificationTitle(n.type)}
                  </h5>
                  {!n.isRead && <span className="h-2 w-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0 shadow-sm"></span>}
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">{n.message}</p>
                <span className="text-[10px] text-gray-400 font-medium">{timeAgo(n.createdAt)}</span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <BellOff className="h-6 w-6 text-gray-300" />
              </div>
              <p className="font-medium text-gray-900 mb-1">All caught up!</p>
              <p className="text-xs">No notifications yet.</p>
            </div>
          )}
        </div>

        <div className="p-2 border-t bg-gray-50 text-center">
          <Button variant="ghost" size="sm" className="w-full text-xs text-primary font-medium" onClick={fetchNotifications}>
            Refresh
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
