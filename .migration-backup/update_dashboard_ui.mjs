import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// We want to replace the dashboard container and tabs setup to look like the reference
const oldLayoutStart = `      <div className="container mx-auto px-4 pt-8 pb-4 border-b bg-white mb-6">`;
const oldLayoutEndPattern = /<TabsList className="flex flex-col w-full h-auto bg-transparent p-0 space-y-1">[\s\S]*?<\/TabsList>\s*<\/div>\s*<\/div>\s*<div className="flex-1 min-w-0">/;

// Replace the top header container
let newContent = content.replace(
  /<div className="container mx-auto px-4 pt-8 pb-4 border-b bg-white mb-6">[\s\S]*?<\/div>\s*<\/div>/,
  `      <div className="bg-white border-b sticky top-16 z-10 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
      </div>`
);

// Define new tab list
const newTabsList = `<TabsList className="flex flex-col w-full h-auto bg-transparent p-2 space-y-1">
              <TabsTrigger value="overview" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-slate-300 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors">
                <Home className="w-4 h-4 mr-3" /> Overview
              </TabsTrigger>
              <TabsTrigger value="messages" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-slate-300 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors">
                <MessageSquare className="w-4 h-4 mr-3" /> Messages
              </TabsTrigger>
              <TabsTrigger value="analytics" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-slate-300 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors">
                <BarChart3 className="w-4 h-4 mr-3" /> Analytics & Reports
              </TabsTrigger>
              {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="listings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-slate-300 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors">
                  <FileText className="w-4 h-4 mr-3" /> My Listings
                </TabsTrigger>
              )}
              {user.role === 'admin' && (
                <TabsTrigger value="all-properties" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-slate-300 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors">
                  <Home className="w-4 h-4 mr-3" /> All Properties
                </TabsTrigger>
              )}
              <TabsTrigger value="settings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-slate-300 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors">
                <UserCircle className="w-4 h-4 mr-3" /> My Profile
              </TabsTrigger>
            </TabsList>`;

// Replace tabs container
newContent = newContent.replace(
  /<div className="container mx-auto px-4 pb-12">\s*<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col md:flex-row gap-6 md:gap-8">\s*<div className="w-full md:w-64 flex-shrink-0">\s*<div className="bg-white border rounded-xl shadow-sm p-3 mb-6 md:mb-0 sticky top-24">[\s\S]*?<\/TabsList>\s*<\/div>\s*<\/div>\s*<div className="flex-1 min-w-0">/,
  `<div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden bg-[#f8fafc]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col md:flex-row h-full">
          
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0 bg-[#2b5c8f] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-8 px-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                  {user.name.charAt(0)}
                </div>
                <div className="text-white">
                  <div className="font-semibold text-sm leading-tight">{user.name}</div>
                  <div className="text-xs text-slate-300 capitalize leading-tight">{user.role} Portal</div>
                </div>
              </div>
              ${newTabsList}
              <div className="mt-8 px-2">
                 <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/5" onClick={() => {/* logout handled by navbar but we can have it here too if needed, for now just a button */}}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-log-out w-4 h-4 mr-3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                   Sign Out
                 </Button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 min-w-0">`
);

// We also need to close the extra div from `<div className="flex-1 flex flex-col md:flex-row...">` instead of `<div className="container mx-auto...">`
newContent = newContent.replace(
  /<\/Tabs>\s*<\/div>\s*<\/div>\s*$/i,
  `<\/Tabs>\n      <\/div>\n    <\/div>`
);

fs.writeFileSync(path, newContent);
console.log('Updated dashboard layout');
