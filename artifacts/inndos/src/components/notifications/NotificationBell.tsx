import { useState } from "react";
import { Bell, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";

export function NotificationBell() {
  const { user } = useAuth();
  
  // Generating a rich set of mockup notifications covering the requested scenarios
  const [notifications, setNotifications] = useState([
    { 
      id: 1, 
      title: "New User Registration", 
      description: "A new user 'Alice Smith' has registered on the platform.", 
      time: "5 mins ago", 
      read: false,
      role: 'admin'
    },
    { 
      id: 2, 
      title: "New Booking Confirmed", 
      description: "John Doe booked Villa Sunrise for 3 nights (Dec 12 - Dec 15).", 
      time: "10 mins ago", 
      read: false,
      role: 'owner'
    },
    { 
      id: 3, 
      title: "Property Activated", 
      description: "Your property 'Ocean View Apartment' is now live and visible to users.", 
      time: "1 hour ago", 
      read: false,
      role: 'owner'
    },
    { 
      id: 4, 
      title: "New Rating & Review", 
      description: "Jane left a 5-star review on your property: 'Amazing stay, highly recommended!'", 
      time: "2 hours ago", 
      read: true,
      role: 'owner'
    },
    { 
      id: 5, 
      title: "Internal Message", 
      description: "You have a new message from Support on the chatbot.", 
      time: "1 day ago", 
      read: true,
      role: 'all'
    },
    { 
      id: 6, 
      title: "Upcoming Stay Reminder", 
      description: "Calendar Alert: Your booked stay at Mountain Cabin starts tomorrow.", 
      time: "1 day ago", 
      read: true,
      role: 'user'
    },
    { 
      id: 7, 
      title: "Property Deactivated", 
      description: "The listing 'Downtown Studio' has been deactivated by the owner.", 
      time: "2 days ago", 
      read: true,
      role: 'admin'
    },
  ]);

  // Filter notifications based on user role (for mockup purposes)
  const visibleNotifications = notifications.filter(n => {
    if (!user) return n.role === 'all' || n.role === 'user'; // Show generic to non-logged in
    if (user.role === 'admin') return true; // Admin sees everything
    if (user.role === 'owner') return n.role === 'owner' || n.role === 'all' || n.role === 'user';
    return n.role === 'user' || n.role === 'all';
  });

  const unreadCount = visibleNotifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative mr-1 md:mr-2 hover:bg-gray-100 rounded-full" data-testid="btn-notifications">
          <Bell className="h-5 w-5 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0" align="end" sideOffset={8}>
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
            Notifications are sent from <span className="font-semibold">info@inndos.com</span>. Enable push notifications in your device settings for app alerts.
          </p>
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {visibleNotifications.length > 0 ? (
            visibleNotifications.map(notification => (
              <div key={notification.id} className={`p-4 border-b last:border-0 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/20' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                  <h5 className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {notification.title}
                  </h5>
                  {!notification.read && <span className="h-2 w-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0 shadow-sm"></span>}
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">{notification.description}</p>
                <span className="text-[10px] text-gray-400 font-medium">{notification.time}</span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-gray-300" />
              </div>
              <p className="font-medium text-gray-900 mb-1">All caught up!</p>
              <p className="text-xs">No new notifications right now.</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t bg-gray-50 text-center">
          <Button variant="ghost" size="sm" className="w-full text-xs text-primary font-medium">
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
