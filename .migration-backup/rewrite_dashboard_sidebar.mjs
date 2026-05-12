import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Ensure logout is destructured from useAuth
content = content.replace(
  /const \{ user, isLoading \} = useAuth\(\);/,
  `const { user, isLoading, logout } = useAuth();`
);

// Add Bell icon import if missing
if (!content.includes('Bell,')) {
  content = content.replace(
    /import \{ Home, MessageSquare, /,
    `import { Home, MessageSquare, Bell, `
  );
}

// Extract TabsContent
const tabsContentStart = content.indexOf('{/* ANALYTICS TAB');
const tabsContentEnd = content.lastIndexOf('</TabsContent>') + '</TabsContent>'.length;
const innerTabsContent = content.substring(tabsContentStart, tabsContentEnd);

// Replace everything from `return (`
const returnIndex = content.indexOf('  return (\n    <div className="min-h-screen');
const beforeReturn = content.substring(0, returnIndex);

const newReturnBlock = `  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row overflow-hidden w-full">
      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden bg-[#2b5481] p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center font-bold text-[#2b5481]">in</div>
          <span className="text-white font-bold text-xl tracking-tight">inndos</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white/80 hover:text-white rounded-full"><Bell className="w-5 h-5" /></Button>
        </div>
      </div>
      
      {/* Mobile Tabs List (Horizontal scroll) */}
      <div className="md:hidden bg-[#1e4066] shrink-0 border-b border-white/10">
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
          <TabsTrigger value="analytics" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            Analytics
          </TabsTrigger>
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="listings" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-blue-100 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Listings
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
      <div className="w-64 flex-shrink-0 bg-[#2b5481] flex-col h-screen overflow-hidden hidden md:flex">
        {/* Logo */}
        <div className="p-6 pb-4">
            <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer mb-6">
                <div className="w-8 h-8 bg-white rounded flex items-center justify-center font-bold text-[#2b5481]">in</div>
                <span className="text-white font-bold text-2xl tracking-tight">inndos</span>
            </div>
            </Link>
            <div className="bg-[#1e4066] rounded-lg p-3">
              <p className="text-blue-200 text-xs font-semibold tracking-wider uppercase mb-1">{user.role} PORTAL</p>
              <h2 className="text-white font-medium truncate">Welcome back!</h2>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-2">
            <TabsList className="flex flex-col w-full h-auto bg-transparent p-0 space-y-2">
            <TabsTrigger value="overview" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-blue-100 data-[state=active]:bg-[#3b6b9e] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Home className="w-5 h-5 mr-3" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="settings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-blue-100 data-[state=active]:bg-[#3b6b9e] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <UserCircle className="w-5 h-5 mr-3" /> My Profile
            </TabsTrigger>
            <TabsTrigger value="messages" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-blue-100 data-[state=active]:bg-[#3b6b9e] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <MessageSquare className="w-5 h-5 mr-3" /> Messages
            </TabsTrigger>
            <TabsTrigger value="analytics" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-blue-100 data-[state=active]:bg-[#3b6b9e] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <BarChart3 className="w-5 h-5 mr-3" /> Analytics
            </TabsTrigger>
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="listings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-blue-100 data-[state=active]:bg-[#3b6b9e] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <FileText className="w-5 h-5 mr-3" /> My Listings
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="all-properties" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-blue-100 data-[state=active]:bg-[#3b6b9e] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Home className="w-5 h-5 mr-3" /> All Properties
                </TabsTrigger>
            )}
            </TabsList>
        </div>

        <div className="p-4 bg-[#1e4066] mt-auto">
            <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-white min-w-0">
                <div className="font-semibold text-sm leading-tight truncate">{user.name}</div>
                <div className="text-xs text-blue-200 leading-tight truncate mt-0.5">{user.email || \`\${user.role}@inndos.com\`}</div>
            </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-blue-200 hover:text-white hover:bg-white/10 px-2" onClick={logout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Sign Out
            </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-[calc(100vh-120px)] md:h-screen overflow-hidden">
        {/* Desktop Header */}
        <div className="bg-white border-b px-8 py-4 hidden md:flex items-center justify-between shrink-0">
            <h2 className="text-xl font-semibold text-gray-800">Dashboard Overview</h2>
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="text-gray-500 rounded-full bg-gray-50 hover:bg-gray-100"><Bell className="w-5 h-5" /></Button>
                <Link href="/">
                <Button variant="outline" size="sm" className="gap-2 font-medium text-gray-600"><ExternalLink className="w-4 h-4" /> Back to Site</Button>
                </Link>
            </div>
        </div>
        
        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            ${innerTabsContent}
        </div>
      </div>
    </Tabs>
  );
}
`;

fs.writeFileSync(path, beforeReturn + newReturnBlock);
console.log("Rewrote dashboard layout with exact sidebar styling");
