import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// I will extract from `return (` to the end and rewrite it properly.
const returnIndex = content.indexOf('  return (\n    <div className="min-h-screen');
if (returnIndex === -1) {
  console.log("Could not find return statement start");
  process.exit(1);
}

const beforeReturn = content.substring(0, returnIndex);
const oldReturnContent = content.substring(returnIndex);

// We need to keep the inner tabs content untouched. Let's extract it.
const tabsContentStart = oldReturnContent.indexOf('{/* ANALYTICS TAB');
const tabsContentEnd = oldReturnContent.lastIndexOf('</TabsContent>') + '</TabsContent>'.length;

if (tabsContentStart === -1 || tabsContentEnd === -1) {
  console.log("Could not find tabs content");
  process.exit(1);
}

const innerTabsContent = oldReturnContent.substring(tabsContentStart, tabsContentEnd);

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

const newReturnBlock = `  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col overflow-hidden">
      <Navbar />
      
      <div className="bg-white border-b sticky top-0 z-10 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
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
      </div>

      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col md:flex-row h-full">
          
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0 bg-[#2b5c8f] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-8 px-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="text-white min-w-0">
                  <div className="font-semibold text-sm leading-tight truncate">{user.name}</div>
                  <div className="text-xs text-slate-300 capitalize leading-tight truncate">{user.role} Portal</div>
                </div>
              </div>
              ${newTabsList}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 min-w-0">
            ${innerTabsContent}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path, beforeReturn + newReturnBlock);
console.log("Rewrote dashboard return statement successfully");
