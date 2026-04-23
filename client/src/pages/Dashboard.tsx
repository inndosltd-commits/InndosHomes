import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, MessageSquare, Calendar, BarChart3, Heart, Clock, Plus, Users, FileText, AlertTriangle, DollarSign, Check, X, ExternalLink, Trash2, ArrowUpRight, ArrowDownRight, ShieldCheck, Eye } from "lucide-react";
import { PROPERTIES, OWNERS, TENANTS, ADMINS, HOSTS, GUESTS } from "@/lib/mockData";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
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
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  // --- REAL-TIME STATE ---
  // Admin State
  const [moderationQueue, setModerationQueue] = useState<any[]>(() => {
    const saved = localStorage.getItem('pendingListings');
    if (saved) return JSON.parse(saved);
    return []; // Start empty unless there are actual pending listings from local storage
  });
  const [reportedListings, setReportedListings] = useState<number[]>([]);
  // Initialize with real count from mock data
  const [usersCount, setUsersCount] = useState(() => {
    return OWNERS.length + TENANTS.length + ADMINS.length + HOSTS.length + GUESTS.length;
  });
  const [revenue, setRevenue] = useState(() => {
    // Calculate realistic platform revenue from existing mock properties
    let totalRevenue = 0;
    PROPERTIES.forEach(p => {
        if (p.type === 'rent') totalRevenue += p.price * 0.05; // 5% commission on rent
        if (p.type === 'bnb') totalRevenue += (p.price * 10) * 0.10; // 10% commission on ~10 days booking
    });
    return totalRevenue;
  }); 
  const [pendingUsers, setPendingUsers] = useState(
    [...OWNERS, ...TENANTS, ...HOSTS, ...GUESTS].filter(u => u.status === 'pending').map(u => u.name)
  );

  // Owner State
  // Filter properties for the current logged-in owner
  const [ownerProperties, setOwnerProperties] = useState(() => {
    if (user?.role === 'owner' || user?.role === 'host') {
      // Get approved properties from mock data
      const baseProperties = PROPERTIES.filter(p => p.ownerId === user.id);
      
      // Get newly approved properties from local storage
      const activeStr = localStorage.getItem('activeListings');
      const activeProperties = activeStr ? JSON.parse(activeStr).filter((p: any) => p.ownerId === user.id) : [];
      
      return [...activeProperties, ...baseProperties];
    }
    return [];
  });

  // Get pending properties for this owner
  const [pendingProperties, setPendingProperties] = useState(() => {
    if (user?.role === 'owner' || user?.role === 'host') {
      const saved = localStorage.getItem('pendingListings');
      if (saved) {
        const queue = JSON.parse(saved);
        // We match by owner ID or name (since our mock queue used 'submittedBy' name initially)
        return queue.filter((p: any) => p.ownerId === user.id || p.submittedBy === user.name);
      }
    }
    return [];
  });

  // Calculate dynamic stats based on real properties
  const calculateStats = () => {
    if (ownerProperties.length === 0) return { inquiries: 0, visits: 0, revenue: 0 };
    
    // Calculate inquiries/bookings based on property count
    const inquiries = ownerProperties.length * 4 + 2; 
    const visits = Math.max(1, Math.floor(ownerProperties.length * 1.5));
    
    // Calculate revenue
    let revenue = 0;
    ownerProperties.forEach(p => {
        if (p.type === 'rent') revenue += p.price; // Monthly rent
        if (p.type === 'bnb') revenue += p.price * 12; // ~12 days occupancy avg
        // For sales, we don't count it as monthly revenue, maybe just active listing value? 
        // Let's stick to rental/bnb income for "Revenue" metric
    });
    
    return { inquiries, visits, revenue };
  };

  const stats = calculateStats();

  const [activeInquiries, setActiveInquiries] = useState(stats.inquiries);
  const [visits, setVisits] = useState(stats.visits);
  const [ownerRevenue, setOwnerRevenue] = useState(stats.revenue);

  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) {
    return null;
  }

  // Handlers for interactions
  const handleApprove = (id: number) => {
    // 1. Remove from pending queue
    const updatedQueue = moderationQueue.filter(item => item.id !== id);
    setModerationQueue(updatedQueue);
    localStorage.setItem('pendingListings', JSON.stringify(updatedQueue));
    
    // 2. Add to active properties list
    const approvedProperty = moderationQueue.find(item => item.id === id);
    if (approvedProperty) {
      const activePropertiesStr = localStorage.getItem('activeListings');
      const activeProperties = activePropertiesStr ? JSON.parse(activePropertiesStr) : [];
      
      const newActiveProperty = {
        id: `m_${approvedProperty.id}`, // Generate a string ID for the mock data system
        ownerId: "o1", // Mock owner
        title: approvedProperty.title,
        type: approvedProperty.type.toLowerCase() === 'b&b' ? 'bnb' : 'rent', // Map type
        price: 50000, // Mock price for newly approved
        address: "Newly Approved Location",
        specs: { beds: 2, baths: 1, sqft: 1000 },
        image: approvedProperty.image,
        isVerified: true,
        tags: ["New"],
        location: { lat: -1.292, lng: 36.821 }
      };
      
      localStorage.setItem('activeListings', JSON.stringify([newActiveProperty, ...activeProperties]));
      
      // Update owner's active properties in dashboard view if they are the owner
      if (user?.role === 'owner' || user?.role === 'host') {
        setOwnerProperties(prev => [newActiveProperty as any, ...prev]);
      }
    }
    
    toast({
      title: "Listing Approved",
      description: `Property is now live on the platform.`,
      className: "bg-green-50 border-green-200 text-green-800",
    });
  };

  const handleReject = (id: number) => {
    const updatedQueue = moderationQueue.filter(item => item.id !== id);
    setModerationQueue(updatedQueue);
    localStorage.setItem('pendingListings', JSON.stringify(updatedQueue));

    toast({
      title: "Listing Rejected",
      description: `Property has been removed from queue.`,
      variant: "destructive",
    });
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

  const handleDeleteProperty = (id: string) => {
    setOwnerProperties(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Property Removed",
      description: "Listing deleted successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, <span className="font-semibold text-primary">{user.name}</span>
            </p>
          </div>
          <div className="flex gap-3">
             {user.role === 'owner' && (
              <Link href="/add-listing">
                <Button className="bg-primary shadow-lg hover:shadow-xl transition-all"><Plus className="mr-2 h-4 w-4" /> Add New Listing</Button>
              </Link>
            )}
            {user.role === 'host' && (
              <Link href="/add-bnb">
                <Button className="bg-primary shadow-lg hover:shadow-xl transition-all"><Plus className="mr-2 h-4 w-4" /> List a Space</Button>
              </Link>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8 w-full justify-start bg-white p-1 border rounded-lg h-auto overflow-x-auto">
            <TabsTrigger value="overview" className="px-6 py-2">Overview</TabsTrigger>
            <TabsTrigger value="messages" className="px-6 py-2">Messages</TabsTrigger>
            {(user.role === 'owner' || user.role === 'host') && <TabsTrigger value="listings" className="px-6 py-2">My Listings</TabsTrigger>}
            {user.role === 'admin' && <TabsTrigger value="users" className="px-6 py-2">User Management</TabsTrigger>}
            {user.role === 'admin' && <TabsTrigger value="all-properties" className="px-6 py-2">All Properties</TabsTrigger>}
            <TabsTrigger value="settings" className="px-6 py-2">Settings</TabsTrigger>
          </TabsList>

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
                        <p className="text-sm font-medium text-muted-foreground">{user.role === 'host' ? 'Bookings' : 'Inquiries'}</p>
                        <MessageSquare className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="text-2xl font-bold">{activeInquiries}</div>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-1" /> +12% this week
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-white border-l-4 border-l-orange-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">{user.role === 'host' ? 'Check-ins' : 'Visits'}</p>
                        <Calendar className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="text-2xl font-bold">{visits}</div>
                      <p className="text-xs text-muted-foreground mt-1">Next: Today 2 PM</p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-white border-l-4 border-l-green-500">
                     <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                        <DollarSign className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold">${ownerRevenue.toLocaleString()}</div>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-1" /> +8% vs last month
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
                      <div className="space-y-4">
                        {[1,2,3].map(i => (
                           <div key={i} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded transition-colors">
                             <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                               JD
                             </div>
                             <div className="flex-1">
                               <p className="text-sm font-medium">John Doe {user.role === 'host' ? 'booked' : 'viewed'} "Downtown Apt"</p>
                               <p className="text-xs text-muted-foreground">2 hours ago</p>
                             </div>
                           </div>
                        ))}
                      </div>
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
                <Card>
                  <CardHeader>
                    <CardTitle>My Properties</CardTitle>
                    <CardDescription>Manage your active listings</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                              <Badge variant="outline">Active</Badge>
                              <Badge variant="secondary">{p.type}</Badge>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <div className="font-bold text-xl text-primary">${p.price.toLocaleString()}</div>
                            <div className="flex gap-2">
                              <Link href={`/property/${p.id}`}>
                                 <Button size="sm" variant="outline" className="gap-2"><ExternalLink className="h-3 w-3" /> View</Button>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm cursor-pointer hover:bg-blue-50/10 transition-colors" onClick={() => setActiveTab("users")}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold">{usersCount.toLocaleString()}</div>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <ArrowUpRight className="h-3 w-3 mr-1" /> +12 this week
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-red-500 shadow-sm cursor-pointer hover:bg-red-50/10 transition-colors" onClick={() => setActiveTab("all-properties")}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Reported Listings</p>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="text-3xl font-bold">{reportedListings.length}</div>
                    <p className="text-xs text-red-600 mt-1">Action required</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-green-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Platform Revenue</p>
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold">${revenue.toLocaleString()}</div>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <ArrowUpRight className="h-3 w-3 mr-1" /> +8% growth
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                       {moderationQueue.length > 0 ? (
                         moderationQueue.map(item => (
                           <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                             <div className="flex items-center gap-4">
                               <div className="h-12 w-12 bg-gray-200 rounded-md overflow-hidden">
                                  <img src={item.image} className="h-full w-full object-cover" />
                               </div>
                               <div>
                                 <p className="font-bold text-sm">{item.title}</p>
                                 <p className="text-xs text-muted-foreground">Submitted by {item.submittedBy} • {item.time}</p>
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
                                            {item.type === 'rent' || item.type === 'bnb' ? '$' : '$'}{item.price?.toLocaleString() || 0}
                                         </Badge>
                                       </div>
                                       <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                                         <div>
                                            <span className="text-muted-foreground block mb-1">Submitted By</span>
                                            <span className="font-medium flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">{item.submittedBy?.charAt(0) || 'U'}</div> {item.submittedBy}</span>
                                         </div>
                                         <div>
                                            <span className="text-muted-foreground block mb-1">Time</span>
                                            <span className="font-medium">{item.time}</span>
                                         </div>
                                         {item.specs && (
                                           <>
                                             <div>
                                                <span className="text-muted-foreground block mb-1">Specs</span>
                                                <span className="font-medium">{item.specs.beds} Beds • {item.specs.baths} Baths</span>
                                             </div>
                                             <div>
                                                <span className="text-muted-foreground block mb-1">Size</span>
                                                <span className="font-medium">{item.specs.sqft} sqft</span>
                                             </div>
                                           </>
                                         )}
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

                <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                       <Users className="h-5 w-5 text-primary" />
                       User Verification (KYC)
                       <Badge variant="secondary" className="ml-2">{pendingUsers.length}</Badge>
                     </CardTitle>
                     <CardDescription>Verify new user identities</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       {pendingUsers.length > 0 ? (
                         pendingUsers.map((name, i) => (
                           <div key={i} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50 transition-colors">
                             <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shadow-sm">
                                 {name.charAt(0)}
                               </div>
                               <div>
                                 <p className="font-medium text-sm">{name}</p>
                                 <div className="flex gap-2 text-xs text-muted-foreground">
                                   <Badge variant="outline" className="text-[10px] h-5 px-1">{i % 2 === 0 ? "Tenant" : "Landlord"}</Badge>
                                   <span>• ID Uploaded</span>
                                 </div>
                               </div>
                             </div>
                             <div className="flex gap-2">
                               <Button size="sm" variant="outline">View ID</Button>
                               <Button size="sm" onClick={() => handleVerifyUser(name)}>
                                 Verify
                               </Button>
                             </div>
                           </div>
                         ))
                       ) : (
                          <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                             <p className="font-medium">No pending verifications.</p>
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
                    {PROPERTIES.map(p => (
                      <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors group bg-white shadow-sm">
                        <img src={p.image} className="h-20 w-20 object-cover rounded-md" alt={p.title} />
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
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                              <Badge variant="secondary">{p.type}</Badge>
                              <span className="text-xs text-muted-foreground flex items-center ml-2 border-l pl-2">ID: {p.id.slice(0, 8)}</span>
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
                                     <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={() => {
                                       toast({ title: "Property Terminated", description: "This listing has been taken offline.", variant: "destructive" })
                                     }}>
                                        <AlertTriangle className="h-4 w-4 mr-2" /> Terminate Listing
                                     </Button>
                                     <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={() => {
                                       toast({ title: "Property Deleted", description: "Listing permanently removed.", variant: "destructive" })
                                     }}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Completely
                                     </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              <Button size="sm" variant="outline" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => {
                                toast({ title: "Property Terminated", description: "This listing has been taken offline.", variant: "destructive" })
                              }}>
                                <AlertTriangle className="h-4 w-4 mr-1" /> Terminate
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
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* SETTINGS TAB (Shared) */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your profile and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue={user.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" defaultValue={user.email} readOnly className="bg-gray-50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" placeholder="Tell us a bit about yourself" />
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-4">Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-notif" className="flex flex-col gap-1">
                        <span>Email Notifications</span>
                        <span className="font-normal text-xs text-muted-foreground">Receive updates about your listings and messages</span>
                      </Label>
                      <Input type="checkbox" id="email-notif" className="h-4 w-4" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-notif" className="flex flex-col gap-1">
                        <span>Push Notifications</span>
                        <span className="font-normal text-xs text-muted-foreground">Receive real-time alerts in browser</span>
                      </Label>
                      <Input type="checkbox" id="push-notif" className="h-4 w-4" defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={() => toast({ title: "Settings Saved", description: "Your profile has been updated." })}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
