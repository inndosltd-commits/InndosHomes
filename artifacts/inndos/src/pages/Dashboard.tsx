import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, MessageSquare, Bell, Calendar, BarChart3, Heart, Clock, Plus, Users, FileText, AlertTriangle, DollarSign, Check, X, ExternalLink, Trash2, ArrowUpRight, ArrowDownRight, ShieldCheck, Eye, Edit, Star, Bookmark, UploadCloud, Lock, UserCircle, Loader2, Crown, Zap, Gift, Settings, CreditCard, RefreshCw, Globe } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessagingSystem } from "@/components/dashboard/MessagingSystem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function resolvePropertyImageUrl(path: string | null | undefined): string {
  if (!path) return "/images/modern_apartment_exterior.png";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/objects/")) return `/api/storage${path}`;
  return path;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, token, isLoading, logout } = useAuth();
  const { toast } = useToast();

  // --- REAL-TIME STATE ---
  // Admin State
  const [moderationQueue, setModerationQueue] = useState<any[]>([]);
  const [reportedListings, setReportedListings] = useState<number[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalProperties, setTotalProperties] = useState(0);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isLoadingAdminUsers, setIsLoadingAdminUsers] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState<Record<string, boolean>>({});
  const [isLoadingAdminStats, setIsLoadingAdminStats] = useState(false);
  const [isLoadingModeration, setIsLoadingModeration] = useState(false);
  const [adminProperties, setAdminProperties] = useState<any[]>([]);
  const [isLoadingAdminProperties, setIsLoadingAdminProperties] = useState(false);
  const [adminPropertyActionLoading, setAdminPropertyActionLoading] = useState<Record<string, boolean>>({});
  const [flagDialogId, setFlagDialogId] = useState<string | null>(null);
  const [flagComment, setFlagComment] = useState("");
  const [isFlagging, setIsFlagging] = useState(false);

  const pendingUsers = adminUsers.filter((u: any) => u.status === "pending");

  // Owner State
  const [ownerProperties, setOwnerProperties] = useState<any[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);

  const [deactivatedProperties, setDeactivatedProperties] = useState<string[]>([]);

  // Favorites & messages (for tenants/guests overview cards)
  const [favorites, setFavorites] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // Bookings state (for tenants/guests)
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // Received bookings state (for owners/hosts)
  const [receivedBookings, setReceivedBookings] = useState<any[]>([]);
  const [isLoadingReceivedBookings, setIsLoadingReceivedBookings] = useState(false);

  // Unread booking notifications count (for owners/hosts)
  const [unreadBookingCount, setUnreadBookingCount] = useState(0);

  // Notifications inbox (for owners/hosts)
  const [ownerNotifications, setOwnerNotifications] = useState<any[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Keep pending properties from localStorage (local only, not yet persisted to API)
  const [pendingProperties] = useState<any[]>([]);

  // Real stats derived from actual received bookings
  const receivedBookingsCount = receivedBookings.length;
  const receivedRevenue = receivedBookings.filter((b: any) => b.status === 'confirmed').reduce((sum: number, b: any) => sum + Number(b.totalPrice || 0), 0);
  const today = new Date().toDateString();
  const todayCheckIns = receivedBookings.filter((b: any) => b.startDate && new Date(b.startDate).toDateString() === today);
  const nextCheckIn = receivedBookings
    .filter((b: any) => b.startDate && new Date(b.startDate) >= new Date())
    .sort((a: any, z: any) => new Date(a.startDate).getTime() - new Date(z.startDate).getTime())[0];

  const [activeTab, setActiveTab] = useState("overview");

  // Subscription state
  const [subscription, setSubscription] = useState<{
    plan: string; status: string; billingCycle: string; billingMonths: number;
    amountPaid: number; startDate: string; endDate: string;
    listingCount: number; listingLimit: number;
  } | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [upgradeDialogPlan, setUpgradeDialogPlan] = useState<"silver" | "gold" | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly" | "custom">("monthly");
  const [customMonths, setCustomMonths] = useState(3);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Admin subscription management state
  const [adminSubscriptions, setAdminSubscriptions] = useState<any[]>([]);
  const [isLoadingAdminSubs, setIsLoadingAdminSubs] = useState(false);
  const [adminPayments, setAdminPayments] = useState<any[]>([]);
  const [isLoadingAdminPayments, setIsLoadingAdminPayments] = useState(false);
  const [assignSubDialog, setAssignSubDialog] = useState<{ userId: string; userName: string } | null>(null);
  const [assignPlan, setAssignPlan] = useState<"standard" | "silver" | "gold">("silver");
  const [assignMonths, setAssignMonths] = useState(1);
  const [isAssigning, setIsAssigning] = useState(false);

  // Admin plan management state
  const [adminPlans, setAdminPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState({ displayName: "", pricePerMonth: 0, listingLimit: 3, features: [] as string[], isActive: true });
  const [newFeature, setNewFeature] = useState("");
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [createPlanDialog, setCreatePlanDialog] = useState(false);
  const [createPlanForm, setCreatePlanForm] = useState({ name: "", displayName: "", pricePerMonth: 0, listingLimit: 3, features: [] as string[], isActive: true });
  const [createPlanFeature, setCreatePlanFeature] = useState("");
  const [deletingPlanName, setDeletingPlanName] = useState<string | null>(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  // Admin payment settings state
  const [paymentSettings, setPaymentSettings] = useState<{
    pesapalConsumerKey: string; pesapalConsumerSecret: string;
    pesapalMode: string; pesapalIpnId: string;
  } | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ pesapalConsumerKey: "", pesapalConsumerSecret: "", pesapalMode: "live" });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isRegisteringIpn, setIsRegisteringIpn] = useState(false);

  const fetchAdminStats = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingAdminStats(true);
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsersCount(data.totalUsers);
        setRevenue(data.totalRevenue);
        setTotalBookings(data.totalBookings);
        setTotalProperties(data.totalProperties);
      } else {
        toast({ title: "Could not load admin stats", description: "Failed to fetch platform statistics.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load admin stats.", variant: "destructive" });
    } finally {
      setIsLoadingAdminStats(false);
    }
  }, [user, token, toast]);

  const fetchAdminUsers = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingAdminUsers(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      } else {
        toast({ title: "Could not load users", description: "Failed to fetch user list.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load users.", variant: "destructive" });
    } finally {
      setIsLoadingAdminUsers(false);
    }
  }, [user, token, toast]);

  const fetchModerationQueue = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingModeration(true);
    try {
      const res = await fetch("/api/admin/moderation", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setModerationQueue(data);
      } else {
        toast({ title: "Could not load moderation queue", description: "Failed to fetch pending properties.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load the moderation queue.", variant: "destructive" });
    } finally {
      setIsLoadingModeration(false);
    }
  }, [user, token, toast]);

  const fetchAdminProperties = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingAdminProperties(true);
    try {
      const res = await fetch("/api/properties", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminProperties(data);
      } else {
        toast({ title: "Could not load properties", description: "Failed to fetch platform listings.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load properties.", variant: "destructive" });
    } finally {
      setIsLoadingAdminProperties(false);
    }
  }, [user, token, toast]);

  const fetchOwnerProperties = useCallback(async () => {
    if (!user || !token || (user.role !== 'owner' && user.role !== 'host')) return;
    setIsLoadingProperties(true);
    try {
      const res = await fetch(`/api/properties?ownerId=${encodeURIComponent(user.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOwnerProperties(data);
      } else {
        toast({ title: "Could not load listings", description: "Failed to fetch your properties. Please refresh.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load your listings.", variant: "destructive" });
    } finally {
      setIsLoadingProperties(false);
    }
  }, [user, token, toast]);

  const fetchFavoritesAndMessages = useCallback(async () => {
    if (!user || !token || (user.role !== 'tenant' && user.role !== 'guest')) return;
    try {
      const [favRes, msgRes] = await Promise.all([
        fetch("/api/favorites", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/messages", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (favRes.ok) setFavorites(await favRes.json());
      if (msgRes.ok) setMessages(await msgRes.json());
    } catch { /* silent — stats are non-critical */ }
  }, [user, token]);

  const fetchBookings = useCallback(async () => {
    if (!user || !token) return;
    setIsLoadingBookings(true);
    try {
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      } else {
        toast({ title: "Could not load bookings", description: "Failed to fetch your bookings. Please refresh.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load your bookings.", variant: "destructive" });
    } finally {
      setIsLoadingBookings(false);
    }
  }, [user, token, toast]);

  const fetchReceivedBookings = useCallback(async () => {
    if (!user || !token || (user.role !== 'owner' && user.role !== 'host')) return;
    setIsLoadingReceivedBookings(true);
    try {
      const res = await fetch("/api/bookings/received", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReceivedBookings(data);
      } else {
        toast({ title: "Could not load reservations", description: "Failed to fetch incoming bookings. Please refresh.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load reservations.", variant: "destructive" });
    } finally {
      setIsLoadingReceivedBookings(false);
    }
  }, [user, token, toast]);

  const fetchUnreadBookingCount = useCallback(async () => {
    if (!user || !token) return;
    try {
      const res = await fetch("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadBookingCount(data.count ?? 0);
      }
    } catch {
      // silent — badge is non-critical
    }
  }, [user, token]);

  const markNotificationsRead = useCallback(async () => {
    if (!user || !token) return;
    if (unreadBookingCount === 0) return;
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUnreadBookingCount(0);
      }
    } catch {
      // non-critical UI operation; badge stays until next successful sync
    }
  }, [user, token, unreadBookingCount]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !token || (user.role !== 'owner' && user.role !== 'host')) return;
    setIsLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOwnerNotifications(data);
      }
    } catch {
      // non-critical
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user, token]);

  const markOneNotificationRead = useCallback(async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setOwnerNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
        setUnreadBookingCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      // non-critical
    }
  }, [token]);

  const clearAllNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setOwnerNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadBookingCount(0);
      }
    } catch {
      // non-critical
    }
  }, [token]);

  const fetchAdminPlans = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    try {
      const res = await fetch("/api/admin/plans", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAdminPlans(await res.json());
    } catch { /* non-critical */ }
  }, [user, token]);

  const fetchAdminSubscriptions = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingAdminSubs(true);
    try {
      const res = await fetch("/api/admin/subscriptions", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAdminSubscriptions(await res.json());
    } catch { /* non-critical */ } finally { setIsLoadingAdminSubs(false); }
  }, [user, token]);

  const fetchAdminPayments = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingAdminPayments(true);
    try {
      const res = await fetch("/api/admin/payments", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAdminPayments(await res.json());
    } catch { /* non-critical */ } finally { setIsLoadingAdminPayments(false); }
  }, [user, token]);

  const fetchPaymentSettings = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPaymentSettings(data);
        setSettingsForm({ pesapalConsumerKey: data.pesapalConsumerKey, pesapalConsumerSecret: "", pesapalMode: data.pesapalMode });
      }
    } catch { /* non-critical */ } finally { setIsLoadingSettings(false); }
  }, [user, token]);

  const fetchSubscription = useCallback(async () => {
    if (!user || !token || (user.role !== 'owner' && user.role !== 'host')) return;
    setIsLoadingSubscription(true);
    try {
      const res = await fetch("/api/subscriptions/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch {
      // non-critical, subscription tab will show loading state
    } finally {
      setIsLoadingSubscription(false);
    }
  }, [user, token]);

  const handleSubscriptionUpgrade = async () => {
    if (!upgradeDialogPlan || !token) return;
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/subscriptions/upgrade", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: upgradeDialogPlan,
          billingCycle,
          months: customMonths,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Upgrade failed", description: data.error || "Could not upgrade plan.", variant: "destructive" });
        return;
      }
      await fetchSubscription();
      setUpgradeDialogPlan(null);
      toast({
        title: "Plan Activated!",
        description: data.message || "Your subscription has been upgraded.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleDowngradeToFree = async () => {
    if (!token) return;
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/subscriptions/upgrade", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "standard" }),
      });
      if (res.ok) {
        await fetchSubscription();
        toast({ title: "Downgraded to Standard", description: "Your plan has been set back to Free." });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === "reservations" || tab === "bookings") {
      markNotificationsRead();
    }
    if (tab === "notifications") {
      fetchNotifications();
    }
  }, [markNotificationsRead, fetchNotifications]);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (user && token) {
      fetchOwnerProperties();
      fetchBookings();
      fetchReceivedBookings();
      fetchUnreadBookingCount();
      fetchSubscription();
      fetchFavoritesAndMessages();
      if (user.role === 'admin') {
        fetchAdminStats();
        fetchModerationQueue();
        fetchAdminUsers();
        fetchAdminProperties();
        fetchAdminSubscriptions();
        fetchAdminPayments();
        fetchPaymentSettings();
        fetchAdminPlans();
      }
    }
  }, [user, token, fetchOwnerProperties, fetchBookings, fetchReceivedBookings, fetchUnreadBookingCount, fetchSubscription, fetchFavoritesAndMessages, fetchAdminStats, fetchModerationQueue, fetchAdminUsers, fetchAdminProperties, fetchAdminSubscriptions, fetchAdminPayments, fetchPaymentSettings, fetchAdminPlans]);

  // Handle return from PesaPal payment
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("payment=")) return;
    const params = new URLSearchParams(hash.split("?")[1] ?? "");
    const paymentResult = params.get("payment");
    if (!paymentResult) return;

    // Clean up URL
    const cleanHash = hash.replace(/[?&]payment=[^&]*/, "");
    window.history.replaceState(null, "", window.location.pathname + cleanHash);

    if (paymentResult === "success") {
      fetchSubscription();
      toast({
        title: "Payment successful!",
        description: "Your subscription has been activated. Thank you!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    } else if (paymentResult === "failed") {
      toast({
        title: "Payment failed",
        description: "The payment was not completed. Please try again.",
        variant: "destructive",
      });
    } else if (paymentResult === "cancelled") {
      toast({ title: "Payment cancelled", description: "No charges were made." });
    } else if (paymentResult === "error") {
      toast({ title: "Payment error", description: "Something went wrong processing your payment.", variant: "destructive" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Handlers for interactions
  const handleApprove = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/properties/${id}/verify`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Approval failed", description: "Could not approve this property.", variant: "destructive" });
        return;
      }
      setModerationQueue(prev => prev.filter(item => item.id !== id));
      await fetchAdminStats();
      toast({
        title: "Listing Approved",
        description: "Property is now live on the platform.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Rejection failed", description: "Could not remove this property.", variant: "destructive" });
        return;
      }
      setModerationQueue(prev => prev.filter(item => item.id !== id));
      await fetchAdminStats();
      toast({
        title: "Listing Rejected",
        description: "Property has been removed.",
        variant: "destructive",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    }
  };

  const handleFlag = async () => {
    if (!flagDialogId || !token || !flagComment.trim()) return;
    setIsFlagging(true);
    try {
      const res = await fetch(`/api/admin/properties/${flagDialogId}/flag`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ comment: flagComment.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Flag failed", description: (data as { error?: string }).error || "Could not flag property.", variant: "destructive" });
        return;
      }
      setModerationQueue(prev => prev.filter(item => item.id !== flagDialogId));
      setFlagDialogId(null);
      setFlagComment("");
      await fetchAdminStats();
      toast({
        title: "Listing Flagged",
        description: "Owner has been notified with your feedback.",
        className: "bg-orange-50 border-orange-200 text-orange-800",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setIsFlagging(false);
    }
  };

  const handleOwnerResubmit = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/properties/${id}/resubmit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Resubmit failed", description: "Could not resubmit this property.", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setOwnerProperties(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      toast({
        title: "Resubmitted for Review",
        description: "Your listing has been sent back to admin for approval.",
        className: "bg-blue-50 border-blue-200 text-blue-800",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    }
  };

  const handleResolveReport = (id: number) => {
    setReportedListings(prev => prev.filter(item => item !== id));
    toast({
      title: "Report Resolved",
      description: `Action taken on listing #${id}.`,
    });
  };

  const handleAdminDeleteProperty = async (id: string) => {
    if (!token) return;
    setAdminPropertyActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Delete failed", description: "Could not delete this property.", variant: "destructive" });
        return;
      }
      setAdminProperties(prev => prev.filter(p => p.id !== id));
      await fetchAdminStats();
      toast({ title: "Property Deleted", description: "Listing permanently removed.", variant: "destructive" });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setAdminPropertyActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAdminToggleProperty = async (id: string) => {
    if (!token) return;
    setAdminPropertyActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Update failed", description: "Could not update this property.", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setAdminProperties(prev => prev.map(p => p.id === id ? { ...p, isVerified: updated.isVerified } : p));
      toast({
        title: updated.isVerified ? "Property Activated" : "Property Deactivated",
        description: updated.isVerified ? "This listing is now live." : "This listing has been taken offline.",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setAdminPropertyActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleUserStatusUpdate = async (userId: string, newStatus: "active" | "suspended") => {
    if (!token) return;
    setUserActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Action failed", description: (data as { error?: string }).error || "Could not update user status.", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, status: updated.status } : u));
      toast({
        title: newStatus === "suspended" ? "User suspended" : "User reactivated",
        description: newStatus === "suspended"
          ? `${updated.name} has been suspended.`
          : `${updated.name} is now active.`,
        className: newStatus === "active" ? "bg-green-50 border-green-200 text-green-800" : undefined,
        variant: newStatus === "suspended" ? "destructive" : undefined,
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setUserActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Delete failed",
          description: (data as { error?: string }).error || "Could not delete property.",
          variant: "destructive",
        });
        return;
      }
      setOwnerProperties(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Property Removed",
        description: "Listing deleted successfully.",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    }
  };

  const handleTogglePropertyStatus = (id: string) => {
    setOwnerProperties(prev => prev.map(p => {
      if (p.id === id) {
        const newStatus = p.status === 'active' ? 'inactive' : 'active';
        toast({
          title: `Property ${newStatus === 'active' ? 'Activated' : 'Deactivated'}`,
          description: `The listing is now ${newStatus}.`,
        });
        return { ...p, status: newStatus };
      }
      return p;
    }));
  };

  const [bookingActionLoading, setBookingActionLoading] = useState<Record<string, boolean>>({});

  const handleBookingStatusUpdate = async (bookingId: string, status: "confirmed" | "cancelled") => {
    if (!token) return;
    setBookingActionLoading(prev => ({ ...prev, [bookingId]: true }));
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Action failed", description: (data as { error?: string }).error || "Could not update booking status.", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setReceivedBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: updated.status } : b));
      toast({
        title: status === "confirmed" ? "Booking confirmed" : "Booking declined",
        description: status === "confirmed" ? "The guest has been confirmed." : "The booking has been declined.",
        className: status === "confirmed" ? "bg-green-50 border-green-200 text-green-800" : undefined,
        variant: status === "cancelled" ? "destructive" : undefined,
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setBookingActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden w-full font-sans">
      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden bg-zinc-900 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="inndos" className="h-8 w-auto brightness-0 invert" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white/80 hover:text-white rounded-full"><Bell className="w-5 h-5" /></Button>
        </div>
      </div>
      
      {/* Mobile Tabs List (Horizontal scroll) */}
      <div className="md:hidden bg-zinc-800 shrink-0 border-b border-white/10">
        <TabsList className="flex w-full h-auto bg-transparent p-2 overflow-x-auto justify-start no-scrollbar gap-2">
          <TabsTrigger value="overview" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="settings" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            Profile
          </TabsTrigger>
          <TabsTrigger value="messages" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            Messages
          </TabsTrigger>
          <TabsTrigger value="bookings" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            Bookings
            {user.role !== 'owner' && user.role !== 'host' && user.role !== 'admin' && unreadBookingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            Analytics
          </TabsTrigger>
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="subscription" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Subscription
            </TabsTrigger>
          )}
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="listings" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Listings
            </TabsTrigger>
          )}
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="reservations" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Reservations
              {unreadBookingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
                </span>
              )}
            </TabsTrigger>
          )}
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="notifications" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Notifications
              {unreadBookingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
                </span>
              )}
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="all-properties" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Properties
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="users" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Users
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="admin-subscriptions" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Subscriptions
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="payment-settings" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Payments
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      {/* Desktop Sidebar */}
      <div className="w-[280px] flex-shrink-0 bg-zinc-900 flex-col h-screen overflow-hidden hidden md:flex">
        {/* Logo */}
        <div className="p-6 pb-2">
            <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer mb-6">
                <img src="/logo.png" alt="inndos" className="h-8 w-auto brightness-0 invert" />
            </div>
            </Link>
            <div className="mb-6">
              <p className="text-zinc-400 text-xs font-semibold tracking-widest uppercase mb-1">{user.role} PORTAL</p>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-2">
            <TabsList className="flex flex-col w-full h-auto bg-transparent p-0 space-y-1">
            <TabsTrigger value="overview" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Home className="w-5 h-5 mr-3" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="settings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <UserCircle className="w-5 h-5 mr-3" /> My Profile
            </TabsTrigger>
            <TabsTrigger value="messages" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <MessageSquare className="w-5 h-5 mr-3" /> Messages
            </TabsTrigger>
            <TabsTrigger value="bookings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Calendar className="w-5 h-5 mr-3" /> Bookings
                {user.role !== 'owner' && user.role !== 'host' && user.role !== 'admin' && unreadBookingCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
                  </span>
                )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <BarChart3 className="w-5 h-5 mr-3" /> Analytics
            </TabsTrigger>
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="subscription" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Crown className="w-5 h-5 mr-3" /> Subscription
                </TabsTrigger>
            )}
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="listings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <FileText className="w-5 h-5 mr-3" /> My Listings
                </TabsTrigger>
            )}
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="reservations" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Users className="w-5 h-5 mr-3" /> Reservations
                {unreadBookingCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
                  </span>
                )}
                </TabsTrigger>
            )}
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="notifications" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Bell className="w-5 h-5 mr-3" /> Notifications
                {unreadBookingCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
                  </span>
                )}
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="all-properties" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Home className="w-5 h-5 mr-3" /> All Properties
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="users" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Users className="w-5 h-5 mr-3" /> Users
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="admin-subscriptions" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Crown className="w-5 h-5 mr-3" /> Subscriptions
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="payment-settings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <CreditCard className="w-5 h-5 mr-3" /> Payments
                </TabsTrigger>
            )}
            </TabsList>
        </div>

        <div className="p-4 mt-auto mb-4 mx-4 border-t border-white/10 pt-6">
            <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-semibold shrink-0">
                {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-white min-w-0">
                <div className="font-medium text-sm leading-tight truncate">{user.name}</div>
                <div className="text-xs text-zinc-400 leading-tight truncate mt-1">{user.email || `${user.role}@inndos.com`}</div>
            </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/5 px-2 font-normal" onClick={logout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Sign Out
            </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-[calc(100vh-120px)] md:h-screen overflow-hidden">
        {/* Desktop Header */}
        <div className="bg-white border-b px-8 py-4 hidden md:flex items-center justify-between shrink-0 shadow-sm z-10">
            <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="text-gray-500 rounded-full hover:bg-gray-100"><Bell className="w-5 h-5" /></Button>
                <Link href="/">
                <Button variant="outline" size="sm" className="gap-2 font-medium text-gray-700 bg-white hover:bg-gray-50"><ExternalLink className="w-4 h-4" /> Back to Site</Button>
                </Link>
            </div>
        </div>
        
        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
            {activeTab === 'overview' && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back, {user.name.split(' ')[0]}!</h1>
                  <p className="text-gray-500 text-sm">Here's your {user.role} overview</p>
                </div>
                {(user?.role === 'owner' || user?.role === 'host') && (
                  <Link href="/add-listing">
                    <Button className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 shadow-sm rounded-full px-5 h-10">
                      <Plus className="h-4 w-4" />
                      List Property
                    </Button>
                  </Link>
                )}
              </div>
            )}
            {/* ANALYTICS TAB (Shared Placeholder) */}
          <TabsContent value="analytics" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle>Analytics & Reports</CardTitle>
                 <CardDescription>View your performance metrics and download reports</CardDescription>
               </CardHeader>
               <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                 <BarChart3 className="h-16 w-16 text-gray-300 mb-4" />
                 <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available Yet</h3>
                 <p className="max-w-md">Your analytics dashboard will populate with insights once your properties start receiving views, inquiries, and bookings.</p>
                 <Button variant="outline" className="mt-6">Download Sample Report</Button>
               </CardContent>
             </Card>
          </TabsContent>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings" className="space-y-6">
            {/* Owner/Host: show bookings received on their properties */}
            {(user.role === 'owner' || user.role === 'host') ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> Reservations Received
                  </CardTitle>
                  <CardDescription>Bookings guests have made on your properties</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingReceivedBookings ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading reservations...
                    </div>
                  ) : receivedBookings.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900">No reservations yet</h3>
                      <p className="mb-4">Bookings from guests will appear here once your listings receive reservations.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {receivedBookings.map((b: any) => (
                        <div key={b.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
                          {b.propertyImage && (
                            <img src={b.propertyImage} alt={b.propertyTitle || "Property"} className="h-20 w-20 object-cover rounded-md shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base truncate">{b.propertyTitle || "Unknown Property"}</h4>
                            <p className="text-sm text-muted-foreground truncate">{b.propertyAddress}</p>
                            <p className="text-sm font-medium mt-1">Guest: {b.guestName || '—'}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                {b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Pending'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {b.startDate && b.endDate && (
                              <p className="text-sm text-muted-foreground">
                                {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                              </p>
                            )}
                            {b.totalPrice != null && (
                              <p className="font-bold text-lg text-primary mt-1">KES {Number(b.totalPrice).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Tenant/Guest: show their own bookings */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> My Bookings
                  </CardTitle>
                  <CardDescription>Your property reservations</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingBookings ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading bookings...
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900">No bookings yet</h3>
                      <p className="mb-4">Your bookings will appear here once you make a reservation.</p>
                      <Link href="/properties">
                        <Button variant="outline">Browse Properties</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((b: any) => {
                        const rawCover = (b.propertyImages && b.propertyImages.length > 0) ? b.propertyImages[0] : (b.propertyImage || null);
                        const coverPhoto = resolvePropertyImageUrl(rawCover);
                        return (
                        <div key={b.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
                          <img src={coverPhoto} alt={b.propertyTitle || "Property"} className="h-20 w-20 object-cover rounded-md shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/modern_apartment_exterior.png"; }} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base truncate">{b.propertyTitle || "Unknown Property"}</h4>
                            <p className="text-sm text-muted-foreground truncate">{b.propertyAddress}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                {b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Pending'}
                              </Badge>
                              {b.propertyType && <Badge variant="outline">{b.propertyType}</Badge>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {b.startDate && b.endDate && (
                              <p className="text-sm text-muted-foreground">
                                {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                              </p>
                            )}
                            {b.totalPrice != null && (
                              <p className="font-bold text-lg text-primary mt-1">KES {Number(b.totalPrice).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* MESSAGES TAB (Shared) */}
          <TabsContent value="messages" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle>Inbox</CardTitle>
                 <CardDescription>Manage your communications</CardDescription>
               </CardHeader>
               <CardContent>
                 <MessagingSystem />
               </CardContent>
             </Card>
          </TabsContent>

          {/* OWNER & HOST DASHBOARD */}
          {(user.role === 'owner' || user.role === 'host') && (
            <>
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-white border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Total Listings</p>
                        <Home className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="text-2xl font-bold">{ownerProperties.length}</div>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-1" /> Active now
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-white border-l-4 border-l-purple-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Bookings</p>
                        <MessageSquare className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="text-2xl font-bold">{isLoadingReceivedBookings ? '—' : receivedBookingsCount}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isLoadingReceivedBookings
                          ? 'Loading...'
                          : receivedBookingsCount === 0
                          ? 'No bookings yet'
                          : (() => {
                              const pendingCount = receivedBookings.filter((b: any) => !b.status || b.status === 'pending').length;
                              const confirmedCount = receivedBookings.filter((b: any) => b.status === 'confirmed').length;
                              const parts = [];
                              if (pendingCount > 0) parts.push(`${pendingCount} pending`);
                              if (confirmedCount > 0) parts.push(`${confirmedCount} confirmed`);
                              return parts.length > 0 ? parts.join(' · ') : 'All bookings';
                            })()
                        }
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-white border-l-4 border-l-orange-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Check-ins</p>
                        <Calendar className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="text-2xl font-bold">{isLoadingReceivedBookings ? '—' : todayCheckIns.length}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {nextCheckIn
                          ? `Next: ${new Date(nextCheckIn.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                          : 'No upcoming check-ins'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-white border-l-4 border-l-green-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                        <DollarSign className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold">KES {isLoadingReceivedBookings ? '—' : receivedRevenue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        From confirmed bookings only
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingReceivedBookings ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
                        </div>
                      ) : receivedBookings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No recent activity yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {receivedBookings.slice(0, 5).map((b: any) => {
                            const initials = (b.guestName || 'G').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                            const ago = b.createdAt ? (() => {
                              const diff = Date.now() - new Date(b.createdAt).getTime();
                              const h = Math.floor(diff / 3600000);
                              if (h < 1) return 'Just now';
                              if (h < 24) return `${h}h ago`;
                              return `${Math.floor(h / 24)}d ago`;
                            })() : '';
                            return (
                              <div key={b.id} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded transition-colors">
                                <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {b.guestName || 'A guest'} booked &ldquo;{b.propertyTitle || 'your property'}&rdquo;
                                  </p>
                                  <p className="text-xs text-muted-foreground">{ago}</p>
                                </div>
                                <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'} className="shrink-0 text-xs">
                                  {b.status || 'pending'}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                      <BarChart3 className="h-8 w-8 mb-2" /> Chart Visualization Placeholder
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="listings" className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">My Properties</h2>
                    <p className="text-sm text-gray-500">Manage your listings — pending ones await admin approval</p>
                  </div>
                  <Link href="/add-listing">
                    <Button className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 shadow-sm rounded-full px-4 h-10">
                      <Plus className="h-4 w-4" />
                      List Property
                    </Button>
                  </Link>
                </div>
                <Card>
                  <CardHeader className="hidden">
                    <CardTitle>My Properties</CardTitle>
                    <CardDescription>Manage your active listings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingProperties ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your listings...
                      </div>
                    ) : (
                    <div className="space-y-4">
                      {ownerProperties.map(p => {
                        const isFlagged = p.propertyStatus === 'flagged';
                        const isPending = !p.isVerified && !isFlagged;
                        return (
                        <div key={p.id} className={`flex flex-col gap-3 p-4 border rounded-lg transition-colors shadow-sm ${isFlagged ? 'bg-red-50/40 border-red-200' : isPending ? 'bg-yellow-50/40 border-yellow-200' : 'bg-white hover:bg-gray-50'}`}>
                          <div className="flex items-start gap-4">
                            <img src={p.image} className={`h-20 w-20 object-cover rounded-md flex-shrink-0 ${!p.isVerified ? 'opacity-70 grayscale-[20%]' : ''}`} alt={p.title} />
                            <div className="flex-1 min-w-0">
                              {p.isVerified ? (
                                <Link href={`/property/${p.id}`}>
                                  <h4 className="font-semibold text-lg truncate hover:text-primary cursor-pointer">{p.title}</h4>
                                </Link>
                              ) : (
                                <h4 className="font-semibold text-lg truncate text-gray-700">{p.title}</h4>
                              )}
                              <p className="text-sm text-muted-foreground truncate">{p.address}</p>
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {isFlagged ? (
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Flagged — Action Required</Badge>
                                ) : isPending ? (
                                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending Approval</Badge>
                                ) : p.isVerified ? (
                                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Verified & Live</Badge>
                                ) : null}
                                <Badge variant="secondary">{p.type}</Badge>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2 shrink-0">
                              <div className="font-bold text-xl text-primary">KES {p.price.toLocaleString()}</div>
                              <div className="flex gap-2 flex-wrap justify-end">
                                {isFlagged && (
                                  <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleOwnerResubmit(p.id)}>
                                    <ArrowUpRight className="h-3 w-3" /> Resubmit
                                  </Button>
                                )}
                                {p.isVerified && (
                                  <Button size="sm" variant={p.status === 'inactive' ? 'default' : 'outline'} onClick={() => handleTogglePropertyStatus(p.id)}>
                                    {p.status === 'inactive' ? 'Activate' : 'Deactivate'}
                                  </Button>
                                )}
                                {!isFlagged && (
                                  <Link href={`/add-listing?edit=${p.id}`}>
                                    <Button size="sm" variant="outline">Edit</Button>
                                  </Link>
                                )}
                                <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDeleteProperty(p.id)}>
                                  <Trash2 className="h-3 w-3" /> Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                          {isFlagged && p.adminComment && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                              <p className="font-semibold text-red-800 mb-1 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Admin Feedback</p>
                              <p className="text-red-700">{p.adminComment}</p>
                              <p className="text-xs text-red-500 mt-2">Please address the above issues, then click <strong>Resubmit</strong> to send for re-review.</p>
                            </div>
                          )}
                        </div>
                        );
                      })}
                      {pendingProperties.length > 0 && pendingProperties.map((p: any) => (
                        <div key={`pending-${p.id}`} className="flex items-center gap-4 p-4 border border-yellow-200 rounded-lg hover:bg-yellow-50 transition-colors group bg-yellow-50/30 shadow-sm">
                          <img src={p.image} className="h-20 w-20 object-cover rounded-md opacity-70 grayscale-[30%]" alt={p.title} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-lg truncate text-gray-700">{p.title}</h4>
                            <p className="text-sm text-muted-foreground truncate">Awaiting Approval</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">Pending</Badge>
                              <Badge variant="secondary">{p.type}</Badge>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end justify-center">
                            <div className="text-sm text-muted-foreground italic max-w-[150px]">
                              In review queue
                            </div>
                          </div>
                        </div>
                      ))}
                      {ownerProperties.length === 0 && pendingProperties.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                          <Home className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-medium text-gray-900">No properties listed</h3>
                          <p className="mb-4">Get started by adding your first property.</p>
                          <Link href={user.role === 'host' ? "/add-bnb" : "/add-listing"}>
                            <Button>Add Listing</Button>
                          </Link>
                        </div>
                      )}
                    </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reservations" className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Incoming Bookings</h2>
                    <p className="text-sm text-gray-500">Reservations made by guests on your properties</p>
                  </div>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {receivedBookings.length} total
                  </Badge>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    {isLoadingReceivedBookings ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading reservations...
                      </div>
                    ) : receivedBookings.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900">No bookings received yet</h3>
                        <p className="mb-4">Reservations from guests will appear here once they book your properties.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {receivedBookings.map((b: any) => {
                        const rawCover = (b.propertyImages && b.propertyImages.length > 0) ? b.propertyImages[0] : (b.propertyImage || null);
                        const coverPhoto = resolvePropertyImageUrl(rawCover);
                        return (
                          <div key={b.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
                            <img src={coverPhoto} alt={b.propertyTitle || "Property"} className="h-20 w-20 object-cover rounded-md shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/modern_apartment_exterior.png"; }} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base truncate">{b.propertyTitle || "Unknown Property"}</h4>
                              <p className="text-sm text-muted-foreground truncate">{b.propertyAddress}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 font-semibold text-xs shrink-0">
                                  {b.guestName ? b.guestName.charAt(0).toUpperCase() : "G"}
                                </div>
                                <span className="text-sm font-medium text-gray-700">{b.guestName || "Guest"}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                  {b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Pending'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {b.startDate && b.endDate && (
                                <p className="text-sm text-muted-foreground">
                                  {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                                </p>
                              )}
                              {b.totalPrice != null && (
                                <p className="font-bold text-lg text-primary">KES {Number(b.totalPrice).toLocaleString()}</p>
                              )}
                              {b.status === 'pending' && (
                                <div className="flex gap-2 mt-1">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                    disabled={bookingActionLoading[b.id]}
                                    onClick={() => handleBookingStatusUpdate(b.id, "confirmed")}
                                  >
                                    {bookingActionLoading[b.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50 gap-1"
                                    disabled={bookingActionLoading[b.id]}
                                    onClick={() => handleBookingStatusUpdate(b.id, "cancelled")}
                                  >
                                    {bookingActionLoading[b.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                    Decline
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                    <p className="text-sm text-gray-500">Alerts for bookings on your properties</p>
                  </div>
                  {ownerNotifications.some(n => !n.isRead) && (
                    <Button variant="outline" size="sm" onClick={clearAllNotifications} className="gap-2 text-gray-600">
                      <Check className="h-4 w-4" /> Mark all as read
                    </Button>
                  )}
                </div>
                <Card>
                  <CardContent className="pt-6">
                    {isLoadingNotifications ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading notifications...
                      </div>
                    ) : ownerNotifications.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
                        <p className="mb-4">You'll be notified here whenever a guest books one of your properties.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[...ownerNotifications].reverse().map((n: any) => {
                          const timeAgo = (() => {
                            const diff = Date.now() - new Date(n.createdAt).getTime();
                            const mins = Math.floor(diff / 60000);
                            if (mins < 1) return "just now";
                            if (mins < 60) return `${mins}m ago`;
                            const hrs = Math.floor(mins / 60);
                            if (hrs < 24) return `${hrs}h ago`;
                            const days = Math.floor(hrs / 24);
                            if (days < 7) return `${days}d ago`;
                            return new Date(n.createdAt).toLocaleDateString();
                          })();
                          const startLabel = n.bookingStartDate
                            ? new Date(n.bookingStartDate).toLocaleDateString()
                            : null;
                          const endLabel = n.bookingEndDate
                            ? new Date(n.bookingEndDate).toLocaleDateString()
                            : null;
                          return (
                            <div
                              key={n.id}
                              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${n.isRead ? "bg-white" : "bg-blue-50 border-blue-200"}`}
                            >
                              <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-600"}`}>
                                <Bell className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                {n.propertyTitle && (
                                  <p className="text-sm font-semibold text-gray-900 truncate">{n.propertyTitle}</p>
                                )}
                                {n.guestName && (
                                  <p className="text-sm text-gray-700">
                                    Guest: <span className="font-medium">{n.guestName}</span>
                                  </p>
                                )}
                                {startLabel && endLabel && (
                                  <p className="text-sm text-muted-foreground">
                                    {startLabel} – {endLabel}
                                  </p>
                                )}
                                {!n.propertyTitle && (
                                  <p className="text-sm text-gray-700">{n.message}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                              </div>
                              {!n.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-7 px-2 text-xs"
                                  onClick={() => markOneNotificationRead(n.id)}
                                >
                                  Mark read
                                </Button>
                              )}
                              {n.isRead && (
                                <span className="shrink-0 text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Read
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}

          {/* TENANT & GUEST DASHBOARD */}
          {(user.role === 'tenant' || user.role === 'guest') && (
            <TabsContent value="overview" className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-l-4 border-l-red-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Favorites</p>
                      <Heart className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold">{favorites.length}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-sm font-medium text-muted-foreground">Messages</p>
                       <MessageSquare className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">{messages.length}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-sm font-medium text-muted-foreground">{user.role === 'guest' ? 'Upcoming Trips' : 'Scheduled Visits'}</p>
                       <Clock className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold">{bookings.length}</div>
                    <p className="text-xs text-muted-foreground">Active bookings</p>
                  </CardContent>
                </Card>
              </div>

              <h2 className="text-xl font-bold mt-8 mb-4">Saved Properties</h2>
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border rounded-lg bg-white">
                <Heart className="h-8 w-8 mb-3 text-gray-300" />
                <p className="text-sm">You haven't saved any properties yet.</p>
                <Link href="/">
                  <Button variant="outline" size="sm" className="mt-4">Browse Listings</Button>
                </Link>
              </div>
            </TabsContent>
          )}

          {/* ADMIN DASHBOARD */}
          {user.role === 'admin' && (
            <TabsContent value="overview" className="space-y-6">
              {isLoadingAdminStats ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading platform stats...
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-l-4 border-l-yellow-500 shadow-sm cursor-pointer hover:bg-yellow-50/10 transition-colors" onClick={() => setActiveTab("overview")}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                      <FileText className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="text-3xl font-bold">{moderationQueue.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Properties awaiting verification</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold">{usersCount.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Registered on the platform</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-green-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Platform Revenue</p>
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold">KES {revenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">From non-cancelled bookings</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold">{totalBookings.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">All-time reservations</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-red-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
                      <Home className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="text-3xl font-bold">{totalProperties.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Listed on the platform</p>
                  </CardContent>
                </Card>
              </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                       <ShieldCheck className="h-5 w-5 text-primary" /> 
                       Moderation Queue
                       <Badge variant="secondary" className="ml-2">{moderationQueue.length}</Badge>
                     </CardTitle>
                     <CardDescription>Validate new property listings</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       {isLoadingModeration ? (
                         <div className="flex items-center justify-center py-12 text-muted-foreground">
                           <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading moderation queue...
                         </div>
                       ) : moderationQueue.length > 0 ? (
                         moderationQueue.map(item => (
                           <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                             <div className="flex items-center gap-4">
                               <div className="h-12 w-12 bg-gray-200 rounded-md overflow-hidden">
                                  <img src={item.image} className="h-full w-full object-cover" />
                               </div>
                               <div>
                                 <p className="font-bold text-sm">{item.title}</p>
                                 <p className="text-xs text-muted-foreground">
                                   Submitted by {item.ownerName || "Unknown"} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                                 </p>
                                 <Badge variant="outline" className="mt-1 text-[10px] h-4">{item.type}</Badge>
                               </div>
                             </div>
                             <div className="flex gap-2 flex-wrap">
                               <Dialog>
                                 <DialogTrigger asChild>
                                   <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-900">
                                     <Eye className="h-4 w-4 mr-1" /> View
                                   </Button>
                                 </DialogTrigger>
                                 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                   <DialogHeader>
                                     <DialogTitle>Property Details</DialogTitle>
                                   </DialogHeader>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                     <div>
                                        <img src={item.image} className="w-full h-64 object-cover rounded-lg border" alt={item.title} />
                                     </div>
                                     <div className="space-y-4">
                                       <div>
                                         <h3 className="font-bold text-xl">{item.title}</h3>
                                         <p className="text-muted-foreground">{item.address || "Location not specified"}</p>
                                       </div>
                                       <div className="flex gap-2 flex-wrap">
                                         <Badge>{item.type}</Badge>
                                         <Badge variant="outline" className="text-primary font-bold">KES {item.price?.toLocaleString() || 0}</Badge>
                                         {item.propertyStatus === 'flagged' && (
                                           <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">Previously Flagged</Badge>
                                         )}
                                       </div>
                                       <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                                         <div>
                                            <span className="text-muted-foreground block mb-1">Submitted By</span>
                                            <span className="font-medium flex items-center gap-2">
                                              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">{item.ownerName?.charAt(0) || 'U'}</div>
                                              {item.ownerName || "Unknown"}
                                            </span>
                                         </div>
                                         <div>
                                            <span className="text-muted-foreground block mb-1">Submitted</span>
                                            <span className="font-medium">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</span>
                                         </div>
                                         <div>
                                            <span className="text-muted-foreground block mb-1">Specs</span>
                                            <span className="font-medium">{item.beds} Beds • {item.baths} Baths</span>
                                         </div>
                                         <div>
                                            <span className="text-muted-foreground block mb-1">Size</span>
                                            <span className="font-medium">{item.sqft} sqft</span>
                                         </div>
                                       </div>
                                       <div className="border-t pt-4">
                                          <span className="text-muted-foreground block text-sm mb-2">Description</span>
                                          <p className="text-sm">A {item.type} property located in {item.address || "a prime area"}. Pending review by the admin team.</p>
                                       </div>
                                     </div>
                                   </div>
                                   <DialogFooter className="mt-6 flex justify-end gap-2 border-t pt-4">
                                      <Button variant="outline" className="text-orange-600 hover:bg-orange-50 hover:text-orange-700 border-orange-200" onClick={() => { setFlagDialogId(item.id); setFlagComment(""); }}>
                                         <AlertTriangle className="h-4 w-4 mr-2" /> Flag & Return
                                      </Button>
                                      <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(item.id)}>
                                         <Check className="h-4 w-4 mr-2" /> Approve & Publish
                                      </Button>
                                   </DialogFooter>
                                 </DialogContent>
                               </Dialog>
                               <Button size="sm" variant="outline" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200" onClick={() => { setFlagDialogId(item.id); setFlagComment(""); }}>
                                 <AlertTriangle className="h-4 w-4 mr-1" /> Flag
                               </Button>
                               <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(item.id)}>
                                 <Check className="h-4 w-4 mr-1" /> Approve
                               </Button>
                             </div>
                           </div>
                         ))
                       ) : (
                         <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                           <Check className="h-12 w-12 mx-auto mb-4 text-green-500/20" />
                           <p className="font-medium">All caught up!</p>
                           <p className="text-xs">No pending properties to review.</p>
                         </div>
                       )}
                     </div>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>
          )}

          {user.role === 'admin' && (
            <TabsContent value="all-properties" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Platform Properties</CardTitle>
                  <CardDescription>Manage, edit or terminate existing listings across the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAdminProperties ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading properties...
                    </div>
                  ) : adminProperties.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No properties found on the platform.</div>
                  ) : (
                  <div className="space-y-4">
                    {adminProperties.map(p => {
                      const isDeactivated = !p.isVerified;
                      const isActioning = !!adminPropertyActionLoading[p.id];
                      return (
                      <div key={p.id} className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg transition-colors group shadow-sm ${isDeactivated ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50 bg-white'}`}>
                        <img src={p.image} className={`h-20 w-20 object-cover rounded-md flex-shrink-0 ${isDeactivated ? 'grayscale' : ''}`} alt={p.title} />
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex justify-between items-start">
                             <div>
                                <Link href={`/property/${p.id}`}>
                                  <h4 className="font-semibold text-lg truncate hover:text-primary cursor-pointer">{p.title}</h4>
                                </Link>
                                <p className="text-sm text-muted-foreground truncate">{p.address}</p>
                             </div>
                             <div className="font-bold text-xl text-primary">KES {Number(p.price).toLocaleString()}</div>
                          </div>
                          
                          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                            <div className="flex gap-2">
                              <Badge variant="outline" className={isDeactivated ? "bg-gray-100 text-gray-600 border-gray-200" : "bg-green-50 text-green-700 border-green-200"}>
                                {isDeactivated ? 'Inactive' : 'Active'}
                              </Badge>
                              <Badge variant="secondary">{p.type}</Badge>
                              <span className="text-xs text-muted-foreground flex items-center ml-2 border-l pl-2">ID: {p.id.slice(0, 8)}</span>
                            </div>
                            
                            <div className="flex gap-2 items-center">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-900">
                                    <Eye className="h-4 w-4 mr-1" /> View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Property Details</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                       <img src={p.image} className="w-full h-64 object-cover rounded-lg border" alt={p.title} />
                                    </div>
                                    <div className="space-y-4">
                                      <div>
                                        <h3 className="font-bold text-xl">{p.title}</h3>
                                        <p className="text-muted-foreground">{p.address || "Location not specified"}</p>
                                      </div>
                                      <div className="flex gap-2">
                                        <Badge>{p.type}</Badge>
                                        <Badge variant="outline" className="text-primary font-bold">
                                           KES {Number(p.price)?.toLocaleString() || 0}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                                        {(p.beds || p.baths) && (
                                          <>
                                            <div>
                                               <span className="text-muted-foreground block mb-1">Specs</span>
                                               <span className="font-medium">{p.beds} Beds • {p.baths} Baths</span>
                                            </div>
                                            {p.sqft && (
                                            <div>
                                               <span className="text-muted-foreground block mb-1">Size</span>
                                               <span className="font-medium">{p.sqft} sqft</span>
                                            </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                      {p.description && (
                                      <div className="border-t pt-4">
                                         <span className="text-muted-foreground block text-sm mb-2">Description</span>
                                         <p className="text-sm">{p.description}</p>
                                      </div>
                                      )}
                                      {p.ownerName && (
                                      <div className="border-t pt-4 text-sm">
                                        <span className="text-muted-foreground block mb-1">Owner</span>
                                        <span className="font-medium">{p.ownerName}</span>
                                      </div>
                                      )}
                                    </div>
                                  </div>
                                  <DialogFooter className="mt-6 flex justify-end gap-2 border-t pt-4">
                                     <Button
                                       variant="outline"
                                       disabled={isActioning}
                                       className={isDeactivated ? "text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200" : "text-orange-600 hover:bg-orange-50 hover:text-orange-700 border-orange-200"}
                                       onClick={() => handleAdminToggleProperty(p.id)}
                                     >
                                        {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : (isDeactivated ? <Check className="h-4 w-4 mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />)}
                                        {isDeactivated ? 'Activate' : 'Deactivate'}
                                     </Button>
                                     <Button
                                       variant="outline"
                                       disabled={isActioning}
                                       className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                       onClick={() => handleAdminDeleteProperty(p.id)}
                                     >
                                        {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                        Delete Completely
                                     </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isActioning}
                                className={isDeactivated ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-orange-600 hover:text-orange-700 hover:bg-orange-50"}
                                onClick={() => handleAdminToggleProperty(p.id)}
                              >
                                {isActioning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : (isDeactivated ? <Check className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />)}
                                {isDeactivated ? 'Activate' : 'Deactivate'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                className="gap-2"
                                disabled={isActioning}
                                onClick={() => handleAdminDeleteProperty(p.id)}
                              >
                                {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ADMIN USERS TAB */}
          {user.role === 'admin' && (
            <TabsContent value="users" className="space-y-6">
              {/* Pending users alert banner */}
              {pendingUsers.length > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800 font-medium">
                    {pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} pending verification
                  </p>
                </div>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> All Users
                    {!isLoadingAdminUsers && (
                      <Badge variant="secondary" className="ml-2">{adminUsers.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Browse and manage user accounts across the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAdminUsers ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading users...
                    </div>
                  ) : adminUsers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="font-medium">No users found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {adminUsers.map((u: any) => {
                        const initials = u.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                        const statusColor =
                          u.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                          u.status === 'suspended' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200';
                        const isBusy = !!userActionLoading[u.id];
                        const isSelf = u.id === user.id;
                        return (
                          <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
                            <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                              {u.avatar
                                ? <img src={u.avatar} alt={u.name} className="h-full w-full object-cover rounded-full" />
                                : initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm truncate">{u.name}</span>
                                {isSelf && <Badge variant="outline" className="text-[10px] px-1.5 h-4">You</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <Badge variant="secondary" className="text-[10px] px-1.5 h-4 capitalize">{u.role}</Badge>
                                <Badge variant="outline" className={`text-[10px] px-1.5 h-4 capitalize ${statusColor}`}>{u.status}</Badge>
                                {u.joinDate && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    Joined {new Date(u.joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              {!isSelf && u.status !== 'suspended' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  disabled={isBusy}
                                  onClick={() => handleUserStatusUpdate(u.id, 'suspended')}
                                >
                                  {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                                  Suspend
                                </Button>
                              ) : !isSelf && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                  disabled={isBusy}
                                  onClick={() => handleUserStatusUpdate(u.id, 'active')}
                                >
                                  {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                  Reactivate
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* SETTINGS TAB (Shared) */}
          <TabsContent value="settings" className="space-y-6">
            
            {/* Profile Completion Header */}
            <div className="bg-white border rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-zinc-900 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-600">Profile completion:</span>
                  <span className="text-[#2E5C8A]">78%</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-900 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>

            <Card className="border-none shadow-sm">
              <CardHeader className="border-b bg-gray-50/50 rounded-t-xl pb-4">
                <div className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-gray-500" />
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                {/* Profile Picture */}

                {/* Profile Picture */}
                <div className="flex flex-col gap-2">
                  <Label>Profile Picture (Strictly face passport)</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      <UserCircle className="h-12 w-12 text-gray-400" />
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <UploadCloud className="h-4 w-4" /> Upload Picture
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" defaultValue={user.email} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone No</Label>
                    <Input id="phone" placeholder="+254 700 000000" />
                  </div>
                </div>

                {/* Document Upload */}
                <div className="space-y-2">
                  <Label>National ID or Passport</Label>
                  <p className="text-xs text-muted-foreground mb-2">Please upload a clean, clear copy of your National ID or Passport for verification.</p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center justify-center bg-gray-50/50">
                    <UploadCloud className="h-8 w-8 text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG or PNG (max. 10MB)</p>
                  </div>
                </div>

                <Button className="w-full md:w-auto" onClick={() => toast({ title: "Profile Updated", description: "Your profile details have been saved." })}>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-gray-50/50 border-b pb-4 mb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5 text-gray-500" /> Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" placeholder="Enter current password" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" placeholder="At least 8 characters" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" placeholder="Repeat new password" />
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="mt-2 font-medium" 
                  onClick={() => toast({ title: "Password Updated", description: "Your password has been changed successfully.", className: "bg-green-50 border-green-200 text-green-800" })}
                >
                  Change Password
                </Button>
              </CardContent>
            </Card>

            {/* Notifications Card */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notif" className="flex flex-col gap-1 cursor-pointer">
                      <span>Email Notifications</span>
                      <span className="font-normal text-xs text-muted-foreground">Receive updates about your listings and messages</span>
                    </Label>
                    <Input type="checkbox" id="email-notif" className="h-4 w-4 accent-primary" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Admin: Subscription Management Tab ─────────────────── */}
          {user.role === 'admin' && (
            <TabsContent value="admin-subscriptions" className="space-y-6 mt-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription Management</h1>
                  <p className="text-gray-500 text-sm">View, assign, and manage all user subscription plans</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchAdminSubscriptions} disabled={isLoadingAdminSubs} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${isLoadingAdminSubs ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total", value: adminSubscriptions.length, color: "text-gray-900" },
                  { label: "Active", value: adminSubscriptions.filter(s => s.status === 'active').length, color: "text-green-600" },
                  { label: "Silver", value: adminSubscriptions.filter(s => s.plan === 'silver' && s.status === 'active').length, color: "text-zinc-500" },
                  { label: "Gold", value: adminSubscriptions.filter(s => s.plan === 'gold' && s.status === 'active').length, color: "text-yellow-500" },
                ].map(stat => (
                  <Card key={stat.label}>
                    <CardContent className="py-4 text-center">
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{stat.label} Subscriptions</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Subscriptions table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">All Subscriptions</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingAdminSubs ? (
                    <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
                  ) : adminSubscriptions.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">No subscriptions yet</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Plan</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Period</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Paid</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {adminSubscriptions.map((sub: any) => (
                            <tr key={sub.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{sub.userName ?? "—"}</div>
                                <div className="text-xs text-gray-400">{sub.userEmail ?? ""}</div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={sub.plan === 'gold' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : sub.plan === 'silver' ? 'bg-zinc-200 text-zinc-700' : 'bg-gray-100 text-gray-600'}>
                                  {sub.plan}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className={sub.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                                  {sub.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">
                                <div>{sub.startDate} →</div>
                                <div>{sub.endDate === '9999-12-31' ? 'No expiry' : sub.endDate}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-700 font-medium">
                                {sub.amountPaid > 0 ? `KES ${sub.amountPaid.toLocaleString()}` : 'Free'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm" variant="outline"
                                    className="text-xs h-7 px-2"
                                    onClick={() => setAssignSubDialog({ userId: sub.userId, userName: sub.userName ?? sub.userEmail ?? "User" })}
                                  >
                                    Reassign
                                  </Button>
                                  {sub.status === 'active' && (
                                    <Button
                                      size="sm" variant="outline"
                                      className="text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={async () => {
                                        if (!token) return;
                                        const r = await fetch(`/api/admin/subscriptions/${sub.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                        if (r.ok) { await fetchAdminSubscriptions(); toast({ title: "Subscription cancelled" }); }
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Plan Packages Editor ─────────────────────────────── */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Subscription Packages</h2>
                    <p className="text-sm text-gray-500">Edit plan prices, listing limits, and features</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchAdminPlans} className="gap-2">
                      <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                    <Button size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2" onClick={() => {
                      setCreatePlanForm({ name: "", displayName: "", pricePerMonth: 0, listingLimit: 3, features: [], isActive: true });
                      setCreatePlanFeature("");
                      setCreatePlanDialog(true);
                    }}>
                      <Plus className="h-4 w-4" /> Create Package
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {adminPlans.map((plan: any) => (
                    <Card key={plan.name} className={`relative border-2 ${plan.name === 'gold' ? 'border-yellow-300' : plan.name === 'silver' ? 'border-zinc-300' : 'border-gray-200'}`}>
                      <CardContent className="py-5 px-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {plan.name === 'gold' && <Crown className="h-5 w-5 text-yellow-500" />}
                            {plan.name === 'silver' && <Zap className="h-5 w-5 text-zinc-500" />}
                            {plan.name === 'standard' && <Gift className="h-5 w-5 text-gray-400" />}
                            {!['gold','silver','standard'].includes(plan.name) && <Settings className="h-5 w-5 text-gray-400" />}
                            <span className="font-bold text-base capitalize">{plan.displayName}</span>
                          </div>
                          {!plan.isActive && <Badge className="bg-red-100 text-red-700 text-xs">Disabled</Badge>}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {plan.pricePerMonth === 0 ? 'Free' : `KES ${plan.pricePerMonth?.toLocaleString()}`}
                          {plan.pricePerMonth > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
                        </div>
                        <div className="text-sm text-gray-500 mb-3">
                          {plan.listingLimit >= 2147483646 ? 'Unlimited listings' : `Up to ${plan.listingLimit} listings`}
                        </div>
                        <div className="space-y-1 mb-4">
                          {(plan.features ?? []).map((f: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                              <Check className="h-3 w-3 text-green-500 shrink-0" /> {f}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => {
                              setEditingPlan(plan);
                              setPlanForm({
                                displayName: plan.displayName,
                                pricePerMonth: plan.pricePerMonth,
                                listingLimit: plan.listingLimit >= 2147483646 ? 999999 : plan.listingLimit,
                                features: plan.features ?? [],
                                isActive: plan.isActive,
                              });
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 px-2"
                            onClick={() => setDeletingPlanName(plan.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Plan edit dialog */}
              <Dialog open={!!editingPlan} onOpenChange={(open) => { if (!open) { setEditingPlan(null); setNewFeature(""); } }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 capitalize">
                      {editingPlan?.name === 'gold' && <Crown className="h-5 w-5 text-yellow-500" />}
                      {editingPlan?.name === 'silver' && <Zap className="h-5 w-5 text-zinc-500" />}
                      {editingPlan?.name === 'standard' && <Gift className="h-5 w-5 text-gray-400" />}
                      Edit {editingPlan?.name} Package
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Display Name</label>
                      <input
                        type="text"
                        value={planForm.displayName}
                        onChange={e => setPlanForm(f => ({ ...f, displayName: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      />
                    </div>
                    {editingPlan?.name !== 'standard' && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Price per Month (KES)</label>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={planForm.pricePerMonth}
                          onChange={e => setPlanForm(f => ({ ...f, pricePerMonth: Number(e.target.value) }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">
                        Listing Limit
                        {planForm.listingLimit >= 999999 && <span className="ml-2 text-xs font-normal text-green-600">(Unlimited)</span>}
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min={1}
                          max={999999}
                          value={planForm.listingLimit}
                          onChange={e => setPlanForm(f => ({ ...f, listingLimit: Number(e.target.value) }))}
                          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                        />
                        {editingPlan?.name === 'gold' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPlanForm(f => ({ ...f, listingLimit: 999999 }))}
                            className="text-xs whitespace-nowrap"
                          >
                            Set Unlimited
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Features</label>
                      <div className="space-y-1.5">
                        {planForm.features.map((feat: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={feat}
                              onChange={e => setPlanForm(f => {
                                const feats = [...f.features];
                                feats[i] = e.target.value;
                                return { ...f, features: feats };
                              })}
                              className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                            />
                            <button
                              onClick={() => setPlanForm(f => ({ ...f, features: f.features.filter((_: string, j: number) => j !== i) }))}
                              className="text-red-400 hover:text-red-600 shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newFeature}
                            onChange={e => setNewFeature(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newFeature.trim()) {
                                setPlanForm(f => ({ ...f, features: [...f.features, newFeature.trim()] }));
                                setNewFeature("");
                              }
                            }}
                            placeholder="Add a feature… (press Enter)"
                            className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800 border-dashed"
                          />
                          <Button
                            size="sm" variant="outline"
                            onClick={() => {
                              if (newFeature.trim()) {
                                setPlanForm(f => ({ ...f, features: [...f.features, newFeature.trim()] }));
                                setNewFeature("");
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPlanForm(f => ({ ...f, isActive: !f.isActive }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${planForm.isActive ? 'bg-zinc-900' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${planForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <label className="text-sm font-medium">{planForm.isActive ? 'Active (visible to users)' : 'Disabled (hidden from users)'}</label>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => { setEditingPlan(null); setNewFeature(""); }}>Cancel</Button>
                    <Button
                      className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2"
                      disabled={isSavingPlan || !planForm.displayName.trim()}
                      onClick={async () => {
                        if (!editingPlan || !token) return;
                        setIsSavingPlan(true);
                        try {
                          const payload = {
                            displayName: planForm.displayName,
                            pricePerMonth: planForm.pricePerMonth,
                            listingLimit: planForm.listingLimit >= 999999 ? 2147483647 : planForm.listingLimit,
                            features: planForm.features.filter((f: string) => f.trim()),
                            isActive: planForm.isActive,
                          };
                          const r = await fetch(`/api/admin/plans/${editingPlan.name}`, {
                            method: "PUT",
                            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                          });
                          if (r.ok) {
                            await fetchAdminPlans();
                            setEditingPlan(null);
                            setNewFeature("");
                            toast({ title: "Package updated", description: `${planForm.displayName} plan saved successfully.`, className: "bg-green-50 border-green-200 text-green-800" });
                          } else {
                            const d = await r.json();
                            toast({ title: "Save failed", description: d.error, variant: "destructive" });
                          }
                        } finally { setIsSavingPlan(false); }
                      }}
                    >
                      {isSavingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save Package
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Create Package dialog */}
              <Dialog open={createPlanDialog} onOpenChange={(open) => { if (!open) { setCreatePlanDialog(false); setCreatePlanFeature(""); } }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" /> Create New Package
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Plan ID <span className="text-gray-400 font-normal">(lowercase, no spaces)</span></label>
                      <input
                        type="text"
                        value={createPlanForm.name}
                        onChange={e => setCreatePlanForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                        placeholder="e.g. premium"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Display Name</label>
                      <input
                        type="text"
                        value={createPlanForm.displayName}
                        onChange={e => setCreatePlanForm(f => ({ ...f, displayName: e.target.value }))}
                        placeholder="e.g. Premium"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Price per Month (KES)</label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={createPlanForm.pricePerMonth}
                        onChange={e => setCreatePlanForm(f => ({ ...f, pricePerMonth: Number(e.target.value) }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">
                        Listing Limit
                        {createPlanForm.listingLimit >= 999999 && <span className="ml-2 text-xs font-normal text-green-600">(Unlimited)</span>}
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min={1}
                          max={999999}
                          value={createPlanForm.listingLimit}
                          onChange={e => setCreatePlanForm(f => ({ ...f, listingLimit: Number(e.target.value) }))}
                          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                        />
                        <Button type="button" size="sm" variant="outline" onClick={() => setCreatePlanForm(f => ({ ...f, listingLimit: 999999 }))} className="text-xs whitespace-nowrap">
                          Set Unlimited
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Features</label>
                      <div className="space-y-1.5">
                        {createPlanForm.features.map((feat: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={feat}
                              onChange={e => setCreatePlanForm(f => {
                                const feats = [...f.features];
                                feats[i] = e.target.value;
                                return { ...f, features: feats };
                              })}
                              className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                            />
                            <button onClick={() => setCreatePlanForm(f => ({ ...f, features: f.features.filter((_: string, j: number) => j !== i) }))} className="text-red-400 hover:text-red-600 shrink-0">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={createPlanFeature}
                            onChange={e => setCreatePlanFeature(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && createPlanFeature.trim()) {
                                setCreatePlanForm(f => ({ ...f, features: [...f.features, createPlanFeature.trim()] }));
                                setCreatePlanFeature("");
                              }
                            }}
                            placeholder="Add a feature… (press Enter)"
                            className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800 border-dashed"
                          />
                          <Button size="sm" variant="outline" onClick={() => {
                            if (createPlanFeature.trim()) {
                              setCreatePlanForm(f => ({ ...f, features: [...f.features, createPlanFeature.trim()] }));
                              setCreatePlanFeature("");
                            }
                          }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCreatePlanForm(f => ({ ...f, isActive: !f.isActive }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${createPlanForm.isActive ? 'bg-zinc-900' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${createPlanForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <label className="text-sm font-medium">{createPlanForm.isActive ? 'Active (visible to users)' : 'Disabled (hidden from users)'}</label>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => { setCreatePlanDialog(false); setCreatePlanFeature(""); }}>Cancel</Button>
                    <Button
                      className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2"
                      disabled={isCreatingPlan || !createPlanForm.name.trim() || !createPlanForm.displayName.trim()}
                      onClick={async () => {
                        if (!token) return;
                        setIsCreatingPlan(true);
                        try {
                          const payload = {
                            name: createPlanForm.name,
                            displayName: createPlanForm.displayName,
                            pricePerMonth: createPlanForm.pricePerMonth,
                            listingLimit: createPlanForm.listingLimit >= 999999 ? 2147483647 : createPlanForm.listingLimit,
                            features: createPlanForm.features.filter((f: string) => f.trim()),
                            isActive: createPlanForm.isActive,
                          };
                          const r = await fetch("/api/admin/plans", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                          });
                          if (r.ok) {
                            await fetchAdminPlans();
                            setCreatePlanDialog(false);
                            setCreatePlanFeature("");
                            toast({ title: "Package created", description: `${createPlanForm.displayName} plan created successfully.`, className: "bg-green-50 border-green-200 text-green-800" });
                          } else {
                            const d = await r.json();
                            toast({ title: "Create failed", description: d.error, variant: "destructive" });
                          }
                        } finally { setIsCreatingPlan(false); }
                      }}
                    >
                      {isCreatingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Create Package
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete plan confirmation dialog */}
              <Dialog open={!!deletingPlanName} onOpenChange={(open) => { if (!open) setDeletingPlanName(null); }}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                      <Trash2 className="h-5 w-5" /> Delete Package
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-2">
                    <p className="text-sm text-gray-700">
                      Are you sure you want to delete the <span className="font-semibold capitalize">{adminPlans.find(p => p.name === deletingPlanName)?.displayName ?? deletingPlanName}</span> package?
                    </p>
                    <p className="text-xs text-gray-500 mt-2">This action cannot be undone. Existing user subscriptions will not be automatically updated.</p>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setDeletingPlanName(null)}>Cancel</Button>
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white gap-2"
                      disabled={isDeletingPlan}
                      onClick={async () => {
                        if (!deletingPlanName || !token) return;
                        setIsDeletingPlan(true);
                        try {
                          const r = await fetch(`/api/admin/plans/${deletingPlanName}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (r.ok) {
                            await fetchAdminPlans();
                            setDeletingPlanName(null);
                            toast({ title: "Package deleted", description: "The plan has been removed.", className: "bg-green-50 border-green-200 text-green-800" });
                          } else {
                            const d = await r.json();
                            toast({ title: "Delete failed", description: d.error, variant: "destructive" });
                          }
                        } finally { setIsDeletingPlan(false); }
                      }}
                    >
                      {isDeletingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Assign plan dialog */}
              <Dialog open={!!assignSubDialog} onOpenChange={(open) => { if (!open) setAssignSubDialog(null); }}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Assign Subscription Plan</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <p className="text-sm text-muted-foreground">Assigning to: <span className="font-semibold">{assignSubDialog?.userName}</span></p>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Plan</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['standard', 'silver', 'gold'] as const).map(p => (
                          <button key={p} onClick={() => setAssignPlan(p)} className={`py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${assignPlan === p ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                    {assignPlan !== 'standard' && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Duration (months)</label>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setAssignMonths(m => Math.max(1, m - 1))} className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-zinc-100 font-bold text-lg leading-none">−</button>
                          <span className="w-8 text-center font-bold text-lg">{assignMonths}</span>
                          <button onClick={() => setAssignMonths(m => Math.min(24, m + 1))} className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-zinc-100 font-bold text-lg leading-none">+</button>
                          <span className="text-sm text-gray-500">months</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setAssignSubDialog(null)}>Cancel</Button>
                    <Button
                      className="bg-zinc-900 hover:bg-zinc-800 text-white"
                      disabled={isAssigning}
                      onClick={async () => {
                        if (!assignSubDialog || !token) return;
                        setIsAssigning(true);
                        try {
                          const r = await fetch("/api/admin/subscriptions/assign", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: assignSubDialog.userId, plan: assignPlan, billingMonths: assignMonths }),
                          });
                          if (r.ok) {
                            await fetchAdminSubscriptions();
                            setAssignSubDialog(null);
                            toast({ title: "Plan assigned", description: `${assignSubDialog.userName} is now on ${assignPlan} plan.`, className: "bg-green-50 border-green-200 text-green-800" });
                          } else {
                            const d = await r.json();
                            toast({ title: "Failed", description: d.error, variant: "destructive" });
                          }
                        } finally { setIsAssigning(false); }
                      }}
                    >
                      {isAssigning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Assign Plan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          )}

          {/* ── Admin: Payment Settings Tab ─────────────────────────── */}
          {user.role === 'admin' && (
            <TabsContent value="payment-settings" className="space-y-6 mt-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment Settings</h1>
                  <p className="text-gray-500 text-sm">Configure PesaPal integration and manage payment credentials</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchPaymentSettings} disabled={isLoadingSettings} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isLoadingSettings ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>

              {/* Mode + status banner */}
              <Card className={`border-2 ${paymentSettings?.pesapalMode === 'live' ? 'border-green-400 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
                <CardContent className="py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Globe className={`h-6 w-6 ${paymentSettings?.pesapalMode === 'live' ? 'text-green-600' : 'text-yellow-600'}`} />
                    <div>
                      <div className="font-semibold text-gray-900">
                        {paymentSettings?.pesapalMode === 'live' ? 'Live Mode (Production)' : 'Sandbox Mode (Testing)'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {paymentSettings?.pesapalMode === 'live'
                          ? 'Real payments are being processed via pay.pesapal.com'
                          : 'Test payments only via cybqa.pesapal.com'}
                      </div>
                    </div>
                  </div>
                  <Badge className={paymentSettings?.pesapalMode === 'live' ? 'bg-green-100 text-green-800 border-green-300 text-sm' : 'bg-yellow-100 text-yellow-800 border-yellow-300 text-sm'}>
                    {paymentSettings?.pesapalMode === 'live' ? '● LIVE' : '◌ SANDBOX'}
                  </Badge>
                </CardContent>
              </Card>

              {/* PesaPal config card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-zinc-500" /> PesaPal Configuration
                  </CardTitle>
                  <CardDescription>Update your PesaPal API credentials. Changes take effect immediately.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Consumer Key</label>
                    <input
                      type="text"
                      value={settingsForm.pesapalConsumerKey}
                      onChange={e => setSettingsForm(f => ({ ...f, pesapalConsumerKey: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      placeholder="PesaPal Consumer Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Consumer Secret</label>
                    <input
                      type="password"
                      value={settingsForm.pesapalConsumerSecret}
                      onChange={e => setSettingsForm(f => ({ ...f, pesapalConsumerSecret: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      placeholder={paymentSettings?.pesapalConsumerSecret ? `Current: ${paymentSettings.pesapalConsumerSecret}` : "Enter new secret"}
                    />
                    <p className="text-xs text-gray-400">Leave blank to keep the existing secret unchanged.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['sandbox', 'live'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setSettingsForm(f => ({ ...f, pesapalMode: mode }))}
                          className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors capitalize ${settingsForm.pesapalMode === mode ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
                        >
                          {mode === 'live' ? '● Live (Production)' : '◌ Sandbox (Testing)'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto gap-2"
                    disabled={isSavingSettings}
                    onClick={async () => {
                      if (!token) return;
                      setIsSavingSettings(true);
                      try {
                        const r = await fetch("/api/admin/settings", {
                          method: "PUT",
                          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                          body: JSON.stringify(settingsForm),
                        });
                        if (r.ok) {
                          await fetchPaymentSettings();
                          toast({ title: "Settings saved", description: "PesaPal configuration updated.", className: "bg-green-50 border-green-200 text-green-800" });
                        } else {
                          const d = await r.json();
                          toast({ title: "Save failed", description: d.error, variant: "destructive" });
                        }
                      } finally { setIsSavingSettings(false); }
                    }}
                  >
                    {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                    Save Configuration
                  </Button>
                </CardContent>
              </Card>

              {/* IPN Registration */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">IPN Webhook</CardTitle>
                  <CardDescription>Register the Instant Payment Notification (IPN) URL with PesaPal. This allows PesaPal to notify INNDOS when a payment is completed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 rounded-lg border p-3 font-mono text-xs text-gray-700 break-all">
                    {`${window.location.origin}/api/subscriptions/ipn`}
                  </div>
                  {paymentSettings?.pesapalIpnId && (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <Check className="h-4 w-4" />
                      <span>IPN Registered — ID: <span className="font-mono">{paymentSettings.pesapalIpnId}</span></span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={isRegisteringIpn}
                    onClick={async () => {
                      if (!token) return;
                      setIsRegisteringIpn(true);
                      try {
                        const ipnUrl = `${window.location.origin}/api/subscriptions/ipn`;
                        const r = await fetch("/api/admin/settings/register-ipn", {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                          body: JSON.stringify({ ipnUrl }),
                        });
                        const d = await r.json();
                        if (r.ok) {
                          await fetchPaymentSettings();
                          toast({ title: "IPN Registered", description: `ID: ${d.ipnId}`, className: "bg-green-50 border-green-200 text-green-800" });
                        } else {
                          toast({ title: "Registration failed", description: d.error, variant: "destructive" });
                        }
                      } finally { setIsRegisteringIpn(false); }
                    }}
                  >
                    {isRegisteringIpn ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {paymentSettings?.pesapalIpnId ? 'Re-register IPN' : 'Register IPN URL'}
                  </Button>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Payment History</CardTitle>
                    <CardDescription>All PesaPal payment transactions</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={fetchAdminPayments} disabled={isLoadingAdminPayments} className="gap-1 text-xs">
                    <RefreshCw className={`h-3 w-3 ${isLoadingAdminPayments ? 'animate-spin' : ''}`} />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingAdminPayments ? (
                    <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
                  ) : adminPayments.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">No payments recorded yet</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Plan</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Amount</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Method</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Ref</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {adminPayments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium">{p.userName ?? "—"}</div>
                                <div className="text-xs text-gray-400">{p.userEmail}</div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={p.plan === 'gold' ? 'bg-yellow-100 text-yellow-800' : 'bg-zinc-200 text-zinc-700'}>{p.plan}</Badge>
                              </td>
                              <td className="px-4 py-3 font-semibold">KES {p.amount?.toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <Badge className={p.status === 'completed' ? 'bg-green-100 text-green-800' : p.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'}>
                                  {p.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{p.paymentMethod ?? '—'}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs font-mono">{p.merchantReference?.slice(-10) ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Subscription Tab */}
      {(user.role === 'owner' || user.role === 'host') && (
        <TabsContent value="subscription" className="space-y-6 mt-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription</h1>
              <p className="text-gray-500 text-sm">Manage your listing plan and billing</p>
            </div>
          </div>

          {/* Current Plan Banner */}
          {isLoadingSubscription ? (
            <Card className="border-2 border-zinc-200">
              <CardContent className="py-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </CardContent>
            </Card>
          ) : subscription && (
            <Card className={`border-2 ${subscription.plan === 'gold' ? 'border-yellow-400 bg-yellow-50' : subscription.plan === 'silver' ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
              <CardContent className="py-5 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {subscription.plan === 'gold' ? <Crown className="h-7 w-7 text-yellow-500" /> : subscription.plan === 'silver' ? <Zap className="h-7 w-7 text-zinc-500" /> : <Gift className="h-7 w-7 text-zinc-400" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold capitalize">{subscription.plan} Plan</span>
                        <Badge className={subscription.plan === 'gold' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : subscription.plan === 'silver' ? 'bg-zinc-200 text-zinc-700' : 'bg-gray-100 text-gray-600'}>
                          {subscription.status}
                        </Badge>
                      </div>
                      {subscription.plan !== 'standard' && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Valid until {subscription.endDate} · {subscription.billingCycle === 'custom' ? `${subscription.billingMonths} months` : subscription.billingCycle}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-700">
                      {subscription.listingCount} / {subscription.listingLimit === Infinity ? '∞' : subscription.listingLimit} listings used
                    </div>
                    <div className="w-40 bg-gray-200 rounded-full h-2 mt-1.5">
                      <div
                        className={`h-2 rounded-full ${subscription.plan === 'gold' ? 'bg-yellow-400' : subscription.plan === 'silver' ? 'bg-zinc-500' : 'bg-zinc-800'}`}
                        style={{ width: subscription.listingLimit === Infinity ? `${Math.min((subscription.listingCount / 10) * 100, 100)}%` : `${Math.min((subscription.listingCount / subscription.listingLimit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                {subscription.plan !== 'standard' && (
                  <div className="mt-4 pt-3 border-t border-black/10">
                    <button
                      onClick={handleDowngradeToFree}
                      disabled={isUpgrading}
                      className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
                    >
                      Downgrade to Standard (Free)
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Standard */}
            <Card className={`border-2 flex flex-col ${subscription?.plan === 'standard' ? 'border-zinc-800 ring-2 ring-zinc-800 ring-offset-2' : 'border-zinc-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-5 w-5 text-zinc-400" />
                  <CardTitle className="text-base font-bold">Standard</CardTitle>
                  {subscription?.plan === 'standard' && <Badge className="ml-auto text-[10px] bg-zinc-800 text-white">Current</Badge>}
                </div>
                <CardDescription className="text-2xl font-black text-zinc-900">Free</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Up to 3 property listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Basic analytics</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Booking management</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> Priority support</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> Featured listings</li>
                </ul>
                <Button variant="outline" disabled className="w-full mt-auto">
                  {subscription?.plan === 'standard' ? 'Active Plan' : 'Free Tier'}
                </Button>
              </CardContent>
            </Card>

            {/* Silver */}
            <Card className={`border-2 flex flex-col ${subscription?.plan === 'silver' ? 'border-zinc-500 ring-2 ring-zinc-500 ring-offset-2' : 'border-zinc-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-5 w-5 text-zinc-500" />
                  <CardTitle className="text-base font-bold">Silver</CardTitle>
                  {subscription?.plan === 'silver' && <Badge className="ml-auto text-[10px] bg-zinc-500 text-white">Current</Badge>}
                </div>
                <CardDescription>
                  <span className="text-2xl font-black text-zinc-900">KES 200</span>
                  <span className="text-gray-400 text-sm"> / month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Up to 7 property listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Advanced analytics</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Booking management</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Priority support</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> Featured listings</li>
                </ul>
                <Button
                  className="w-full mt-auto bg-zinc-800 hover:bg-zinc-700 text-white"
                  onClick={() => { setUpgradeDialogPlan("silver"); setBillingCycle("monthly"); setCustomMonths(3); }}
                  disabled={subscription?.plan === 'silver'}
                >
                  {subscription?.plan === 'silver' ? 'Active Plan' : subscription?.plan === 'gold' ? 'Downgrade to Silver' : 'Upgrade to Silver'}
                </Button>
              </CardContent>
            </Card>

            {/* Gold */}
            <Card className={`border-2 flex flex-col ${subscription?.plan === 'gold' ? 'border-yellow-400 ring-2 ring-yellow-400 ring-offset-2 bg-yellow-50' : 'border-yellow-300'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <CardTitle className="text-base font-bold">Gold</CardTitle>
                  <Badge className="text-[10px] bg-yellow-100 text-yellow-800 border-yellow-300">Best Value</Badge>
                  {subscription?.plan === 'gold' && <Badge className="ml-auto text-[10px] bg-yellow-500 text-white">Current</Badge>}
                </div>
                <CardDescription>
                  <span className="text-2xl font-black text-zinc-900">KES 300</span>
                  <span className="text-gray-400 text-sm"> / month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Unlimited property listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Advanced analytics</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Booking management</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Priority support</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Featured listings</li>
                </ul>
                <Button
                  className="w-full mt-auto bg-yellow-500 hover:bg-yellow-400 text-white font-semibold"
                  onClick={() => { setUpgradeDialogPlan("gold"); setBillingCycle("monthly"); setCustomMonths(3); }}
                  disabled={subscription?.plan === 'gold'}
                >
                  {subscription?.plan === 'gold' ? 'Active Plan' : 'Upgrade to Gold'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Upgrade Dialog */}
          <Dialog open={!!upgradeDialogPlan} onOpenChange={(open) => { if (!open) setUpgradeDialogPlan(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {upgradeDialogPlan === 'gold' ? <Crown className="h-5 w-5 text-yellow-500" /> : <Zap className="h-5 w-5 text-zinc-500" />}
                  Activate {upgradeDialogPlan === 'gold' ? 'Gold' : 'Silver'} Plan
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-2">
                <p className="text-sm text-muted-foreground">
                  {upgradeDialogPlan === 'gold' ? 'KES 300/month · Unlimited listings · All features' : 'KES 200/month · Up to 7 listings · Priority support'}
                </p>

                {/* Billing cycle selector */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Billing Period</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['monthly', 'yearly', 'custom'] as const).map((cycle) => (
                      <button
                        key={cycle}
                        onClick={() => setBillingCycle(cycle)}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors capitalize ${billingCycle === cycle ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
                      >
                        {cycle === 'yearly' ? 'Yearly' : cycle === 'monthly' ? 'Monthly' : 'Custom'}
                      </button>
                    ))}
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-xs text-green-600 font-medium">Save KES {upgradeDialogPlan === 'gold' ? '24' : '16'} with yearly billing!</p>
                  )}
                </div>

                {/* Custom months input */}
                {billingCycle === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Number of Months</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCustomMonths(m => Math.max(1, m - 1))}
                        className="h-8 w-8 rounded-full border border-zinc-300 flex items-center justify-center hover:bg-zinc-100 font-bold text-lg leading-none"
                      >−</button>
                      <span className="w-10 text-center font-bold text-lg">{customMonths}</span>
                      <button
                        onClick={() => setCustomMonths(m => Math.min(24, m + 1))}
                        className="h-8 w-8 rounded-full border border-zinc-300 flex items-center justify-center hover:bg-zinc-100 font-bold text-lg leading-none"
                      >+</button>
                      <span className="text-sm text-gray-500">months</span>
                    </div>
                  </div>
                )}

                {/* Price summary */}
                <div className="bg-gray-50 rounded-lg p-4 border space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Rate</span>
                    <span className="font-medium">KES {upgradeDialogPlan === 'gold' ? 300 : 200}/month</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium">
                      {billingCycle === 'monthly' ? '1 month' : billingCycle === 'yearly' ? '12 months' : `${customMonths} months`}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Yearly discount</span>
                      <span>− KES {upgradeDialogPlan === 'gold' ? 24 : 16}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>Total</span>
                    <span>
                      KES {(() => {
                        const base = upgradeDialogPlan === 'gold' ? 300 : 200;
                        const months = billingCycle === 'monthly' ? 1 : billingCycle === 'yearly' ? 12 : customMonths;
                        const discount = billingCycle === 'yearly' ? (upgradeDialogPlan === 'gold' ? 24 : 16) : 0;
                        return (base * months - discount).toLocaleString();
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                {/* PesaPal — primary payment method */}
                <Button
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white gap-2"
                  disabled={isUpgrading}
                  onClick={async () => {
                    if (!upgradeDialogPlan || !token) return;
                    setIsUpgrading(true);
                    try {
                      const res = await fetch("/api/subscriptions/checkout", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ plan: upgradeDialogPlan, billingCycle, months: customMonths }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        toast({ title: "Checkout failed", description: data.error || "Could not initiate payment.", variant: "destructive" });
                        return;
                      }
                      // Redirect to PesaPal payment page
                      window.location.href = data.redirectUrl;
                    } catch {
                      toast({ title: "Error", description: "Could not connect to payment gateway.", variant: "destructive" });
                    } finally {
                      setIsUpgrading(false);
                    }
                  }}
                >
                  {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Pay via PesaPal
                </Button>
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">or activate manually (demo)</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" className="flex-1" onClick={() => setUpgradeDialogPlan(null)}>Cancel</Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={handleSubscriptionUpgrade}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Activate (Skip Payment)
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      )}
        </div>
      </div>

      {/* Flag Dialog */}
      <Dialog open={!!flagDialogId} onOpenChange={(open) => { if (!open) { setFlagDialogId(null); setFlagComment(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700"><AlertTriangle className="h-5 w-5" /> Flag Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">This listing will be returned to the owner as "Flagged". It will not be visible on the platform until they fix the issues and resubmit.</p>
            <div className="space-y-1">
              <Label htmlFor="flag_comment" className="text-sm font-semibold">What needs to be corrected?</Label>
              <Textarea
                id="flag_comment"
                placeholder="e.g. The photos are blurry, please upload clearer images. Also the price seems inconsistent with the description..."
                value={flagComment}
                onChange={e => setFlagComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">The owner will see exactly this message.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setFlagDialogId(null); setFlagComment(""); }}>Cancel</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
              disabled={!flagComment.trim() || isFlagging}
              onClick={handleFlag}
            >
              {isFlagging ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Flag & Return to Owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
