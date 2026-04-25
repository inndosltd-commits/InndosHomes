#!/bin/bash

# Import Analytics component
sed -i 's|import { MessagingSystem } from "@/components/dashboard/MessagingSystem";|import { MessagingSystem } from "@/components/dashboard/MessagingSystem";\nimport { Analytics } from "@/components/dashboard/Analytics";|g' client/src/pages/Dashboard.tsx

# Add Analytics tab trigger to all roles
sed -i 's|<TabsTrigger value="messages" className="px-6 py-2">Messages</TabsTrigger>|<TabsTrigger value="messages" className="px-6 py-2">Messages</TabsTrigger>\n            <TabsTrigger value="analytics" className="px-6 py-2">Analytics & Reports</TabsTrigger>|g' client/src/pages/Dashboard.tsx

# Add Analytics content
sed -i 's|{/\* MESSAGES TAB (Shared) \*/}|{/* ANALYTICS TAB (Shared) */}\n          <TabsContent value="analytics">\n            <Analytics />\n          </TabsContent>\n\n          {/* MESSAGES TAB (Shared) */}|g' client/src/pages/Dashboard.tsx

