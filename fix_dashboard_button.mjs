import fs from 'fs';

// 3. Update Dashboard.tsx
// The user wants to see the functionality to add space/list property as it was before on the dashboard when logged in as host.
// Looking at the dashboard image, there was a button on the top right maybe? Or inside the "My Listings" section.
// Let's add a "List Property" button to the Dashboard header.
const pathDashboard = 'client/src/pages/Dashboard.tsx';
let dashboardContent = fs.readFileSync(pathDashboard, 'utf8');

// The Dashboard header is probably around here:
// <div className="flex justify-between items-center mb-8">
//   <div>
//     <h1 className="text-3xl font-bold font-heading text-gray-900 tracking-tight">Dashboard</h1>
//     <p className="text-muted-foreground mt-1">Welcome back, {user.name.split(' ')[0]}!</p>
//   </div>
//   ...
// </div>
// Wait, looking at Dashboard.tsx from the cat -n, it's actually:
// <Navbar />
// <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
// Let's search for "Welcome back"

const headerSearch = /Welcome back, (\{user.name.split\(' '\)\[0\]\}|[\w\s]+)!/;
if (headerSearch.test(dashboardContent)) {
    console.log("Found Welcome back in dashboard.");
}

// Let's just find the main dashboard header and add a button.
const oldHeader = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold font-heading text-gray-900 tracking-tight">Welcome back, {user.name.split(' ')[0]}!</h1>
              <p className="text-muted-foreground mt-1">Here's your ${"{"}user.role${"}"} overview</p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">`;

const newHeader = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold font-heading text-gray-900 tracking-tight">Welcome back, {user.name.split(' ')[0]}!</h1>
              <p className="text-muted-foreground mt-1">Here's your ${"{"}user.role${"}"} overview</p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {(user?.role === 'owner' || user?.role === 'host') && (
                <Link href="/add-listing">
                  <Button className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm whitespace-nowrap">
                    <Plus className="h-4 w-4" />
                    List Property
                  </Button>
                </Link>
              )}`;

if (dashboardContent.includes(oldHeader)) {
    dashboardContent = dashboardContent.replace(oldHeader, newHeader);
    fs.writeFileSync(pathDashboard, dashboardContent);
    console.log("Added List Property button to dashboard header.");
} else {
    // Maybe the structure is different. Let's try another replacement pattern.
    const altOldHeader = `<div>
              <h1 className="text-3xl font-bold font-heading text-gray-900 tracking-tight">Welcome back, {user.name.split(' ')[0]}!</h1>
              <p className="text-muted-foreground mt-1">Here's your {user.role} overview</p>
            </div>`;
            
    const altNewHeader = `<div>
              <h1 className="text-3xl font-bold font-heading text-gray-900 tracking-tight">Welcome back, {user.name.split(' ')[0]}!</h1>
              <p className="text-muted-foreground mt-1">Here's your {user.role} overview</p>
            </div>
            
            <div className="hidden sm:flex ml-auto items-center gap-3">
              {(user?.role === 'owner' || user?.role === 'host') && (
                <Link href="/add-listing">
                  <Button className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm whitespace-nowrap">
                    <Plus className="h-4 w-4" />
                    List Property
                  </Button>
                </Link>
              )}
            </div>`;
            
    if (dashboardContent.includes(altOldHeader)) {
        dashboardContent = dashboardContent.replace(altOldHeader, altNewHeader);
        fs.writeFileSync(pathDashboard, dashboardContent);
        console.log("Added List Property button to dashboard header (alt method).");
    } else {
        console.log("Could not find dashboard header to inject button.");
    }
}
