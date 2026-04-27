import fs from 'fs';

const pathDashboard = 'client/src/pages/Dashboard.tsx';
let dashboardContent = fs.readFileSync(pathDashboard, 'utf8');

const oldString = `            {activeTab === 'overview' && (
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back, {user.name.split(' ')[0]}!</h1>
                <p className="text-gray-500 text-sm">Here's your {user.role} overview</p>
              </div>
            )}`;

const newString = `            {activeTab === 'overview' && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back, {user.name.split(' ')[0]}!</h1>
                  <p className="text-gray-500 text-sm">Here's your {user.role} overview</p>
                </div>
                {(user?.role === 'owner' || user?.role === 'host') && (
                  <Link href="/add-listing">
                    <Button className="bg-[#2E5C8A] hover:bg-[#234A72] text-white gap-2 shadow-sm rounded-full px-5 h-10">
                      <Plus className="h-4 w-4" />
                      List Property
                    </Button>
                  </Link>
                )}
              </div>
            )}`;

if (dashboardContent.includes(oldString)) {
    dashboardContent = dashboardContent.replace(oldString, newString);
    fs.writeFileSync(pathDashboard, dashboardContent);
    console.log("Successfully added List Property button to dashboard overview.");
} else {
    console.log("Could not find the exact string to replace.");
}

// Add another button inside the "My Listings" tab if it exists
const oldMyListingsHeader = `          <TabsContent value="listings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Properties</CardTitle>
                <CardDescription>Manage your active listings</CardDescription>
              </CardHeader>`;

const newMyListingsHeader = `          <TabsContent value="listings" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">My Properties</h2>
                <p className="text-sm text-gray-500">Manage your active listings</p>
              </div>
              <Link href="/add-listing">
                <Button className="bg-[#2E5C8A] hover:bg-[#234A72] text-white gap-2 shadow-sm rounded-full px-4">
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

if (dashboardContent.includes(oldMyListingsHeader)) {
    dashboardContent = dashboardContent.replace(oldMyListingsHeader, newMyListingsHeader);
    fs.writeFileSync(pathDashboard, dashboardContent);
    console.log("Successfully added List Property button to My Listings tab.");
}
