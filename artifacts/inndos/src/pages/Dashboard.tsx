import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, MessageSquare, Bell, Calendar, BarChart3, Heart, Clock, Plus, Users, FileText, AlertTriangle, DollarSign, Check, X, ExternalLink, Trash2, ArrowUpRight, ArrowDownRight, ShieldCheck, Eye, Edit, Star, Bookmark, UploadCloud, Lock, UserCircle, Loader2 } from "lucide-react";
import { PROPERTIES } from "@/lib/mockData";
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
  const [pendingUsers, setPendingUsers] = useState<string[]>([]);
  const [isLoadingAdminStats, setIsLoadingAdminStats] = useState(false);
  const [isLoadingModeration, setIsLoadingModeration] = useState(false);

  // Owner State
  const [ownerProperties, setOwnerProperties] = useState<any[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);

  const [deactivatedProperties, setDeactivatedProperties] = useState<string[]>([]);

  // Bookings state (for tenants/guests)
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // Received bookings state (for owners/hosts)
  const [receivedBookings, setReceivedBookings] = useState<any[]>([]);
  const [isLoadingReceivedBookings, setIsLoadingReceivedBookings] = useState(false);

  // Keep pending properties from localStorage (local only, not yet persisted to API)
  const [pendingProperties] = useState<any[]>([]);

  // Real stats derived from actual received bookings
  const receivedBookingsCount = receivedBookings.length;
  const receivedRevenue = receivedBookings.reduce((sum: number, b: any) => sum + Number(b.totalPrice || 0), 0);
  const today = new Date().toDateString();
  const todayCheckIns = receivedBookings.filter((b: any) => b.startDate && new Date(b.startDate).toDateString() === today);
  const nextCheckIn = receivedBookings
    .filter((b: any) => b.startDate && new Date(b.startDate) >= new Date())
    .sort((a: any, z: any) => new Date(a.startDate).getTime() - new Date(z.startDate).getTime())[0];

  const [activeTab, setActiveTab] = useState("overview");

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
      if (user.role === 'admin') {
        fetchAdminStats();
        fetchModerationQueue();
      }
    }
  }, [user, token, fetchOwnerProperties, fetchBookings, fetchReceivedBookings, fetchAdminStats, fetchModerationQueue]);

  if (isLoading || !user) {
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

  const handleResolveReport = (id: number) => {
    setReportedListings(prev => prev.filter(item => item !== id));
    toast({
      title: "Report Resolved",
      description: `Action taken on listing #${id}.`,
    });
  };

  const handleVerifyUser = (name: string) => {
    setPendingUsers(prev => prev.filter(u => u !== name));
    setUsersCount(prev => prev + 1); // "Real" update
    toast({
      title: "User Verified",
      description: `${name} verified. Total users updated.`,
    });
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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden w-full font-sans">
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
          </TabsTrigger>
          <TabsTrigger value="analytics" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            Analytics
          </TabsTrigger>
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="listings" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Listings
            </TabsTrigger>
          )}
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="reservations" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Reservations
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="all-properties" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Properties
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
            </TabsTrigger>
            <TabsTrigger value="analytics" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <BarChart3 className="w-5 h-5 mr-3" /> Analytics
            </TabsTrigger>
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="listings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <FileText className="w-5 h-5 mr-3" /> My Listings
                </TabsTrigger>
            )}
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="reservations" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Users className="w-5 h-5 mr-3" /> Reservations
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="all-properties" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Home className="w-5 h-5 mr-3" /> All Properties
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
                      {bookings.map((b: any) => (
                        <div key={b.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
                          {b.propertyImage && (
                            <img src={b.propertyImage} alt={b.propertyTitle || "Property"} className="h-20 w-20 object-cover rounded-md shrink-0" />
                          )}
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
                      ))}
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
                        {receivedBookingsCount === 0 ? 'No bookings yet' : `${receivedBookings.filter((b: any) => b.status === 'pending').length} pending`}
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
                        {receivedBookingsCount > 0 ? 'From confirmed bookings' : 'No revenue yet'}
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
                    <p className="text-sm text-gray-500">Manage your active listings</p>
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
                      {ownerProperties.map(p => (
                        <div key={p.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors group bg-white shadow-sm">
                          <img src={p.image} className="h-20 w-20 object-cover rounded-md" alt={p.title} />
                          <div className="flex-1 min-w-0">
                            <Link href={`/property/${p.id}`}>
                              <h4 className="font-semibold text-lg truncate hover:text-primary cursor-pointer">{p.title}</h4>
                            </Link>
                            <p className="text-sm text-muted-foreground truncate">{p.address}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant={p.status === 'inactive' ? 'secondary' : 'outline'} className={p.status === 'inactive' ? 'bg-gray-200' : ''}>
                                {p.status === 'inactive' ? 'Inactive' : 'Active'}
                              </Badge>
                              <Badge variant="secondary">{p.type}</Badge>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <div className="font-bold text-xl text-primary">${p.price.toLocaleString()}</div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant={p.status === 'inactive' ? 'default' : 'outline'} 
                                onClick={() => handleTogglePropertyStatus(p.id)}
                              >
                                {p.status === 'inactive' ? 'Activate' : 'Deactivate'}
                              </Button>
                              <Link href={p.type === 'bnb' ? `/add-bnb?edit=${p.id}` : `/add-listing?edit=${p.id}`}>
                                <Button size="sm" variant="outline" className="gap-2">Edit</Button>
                              </Link>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                className="gap-2"
                                onClick={() => handleDeleteProperty(p.id)}
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
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
                        {receivedBookings.map((b: any) => (
                          <div key={b.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
                            {b.propertyImage && (
                              <img src={b.propertyImage} alt={b.propertyTitle || "Property"} className="h-20 w-20 object-cover rounded-md shrink-0" />
                            )}
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
                    <div className="text-2xl font-bold">15</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-sm font-medium text-muted-foreground">Messages</p>
                       <MessageSquare className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-muted-foreground">2 unread</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-sm font-medium text-muted-foreground">{user.role === 'guest' ? 'Upcoming Trips' : 'Scheduled Visits'}</p>
                       <Clock className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold">2</div>
                    <p className="text-xs text-muted-foreground">Upcoming this week</p>
                  </CardContent>
                </Card>
              </div>

              <h2 className="text-xl font-bold mt-8 mb-4">Saved Properties</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {PROPERTIES.slice(1,4).map(p => (
                    <div key={p.id} className="border rounded-lg overflow-hidden bg-white flex flex-col shadow-sm hover:shadow-md transition-shadow">
                       <div className="h-48 bg-gray-200 relative group cursor-pointer">
                         <Link href={`/property/${p.id}`}>
                           <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         </Link>
                         <Badge className="absolute top-2 left-2 bg-white/90 text-black hover:bg-white">{p.type}</Badge>
                       </div>
                       <div className="p-4 flex-1 flex flex-col">
                         <h3 className="font-bold truncate text-lg">{p.title}</h3>
                         <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                           <Clock className="h-3 w-3" /> Added 2 days ago
                         </p>
                         <div className="mt-auto flex justify-between items-center pt-4 border-t">
                           <span className="font-bold text-xl text-primary">${p.price.toLocaleString()}</span>
                           <Button size="sm" variant="outline">Contact Owner</Button>
                         </div>
                       </div>
                    </div>
                  ))}
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
                             <div className="flex gap-2">
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
                                       <div className="flex gap-2">
                                         <Badge>{item.type}</Badge>
                                         <Badge variant="outline" className="text-primary font-bold">
                                            KES {item.price?.toLocaleString() || 0}
                                         </Badge>
                                       </div>
                                       <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                                         <div>
                                            <span className="text-muted-foreground block mb-1">Submitted By</span>
                                            <span className="font-medium flex items-center gap-2">
                                              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                                                {item.ownerName?.charAt(0) || 'U'}
                                              </div>
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
                                          <p className="text-sm">A beautiful {item.type} property located in a prime area, offering great amenities and convenience. Currently pending review by the admin team.</p>
                                       </div>
                                     </div>
                                   </div>
                                   <DialogFooter className="mt-6 flex justify-end gap-2 border-t pt-4">
                                      <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={() => handleReject(item.id)}>
                                         <X className="h-4 w-4 mr-2" /> Reject Listing
                                      </Button>
                                      <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(item.id)}>
                                         <Check className="h-4 w-4 mr-2" /> Approve & Publish
                                      </Button>
                                   </DialogFooter>
                                 </DialogContent>
                               </Dialog>
                               <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(item.id)}>
                                 <X className="h-4 w-4 mr-1" /> Reject
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
                  <div className="space-y-4">
                    {PROPERTIES.map(p => {
                      const isDeactivated = deactivatedProperties.includes(p.id);
                      return (
                      <div key={p.id} className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg transition-colors group shadow-sm ${isDeactivated ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50 bg-white'}`}>
                        <img src={p.image} className={`h-20 w-20 object-cover rounded-md ${isDeactivated ? 'grayscale' : ''}`} alt={p.title} />
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex justify-between items-start">
                             <div>
                                <Link href={`/property/${p.id}`}>
                                  <h4 className="font-semibold text-lg truncate hover:text-primary cursor-pointer">{p.title}</h4>
                                </Link>
                                <p className="text-sm text-muted-foreground truncate">{p.address}</p>
                             </div>
                             <div className="font-bold text-xl text-primary">${p.price.toLocaleString()}</div>
                          </div>
                          
                          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                            <div className="flex gap-2">
                              <Badge variant="outline" className={isDeactivated ? "bg-gray-100 text-gray-600 border-gray-200" : "bg-green-50 text-green-700 border-green-200"}>
                                {isDeactivated ? 'Deactivated' : 'Active'}
                              </Badge>
                              <Badge variant="secondary">{p.type}</Badge>
                              <span className="text-xs text-muted-foreground flex items-center ml-2 border-l pl-2">ID: {p.id.slice(0, 8)}</span>
                            </div>
                            
                            <div className="flex gap-2 items-center">
                              <div className="flex items-center gap-4 mr-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /> {Math.floor(Math.random() * 20) + 1}</span>
                                <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" /> {Math.floor(Math.random() * 50) + 5}</span>
                              </div>
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
                                           {p.type === 'rent' || p.type === 'bnb' ? '$' : '$'}{p.price?.toLocaleString() || 0}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                                        {p.specs && (
                                          <>
                                            <div>
                                               <span className="text-muted-foreground block mb-1">Specs</span>
                                               <span className="font-medium">{p.specs.beds} Beds • {p.specs.baths} Baths</span>
                                            </div>
                                            <div>
                                               <span className="text-muted-foreground block mb-1">Size</span>
                                               <span className="font-medium">{p.specs.sqft} sqft</span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      <div className="border-t pt-4">
                                         <span className="text-muted-foreground block text-sm mb-2">Description</span>
                                         <p className="text-sm">A beautiful {p.type} property located in a prime area, offering great amenities and convenience.</p>
                                      </div>
                                    </div>
                                  </div>
                                  <DialogFooter className="mt-6 flex justify-end gap-2 border-t pt-4">
                                     <Button variant="outline" className="text-blue-600 hover:bg-zinc-800 hover:text-blue-700 border-blue-200" onClick={() => {
                                       toast({ title: "Edit Mode", description: "Opening property editor...", variant: "default" })
                                     }}>
                                        <Edit className="h-4 w-4 mr-2" /> Edit Property
                                     </Button>
                                     <Button variant="outline" className={isDeactivated ? "text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200" : "text-orange-600 hover:bg-orange-50 hover:text-orange-700 border-orange-200"} onClick={() => {
                                       if (isDeactivated) {
                                         setDeactivatedProperties(prev => prev.filter(id => id !== p.id));
                                         toast({ title: "Property Activated", description: "This listing is now live.", variant: "default" })
                                       } else {
                                         setDeactivatedProperties(prev => [...prev, p.id]);
                                         toast({ title: "Property Deactivated", description: "This listing has been taken offline.", variant: "default" })
                                       }
                                     }}>
                                        {isDeactivated ? <Check className="h-4 w-4 mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />} 
                                        {isDeactivated ? 'Activate' : 'Deactivate'}
                                     </Button>
                                     <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={() => {
                                       toast({ title: "Property Deleted", description: "Listing permanently removed.", variant: "destructive" })
                                     }}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Completely
                                     </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700 hover:bg-zinc-800" onClick={() => {
                                toast({ title: "Edit Mode", description: "Opening property editor...", variant: "default" })
                              }}>
                                <Edit className="h-4 w-4 mr-1" /> Edit
                              </Button>

                              <Button size="sm" variant="outline" className={isDeactivated ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-orange-600 hover:text-orange-700 hover:bg-orange-50"} onClick={() => {
                                if (isDeactivated) {
                                  setDeactivatedProperties(prev => prev.filter(id => id !== p.id));
                                  toast({ title: "Property Activated", description: "This listing is now live.", variant: "default" })
                                } else {
                                  setDeactivatedProperties(prev => [...prev, p.id]);
                                  toast({ title: "Property Deactivated", description: "This listing has been taken offline.", variant: "default" })
                                }
                              }}>
                                {isDeactivated ? <Check className="h-4 w-4 mr-1" /> : <AlertTriangle className="h-4 w-4 mr-1" />} 
                                {isDeactivated ? 'Activate' : 'Deactivate'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                className="gap-2"
                                onClick={() => {
                                  toast({ title: "Property Deleted", description: "Listing permanently removed.", variant: "destructive" })
                                }}
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
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
        </div>
      </div>
    </Tabs>
  );
}
