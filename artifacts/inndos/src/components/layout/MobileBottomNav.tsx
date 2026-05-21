import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { MessageSquare, CalendarCheck, Heart, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [navHash, setNavHash] = useState(window.location.hash);

  useEffect(() => {
    const handler = () => setNavHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const onDashboard = location === "/dashboard";
  const tab = onDashboard
    ? (new URLSearchParams(navHash.split("?")[1] ?? "").get("tab") ?? "overview")
    : null;

  const isMessages  = onDashboard && tab === "messages";
  const isBookings  = onDashboard && tab === "bookings";
  const isSaved     = onDashboard && tab === "saved";
  const isMyAccount = onDashboard && !isMessages && !isBookings && !isSaved;

  const hidden = location === "/login";
  if (hidden) return null;

  const navTo = (path: string) => {
    if (!user) {
      window.location.hash = "/login";
    } else {
      window.location.hash = path;
    }
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[120] bg-white border-t border-gray-200">
      <div className="flex items-center justify-around">
        <button
          onClick={() => navTo("/dashboard?tab=messages")}
          className={`flex flex-col items-center gap-0.5 py-3 px-5 transition-colors ${isMessages ? "text-black" : "text-gray-400"}`}
        >
          <MessageSquare className="h-5 w-5" strokeWidth={isMessages ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">Messages</span>
        </button>

        <button
          onClick={() => navTo("/dashboard?tab=bookings")}
          className={`flex flex-col items-center gap-0.5 py-3 px-5 transition-colors ${isBookings ? "text-black" : "text-gray-400"}`}
        >
          <CalendarCheck className="h-5 w-5" strokeWidth={isBookings ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">Bookings</span>
        </button>

        <button
          onClick={() => navTo("/dashboard?tab=saved")}
          className={`flex flex-col items-center gap-0.5 py-3 px-5 transition-colors ${isSaved ? "text-black" : "text-gray-400"}`}
        >
          <Heart className={`h-5 w-5 ${isSaved ? "fill-black" : ""}`} strokeWidth={isSaved ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">Saved</span>
        </button>

        <button
          onClick={() => navTo("/dashboard")}
          className={`flex flex-col items-center gap-0.5 py-3 px-5 transition-colors ${isMyAccount ? "text-black" : "text-gray-400"}`}
        >
          <UserCircle className="h-5 w-5" strokeWidth={isMyAccount ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">My Account</span>
        </button>
      </div>
    </div>
  );
}
