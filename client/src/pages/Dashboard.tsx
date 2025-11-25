import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, MessageSquare, Calendar, BarChart3, Heart, Clock, Plus, Users, FileText, AlertTriangle, DollarSign, Check, X, ExternalLink, Trash2, ArrowUpRight, ArrowDownRight, ShieldCheck } from "lucide-react";
import { PROPERTIES } from "@/lib/mockData";
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
  const [moderationQueue, setModerationQueue] = useState([1, 2, 3]);
  const [reportedListings, setReportedListings] = useState([101, 102, 103]);
  const [usersCount, setUsersCount] = useState(2340);
  const [revenue, setRevenue] = useState(45200);
  const [pendingUsers, setPendingUsers] = useState(["Alice Cooper", "Bob Vance", "Charlie Day"]);

  // Owner State
  const [ownerProperties, setOwnerProperties] = useState(PROPERTIES.slice(0, 3));
  const [activeInquiries, setActiveInquiries] = useState(24);
  const [visits, setVisits] = useState(8);
  const [ownerRevenue, setOwnerRevenue] = useState(12450);

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
    setModerationQueue(prev => prev.filter(item => item !== id));
    toast({
      title: "Listing Approved",
      description: `Property #${id} is now live.`,
      className: "bg-green-50 border-green-200 text-green-800",
    });
  };

  const handleReject = (id: number) => {
    setModerationQueue(prev => prev.filter(item => item !== id));
    toast({
      title: "Listing Rejected",
      description: `Property #${id} has been removed from queue.`,
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
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-8 w-full justify-start bg-white p-1 border rounded-lg h-auto overflow-x-auto">
            <TabsTrigger value="overview" className="px-6 py-2">Overview</TabsTrigger>
            <TabsTrigger value="messages" className="px-6 py-2">Messages</TabsTrigger>
            {user.role === 'owner' && <TabsTrigger value="listings" className="px-6 py-2">My Listings</TabsTrigger>}
            {user.role === 'admin' && <TabsTrigger value="users" className="px-6 py-2">User Management</TabsTrigger>}
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

          {/* OWNER DASHBOARD */}
          {user.role === 'owner' && (
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
                        <p className="text-sm font-medium text-muted-foreground">Inquiries</p>
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
                        <p className="text-sm font-medium text-muted-foreground">Visits</p>
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
                               <p className="text-sm font-medium">John Doe viewed "Downtown Apt"</p>
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
                      {ownerProperties.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                          <Home className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-medium text-gray-900">No properties listed</h3>
                          <p className="mb-4">Get started by adding your first property.</p>
                          <Link href="/add-listing">
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

          {/* TENANT DASHBOARD */}
          {user.role === 'tenant' && (
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
                       <p className="text-sm font-medium text-muted-foreground">Scheduled Visits</p>
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
                <Card className="bg-white border-l-4 border-l-yellow-500 shadow-sm cursor-pointer hover:bg-yellow-50/10 transition-colors">
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
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <ArrowUpRight className="h-3 w-3 mr-1" /> +12 this week
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-red-500 shadow-sm cursor-pointer hover:bg-red-50/10 transition-colors">
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
                         moderationQueue.map(i => (
                           <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                             <div className="flex items-center gap-4">
                               <div className="h-12 w-12 bg-gray-200 rounded-md overflow-hidden">
                                  <img src={`/images/modern_apartment_exterior.png`} className="h-full w-full object-cover" />
                               </div>
                               <div>
                                 <p className="font-bold text-sm">Sunny Vale Apt #{i}</p>
                                 <p className="text-xs text-muted-foreground">Submitted by Agent Smith • 2h ago</p>
                               </div>
                             </div>
                             <div className="flex gap-2">
                               <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(i)}>
                                 <X className="h-4 w-4 mr-1" /> Reject
                               </Button>
                               <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(i)}>
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
        </Tabs>
      </div>
    </div>
  );
}
