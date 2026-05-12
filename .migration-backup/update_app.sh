#!/bin/bash

# Insert import
sed -i 's|import { AuthProvider } from "./lib/auth";|import AdminAnalytics from "@/pages/AdminAnalytics";\nimport { AuthProvider } from "./lib/auth";|' client/src/App.tsx

# Insert route
sed -i 's|<Route component={NotFound} />|<Route path="/admin/analytics" component={AdminAnalytics}/>\n      <Route component={NotFound} />|' client/src/App.tsx
