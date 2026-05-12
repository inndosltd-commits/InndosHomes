#!/bin/bash

# Fix the escaped quotes
sed -i 's|\\`|`|g' client/src/pages/AdminAnalytics.tsx
sed -i 's|\\$|$|g' client/src/pages/AdminAnalytics.tsx
