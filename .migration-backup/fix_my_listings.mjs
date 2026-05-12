import fs from 'fs';

const pathDashboard = 'client/src/pages/Dashboard.tsx';
let dashboardContent = fs.readFileSync(pathDashboard, 'utf8');

const oldListingsTab = `<TabsContent value="listings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>My Properties</CardTitle>
                    <CardDescription>Manage your active listings</CardDescription>
                  </CardHeader>`;

const newListingsTab = `<TabsContent value="listings" className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">My Properties</h2>
                    <p className="text-sm text-gray-500">Manage your active listings</p>
                  </div>
                  <Link href="/add-listing">
                    <Button className="bg-[#2E5C8A] hover:bg-[#234A72] text-white gap-2 shadow-sm rounded-full px-4 h-10">
                      <Plus className="h-4 w-4" />
                      List Property
                    </Button>
                  </Link>
                </div>
                <Card>
                  <CardHeader className="hidden">
                    <CardTitle>My Properties</CardTitle>
                    <CardDescription>Manage your active listings</CardDescription>
                  </CardHeader>`;

if (dashboardContent.includes(oldListingsTab)) {
    dashboardContent = dashboardContent.replace(oldListingsTab, newListingsTab);
    fs.writeFileSync(pathDashboard, dashboardContent);
    console.log("Successfully added List Property button to My Listings tab.");
} else {
    console.log("Could not find My Listings tab header.");
}
