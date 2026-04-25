import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update sidebar colors to exactly match the screenshot
content = content.replace(/bg-\[#2b5481\]/g, 'bg-[#2E5C8A]');
content = content.replace(/bg-\[#1e4066\]/g, 'bg-[#244b73]');
content = content.replace(/bg-\[#3b6b9e\]/g, 'bg-[#3b73a8]');

// Move "Welcome back" from sidebar to the main content area for "overview" tab.
// I will use regex to find the Overview tab content and inject it at the top.
// Actually, I can just replace the whole return block again to be safe and perfect.

const tabsContentStart = content.indexOf('{/* ANALYTICS TAB');
const tabsContentEnd = content.lastIndexOf('</TabsContent>') + '</TabsContent>'.length;
const innerTabsContent = content.substring(tabsContentStart, tabsContentEnd);

// Find the return statement
const returnIndex = content.indexOf('  return (\n    <Tabs value={activeTab}');
const beforeReturn = content.substring(0, returnIndex);

const newTabsList = `<TabsList className="flex flex-col w-full h-auto bg-transparent p-0 space-y-1">
            <TabsTrigger value="overview" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-[#3b73a8] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Home className="w-5 h-5 mr-3" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="settings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-[#3b73a8] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <UserCircle className="w-5 h-5 mr-3" /> My Profile
            </TabsTrigger>
            <TabsTrigger value="messages" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-[#3b73a8] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <MessageSquare className="w-5 h-5 mr-3" /> Messages
            </TabsTrigger>
            <TabsTrigger value="analytics" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-[#3b73a8] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <BarChart3 className="w-5 h-5 mr-3" /> Analytics
            </TabsTrigger>
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="listings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-[#3b73a8] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <FileText className="w-5 h-5 mr-3" /> My Listings
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="all-properties" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-[#3b73a8] data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Home className="w-5 h-5 mr-3" /> All Properties
                </TabsTrigger>
            )}
            </TabsList>`;

const newReturnBlock = `  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-screen bg-[#f4f7f9] flex flex-col md:flex-row overflow-hidden w-full font-sans">
      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden bg-[#2E5C8A] p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center font-bold text-[#2E5C8A]">in</div>
          <span className="text-white font-bold text-xl tracking-tight">inndos</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white/80 hover:text-white rounded-full"><Bell className="w-5 h-5" /></Button>
        </div>
      </div>
      
      {/* Mobile Tabs List (Horizontal scroll) */}
      <div className="md:hidden bg-[#244b73] shrink-0 border-b border-white/10">
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
      <div className="w-[280px] flex-shrink-0 bg-[#2E5C8A] flex-col h-screen overflow-hidden hidden md:flex">
        {/* Logo */}
        <div className="p-6 pb-2">
            <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer mb-6">
                <div className="w-9 h-9 bg-white rounded flex items-center justify-center font-bold text-[#2E5C8A] text-lg">in</div>
                <span className="text-white font-bold text-[22px] tracking-tight">inndos</span>
            </div>
            </Link>
            <div className="mb-6">
              <p className="text-[#a0c4e8] text-xs font-semibold tracking-widest uppercase mb-1">{user.role} PORTAL</p>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-2">
            ${newTabsList}
        </div>

        <div className="p-4 mt-auto mb-4 mx-4 border-t border-white/10 pt-6">
            <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-[#3b73a8] flex items-center justify-center text-white font-semibold shrink-0">
                {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-white min-w-0">
                <div className="font-medium text-sm leading-tight truncate">{user.name}</div>
                <div className="text-xs text-[#a0c4e8] leading-tight truncate mt-1">{user.email || \`\${user.role}@inndos.com\`}</div>
            </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-[#a0c4e8] hover:text-white hover:bg-white/5 px-2 font-normal" onClick={logout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Sign Out
            </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-[calc(100vh-120px)] md:h-screen overflow-hidden">
        {/* Desktop Header */}
        <div className="bg-white border-b px-8 py-4 hidden md:flex items-center justify-between shrink-0 shadow-sm z-10">
            <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="text-gray-500 rounded-full hover:bg-gray-100"><Bell className="w-5 h-5" /></Button>
                <Link href="/">
                <Button variant="outline" size="sm" className="gap-2 font-medium text-gray-700 bg-white hover:bg-gray-50"><ExternalLink className="w-4 h-4" /> Back to Site</Button>
                </Link>
            </div>
        </div>
        
        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f4f7f9]">
            {activeTab === 'overview' && (
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back, {user.name.split(' ')[0]}!</h1>
                <p className="text-gray-500 text-sm">Here's your {user.role} overview</p>
              </div>
            )}
            ${innerTabsContent}
        </div>
      </div>
    </Tabs>
  );
}
`;

fs.writeFileSync(path, beforeReturn + newReturnBlock);
console.log("Updated Dashboard layout to match RSHR screenshot exactly");
