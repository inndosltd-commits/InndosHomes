import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// The goal is to change the Tabs component to use a vertical layout with a sidebar for the TabsList.

// 1. Update the main container
content = content.replace(
  '<div className="container mx-auto px-4 py-8">',
  '<div className="container mx-auto px-4 pt-8 pb-4 border-b bg-white mb-6">\n        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">'
);

// 2. Move the closing div for the header out of the Tabs area
content = content.replace(
  '          </div>\n        </div>\n\n        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">',
  '          </div>\n        </div>\n      </div>\n      <div className="container mx-auto px-4 pb-12">\n        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col md:flex-row gap-6 md:gap-8">'
);

// 3. Create the sidebar and update the TabsList
content = content.replace(
  '<TabsList className="mb-8 w-full justify-start bg-white p-1 border rounded-lg h-auto overflow-x-auto">',
  '<div className="w-full md:w-64 flex-shrink-0">\n            <div className="bg-white border rounded-xl shadow-sm p-3 mb-6 md:mb-0 sticky top-24">\n              <TabsList className="flex flex-col w-full h-auto bg-transparent p-0 space-y-1">'
);

// 4. Update the TabTriggers to look like sidebar links
const triggerRegex = /<TabsTrigger value="([^"]+)" className="px-6 py-2">/g;
content = content.replace(triggerRegex, '<TabsTrigger value="$1" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-gray-50 transition-colors">');

// 5. Add the Analytics TabTrigger since it was missing in the original restore
content = content.replace(
  '<TabsTrigger value="messages" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-gray-50 transition-colors">Messages</TabsTrigger>',
  '<TabsTrigger value="messages" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-gray-50 transition-colors">Messages</TabsTrigger>\n            <TabsTrigger value="analytics" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-gray-50 transition-colors">Analytics & Reports</TabsTrigger>'
);

// 6. Close the sidebar and open the main content area
content = content.replace(
  '          </TabsList>\n',
  '          </TabsList>\n            </div>\n          </div>\n          <div className="flex-1 min-w-0">\n'
);

// 7. Close the flex-1 div before the Tabs close
content = content.replace(
  '        </Tabs>\n      </div>\n    </div>\n  );\n}',
  '          </div>\n        </Tabs>\n      </div>\n    </div>\n  );\n}'
);

// 8. Fix the header structure we broke in step 1 & 2
content = content.replace(
  '<div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">\n          <div>',
  '<div>'
);

fs.writeFileSync(path, content);
console.log('Done updating dashboard layout');
