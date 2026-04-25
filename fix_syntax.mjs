import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// The issue is around line 240:
// 238 |       </div>
// 239 |       </div>
// 240 |       <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden bg-[#f8fafc]">
//
// These are adjacent JSX elements returned directly from the component without a fragment wrapper or a common parent.
// The `return (` originally had a parent `<div className="min-h-screen bg-gray-50">`
// Let's check how the return looks.

const match = content.match(/return\s*\(\s*<div className="min-h-screen bg-gray-50">/);
if (match) {
    console.log("Found return statement");
} else {
    console.log("Return statement not found as expected");
}

// I need to ensure the top-level div wraps both the header and the main content area.
// The previous replacement might have closed the top-level div early.
const oldHeader = `      <div className="bg-white border-b sticky top-16 z-10 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, <span className="font-semibold text-primary">{user.name}</span>!
          </p>
        </div>
        <div className="flex gap-3">
          {user.role === 'owner' && (
            <Link href="/add-listing">
              <Button className="bg-primary shadow-sm hover:shadow-md transition-all"><Plus className="mr-2 h-4 w-4" /> Add New Listing</Button>
            </Link>
          )}
          {user.role === 'host' && (
            <Link href="/add-bnb">
              <Button className="bg-primary shadow-sm hover:shadow-md transition-all"><Plus className="mr-2 h-4 w-4" /> List a Space</Button>
            </Link>
          )}
        </div>
      </div>`;

// Wait, the original had:
// return (
//   <div className="min-h-screen bg-gray-50">
//     <Navbar />
//     <div className="..."> ... </div>
//     <div className="container..."> ... </div>
//   </div>
// )

// But in my replace I matched `<div className="container mx-auto px-4 pt-8 pb-4 border-b bg-white mb-6">[\s\S]*?<\/div>\s*<\/div>`
// Which removed the two closing divs of that container.
// Then added `oldHeader` which is just `<div ...> ... </div>`.

// Let's just fix the whole return structure to be safe.
// Actually I'll replace everything from `return (` to the end of the file with a cleanly built structure.
