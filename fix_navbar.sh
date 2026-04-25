#!/bin/bash

# Fix the JSX element wrapping issue in Navbar.tsx
sed -i 's|<NotificationBell />\n          <div className="hidden lg:flex gap-2">|<> \n            <NotificationBell />\n            <div className="hidden lg:flex gap-2">|g' client/src/components/layout/Navbar.tsx
sed -i 's|          </Button>\n        </div>|          </Button>\n          </>\n        </div>|g' client/src/components/layout/Navbar.tsx
