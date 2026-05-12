import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// We need to add `<TabsContent value="analytics" className="space-y-6">...`
// for each role where it's missing, or a shared one.
// Let's add a shared one before the "messages" tab to make it simple.

const oldString = `          {/* MESSAGES TAB (Shared) */}
          <TabsContent value="messages" className="space-y-6">`;

const newString = `          {/* ANALYTICS TAB (Shared Placeholder) */}
          <TabsContent value="analytics" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle>Analytics & Reports</CardTitle>
                 <CardDescription>View your performance metrics and download reports</CardDescription>
               </CardHeader>
               <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                 <BarChart3 className="h-16 w-16 text-gray-300 mb-4" />
                 <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available Yet</h3>
                 <p className="max-w-md">Your analytics dashboard will populate with insights once your properties start receiving views, inquiries, and bookings.</p>
                 <Button variant="outline" className="mt-6">Download Sample Report</Button>
               </CardContent>
             </Card>
          </TabsContent>

          {/* MESSAGES TAB (Shared) */}
          <TabsContent value="messages" className="space-y-6">`;

content = content.replace(oldString, newString);
fs.writeFileSync(path, content);
console.log('Added analytics tab content');
