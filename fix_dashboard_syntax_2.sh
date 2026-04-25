#!/bin/bash

# Fix the JSX syntax error in Dashboard.tsx
# The error is at line 246:
# 244 |         </div>
# 245 |       </div>
# 246 |       <div className="container mx-auto px-4 pb-12">
# We need to wrap the whole return statement in a single div or fragment

sed -i 's|return (|return (\n    <>|g' client/src/pages/Dashboard.tsx
sed -i 's|    </div>\n  );\n}|    </div>\n    </>\n  );\n}|g' client/src/pages/Dashboard.tsx

