import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, MessageSquare, Calendar, BarChart3, Settings, Heart, Clock, Plus } from "lucide-react";
import { PROPERTIES } from "@/lib/mockData";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold font-heading">Dashboard</h1>
          <Button className="bg-primary"><Plus className="mr-2 h-4 w-4" /> Add New Listing</Button>
        </div>

        <Tabs defaultValue="owner" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
            <TabsTrigger value="owner">Owner View</TabsTrigger>
            <TabsTrigger value="tenant">Tenant View</TabsTrigger>
          </TabsList>

          {/* OWNER DASHBOARD */}
          <TabsContent value="owner" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">+2 from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Inquiries</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">+10% from last week</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Scheduled Visits</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground">Next visit today at 2 PM</p>
                </CardContent>
              </Card>
              <Card>
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
                    {PROPERTIES.slice(0,3).map(p => (
                      <div key={p.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <img src={p.image} className="h-16 w-16 object-cover rounded-md" alt={p.title} />
                        <div className="flex-1">
                          <h4 className="font-semibold">{p.title}</h4>
                          <p className="text-sm text-muted-foreground">{p.address}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">${p.price}</div>
                          <div className="text-xs capitalize bg-gray-100 px-2 py-1 rounded mt-1 inline-block">{p.type}</div>
                        </div>
                      </div>
                    ))}
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
                       <div key={i} className="flex gap-3 items-start">
                         <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                           JD
                         </div>
                         <div>
                           <p className="text-sm font-medium">John Doe <span className="text-xs text-muted-foreground font-normal">interested in</span> Downtown Apt</p>
                           <p className="text-xs text-muted-foreground mt-1">"Is this property still available for viewing this weekend?"</p>
                         </div>
                       </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TENANT DASHBOARD */}
          <TabsContent value="tenant" className="space-y-6">
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
                  <div key={p.id} className="border rounded-lg overflow-hidden bg-white">
                     <div className="h-40 bg-gray-200 relative">
                       <img src={p.image} className="w-full h-full object-cover" />
                     </div>
                     <div className="p-4">
                       <h3 className="font-bold">{p.title}</h3>
                       <p className="text-sm text-gray-500 mb-2">{p.address}</p>
                       <div className="flex justify-between items-center">
                         <span className="font-bold text-primary">${p.price}</span>
                         <Button size="sm" variant="outline">Contact</Button>
                       </div>
                     </div>
                  </div>
                ))}
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
