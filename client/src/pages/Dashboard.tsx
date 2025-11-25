import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, MessageSquare, Calendar, BarChart3, Heart, Clock, Plus, Users, FileText, AlertTriangle, DollarSign, Check, X, ExternalLink, Trash2 } from "lucide-react";
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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  // State for interactions
  const [moderationQueue, setModerationQueue] = useState([1, 2, 3]);
  const [pendingUsers, setPendingUsers] = useState(["Alice Cooper", "Bob Vance", "Charlie Day"]);
  const [ownerProperties, setOwnerProperties] = useState(PROPERTIES.slice(0, 3));

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
      description: `Property #${id} has been approved and is now live.`,
      className: "bg-green-50 border-green-200 text-green-800",
    });
  };

  const handleReject = (id: number) => {
    setModerationQueue(prev => prev.filter(item => item !== id));
    toast({
      title: "Listing Rejected",
      description: `Property #${id} has been rejected.`,
      variant: "destructive",
    });
  };

  const handleVerifyUser = (name: string) => {
    setPendingUsers(prev => prev.filter(u => u !== name));
    toast({
      title: "User Verified",
      description: `${name} has been successfully verified (KYC).`,
    });
  };

  const handleDeleteProperty = (id: string) => {
    setOwnerProperties(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Property Removed",
      description: "The listing has been removed from your portfolio.",
    });
  };

  const handleReply = (name: string) => {
    toast({
      title: "Message Sent",
      description: `Reply sent to ${name}.`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-heading">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.name}
            </p>
          </div>
          {user.role === 'owner' && (
            <Link href="/add-listing">
              <Button className="bg-primary"><Plus className="mr-2 h-4 w-4" /> Add New Listing</Button>
            </Link>
          )}
        </div>

        {/* OWNER DASHBOARD */}
        {user.role === 'owner' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ownerProperties.length}</div>
                  <p className="text-xs text-muted-foreground">Active on platform</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Inquiries</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">+10% from last week</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Scheduled Visits</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground">Next visit today at 2 PM</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$12,450</div>
                  <p className="text-xs text-muted-foreground">+18% from last month</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>My Properties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ownerProperties.map(p => (
                      <div key={p.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors group">
                        <img src={p.image} className="h-16 w-16 object-cover rounded-md" alt={p.title} />
                        <div className="flex-1 min-w-0">
                          <Link href={`/property/${p.id}`}>
                            <h4 className="font-semibold truncate hover:text-primary cursor-pointer">{p.title}</h4>
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">{p.address}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className="font-bold text-primary">${p.price}</div>
                          <div className="flex gap-2">
                            <Link href={`/property/${p.id}`}>
                               <Button size="icon" variant="ghost" className="h-8 w-8"><ExternalLink className="h-4 w-4" /></Button>
                            </Link>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteProperty(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {ownerProperties.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No properties listed yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Inquiries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1,2,3].map(i => (
                       <div key={i} className="flex gap-3 items-start p-2 hover:bg-gray-50 rounded transition-colors">
                         <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                           JD
                         </div>
                         <div className="flex-1">
                           <p className="text-sm font-medium">John Doe <span className="text-xs text-muted-foreground font-normal">interested in</span> Downtown Apt</p>
                           <p className="text-xs text-muted-foreground mt-1">"Is this property still available for viewing?"</p>
                           <Dialog>
                             <DialogTrigger asChild>
                               <Button variant="link" className="h-auto p-0 text-xs mt-1">Reply</Button>
                             </DialogTrigger>
                             <DialogContent>
                               <DialogHeader>
                                 <DialogTitle>Reply to John Doe</DialogTitle>
                               </DialogHeader>
                               <div className="space-y-4 py-4">
                                 <div className="space-y-2">
                                   <Label>Message</Label>
                                   <Textarea placeholder="Type your reply here..." />
                                 </div>
                               </div>
                               <DialogFooter>
                                 <Button onClick={() => handleReply("John Doe")}>Send Reply</Button>
                               </DialogFooter>
                             </DialogContent>
                           </Dialog>
                         </div>
                       </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TENANT DASHBOARD */}
        {user.role === 'tenant' && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Favorites</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">15</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">2 unread</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Visits</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2</div>
                  <p className="text-xs text-muted-foreground">Upcoming this week</p>
                </CardContent>
              </Card>
            </div>

            <h2 className="text-xl font-bold mt-8 mb-4">Saved Properties</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PROPERTIES.slice(1,4).map(p => (
                  <div key={p.id} className="border rounded-lg overflow-hidden bg-white flex flex-col">
                     <div className="h-40 bg-gray-200 relative group cursor-pointer">
                       <Link href={`/property/${p.id}`}>
                         <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                       </Link>
                     </div>
                     <div className="p-4 flex-1 flex flex-col">
                       <h3 className="font-bold truncate">{p.title}</h3>
                       <p className="text-sm text-gray-500 mb-2">{p.address}</p>
                       <div className="mt-auto flex justify-between items-center pt-4">
                         <span className="font-bold text-primary">${p.price}</span>
                         <Dialog>
                           <DialogTrigger asChild>
                             <Button size="sm" variant="outline">Contact</Button>
                           </DialogTrigger>
                           <DialogContent>
                             <DialogHeader>
                               <DialogTitle>Contact Owner</DialogTitle>
                               <CardDescription>Inquire about {p.title}</CardDescription>
                             </DialogHeader>
                             <div className="space-y-4 py-4">
                               <div className="space-y-2">
                                 <Label>Your Message</Label>
                                 <Textarea placeholder="I'm interested in this property..." />
                               </div>
                             </div>
                             <DialogFooter>
                               <Button onClick={() => {
                                 toast({ title: "Message Sent", description: "The owner will contact you shortly." });
                               }}>Send Message</Button>
                             </DialogFooter>
                           </DialogContent>
                         </Dialog>
                       </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* ADMIN DASHBOARD */}
        {user.role === 'admin' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                  <FileText className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{moderationQueue.length}</div>
                  <p className="text-xs text-muted-foreground">Properties awaiting verification</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,340</div>
                  <p className="text-xs text-muted-foreground">+120 this week</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reported Listings</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">Action required</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$45,200</div>
                  <p className="text-xs text-muted-foreground">Subscription fees</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                   <CardTitle>Moderation Queue</CardTitle>
                   <CardDescription>Validate new property listings</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                     {moderationQueue.length > 0 ? (
                       moderationQueue.map(i => (
                         <div key={i} className="flex items-center justify-between p-3 border rounded bg-white">
                           <div className="flex items-center gap-3">
                             <div className="h-10 w-10 bg-gray-200 rounded overflow-hidden">
                                <img src={`/images/modern_apartment_exterior.png`} className="h-full w-full object-cover" />
                             </div>
                             <div>
                               <p className="font-medium text-sm">Sunny Vale Apt #{i}</p>
                               <p className="text-xs text-muted-foreground">Submitted by Agent Smith</p>
                             </div>
                           </div>
                           <div className="flex gap-2">
                             <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 h-8 w-8 p-0" onClick={() => handleReject(i)}>
                               <X className="h-4 w-4" />
                             </Button>
                             <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 p-0" onClick={() => handleApprove(i)}>
                               <Check className="h-4 w-4" />
                             </Button>
                           </div>
                         </div>
                       ))
                     ) : (
                       <div className="text-center py-8 text-muted-foreground text-sm">
                         All caught up! No properties to review.
                       </div>
                     )}
                   </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                   <CardTitle>Recent User Signups</CardTitle>
                   <CardDescription>Verify user identities (KYC)</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                     {pendingUsers.length > 0 ? (
                       pendingUsers.map((name, i) => (
                         <div key={i} className="flex items-center justify-between p-3 border-b last:border-0">
                           <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                               {name.charAt(0)}
                             </div>
                             <div>
                               <p className="font-medium text-sm">{name}</p>
                               <p className="text-xs text-muted-foreground">{i % 2 === 0 ? "Tenant" : "Landlord"}</p>
                             </div>
                           </div>
                           <Button size="sm" variant="outline" onClick={() => handleVerifyUser(name)}>
                             Verify
                           </Button>
                         </div>
                       ))
                     ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No pending user verifications.
                        </div>
                     )}
                   </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
