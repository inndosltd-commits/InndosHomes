#!/bin/bash

# Fix the JSX syntax error in Dashboard.tsx
# The error is at:
# 220 |        
# 221 |          </div><div className="container mx-auto px-4 pt-8 pb-4 border-b bg-white mb-6">
# 222 |          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

# Read the file and fix the specific lines
sed -i 's|        </div><div className="container mx-auto px-4 pt-8 pb-4 border-b bg-white mb-6">|        <div className="container mx-auto px-4 pt-8 pb-4 border-b bg-white mb-6">|g' client/src/pages/Dashboard.tsx

