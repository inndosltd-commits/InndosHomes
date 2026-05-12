#!/bin/bash

# Fix the JSX syntax error in Dashboard.tsx
# At line 284: {(user.role === 'owner' || user.role === 'host') && (
# At line 285:   <>
# At line 447:   </>
# At line 448: )}

# Let's replace the whole section around 448 to 452
sed -i 's|                </Card>|                </Card>\n              </TabsContent>\n            </>|g' client/src/pages/Dashboard.tsx
sed -i 's|              </TabsContent>\n            </>\n          )}|          )}|g' client/src/pages/Dashboard.tsx

