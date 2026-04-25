#!/bin/bash

# Fix the JSX syntax error in Dashboard.tsx
# At the bottom, the script `fix_dashboard_syntax_2.sh` added a `</>` but without a corresponding `<>` at the start.
# Let's remove the `<>` wrapper that was added improperly.

sed -i 's|return (\\n    <>|return (|g' client/src/pages/Dashboard.tsx
sed -i 's|    </div>\\n    </>\\n  );|    </div>\\n  );|g' client/src/pages/Dashboard.tsx

