#!/bin/bash

# Update the main container and Tabs component structure
sed -i 's|<div className="container mx-auto px-4 py-8">|<div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-6 md:gap-8">|g' client/src/pages/Dashboard.tsx

# Create a sidebar container for TabsList and update TabsList styling
sed -i 's|<TabsList className="mb-8 w-full justify-start bg-white p-1 border rounded-lg h-auto overflow-x-auto">|<div className="w-full md:w-64 flex-shrink-0">\n            <div className="bg-white border rounded-xl shadow-sm p-3 mb-6 md:mb-0 sticky top-24">\n              <TabsList className="flex flex-col w-full h-auto bg-transparent p-0 space-y-1">|g' client/src/pages/Dashboard.tsx

# Update TabsTrigger styling to look like vertical sidebar links
sed -i 's|<TabsTrigger value="overview" className="px-6 py-2">|<TabsTrigger value="overview" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg data-\\[state=active\\]:bg-primary/10 data-\\[state=active\\]:text-primary hover:bg-gray-50 transition-colors">|g' client/src/pages/Dashboard.tsx
sed -i 's|<TabsTrigger value="messages" className="px-6 py-2">|<TabsTrigger value="messages" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg data-\\[state=active\\]:bg-primary/10 data-\\[state=active\\]:text-primary hover:bg-gray-50 transition-colors">|g' client/src/pages/Dashboard.tsx
sed -i 's|<TabsTrigger value="analytics" className="px-6 py-2">|<TabsTrigger value="analytics" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg data-\\[state=active\\]:bg-primary/10 data-\\[state=active\\]:text-primary hover:bg-gray-50 transition-colors">|g' client/src/pages/Dashboard.tsx
sed -i 's|<TabsTrigger value="listings" className="px-6 py-2">|<TabsTrigger value="listings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg data-\\[state=active\\]:bg-primary/10 data-\\[state=active\\]:text-primary hover:bg-gray-50 transition-colors">|g' client/src/pages/Dashboard.tsx
sed -i 's|<TabsTrigger value="all-properties" className="px-6 py-2">|<TabsTrigger value="all-properties" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg data-\\[state=active\\]:bg-primary/10 data-\\[state=active\\]:text-primary hover:bg-gray-50 transition-colors">|g' client/src/pages/Dashboard.tsx
sed -i 's|<TabsTrigger value="settings" className="px-6 py-2">|<TabsTrigger value="settings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg data-\\[state=active\\]:bg-primary/10 data-\\[state=active\\]:text-primary hover:bg-gray-50 transition-colors">|g' client/src/pages/Dashboard.tsx

# Close the sidebar container and wrap the content in a main area
sed -i 's|</TabsList>|</TabsList>\n            </div>\n          </div>\n          <div className="flex-1 min-w-0">|g' client/src/pages/Dashboard.tsx

# Add the closing div for the flex-1 container before the closing Tabs tag
sed -i 's|        </Tabs>|          </div>\n        </Tabs>|g' client/src/pages/Dashboard.tsx

# Move the header out of the flex container to stay on top
sed -i 's|<div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">|</div><div className="container mx-auto px-4 pt-8 pb-4 border-b bg-white mb-6">\n        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">\n|g' client/src/pages/Dashboard.tsx

# Fix the div structure around the header
sed -i 's|        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">|        </div>\n      </div>\n      <div className="container mx-auto px-4 pb-12">\n        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col md:flex-row gap-6 md:gap-8">|g' client/src/pages/Dashboard.tsx

# Clean up the initial container
sed -i 's|<div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-6 md:gap-8">||g' client/src/pages/Dashboard.tsx

