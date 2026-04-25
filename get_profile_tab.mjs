import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const tabsContentStart = content.indexOf('<TabsContent value="settings"');
if (tabsContentStart !== -1) {
  const tabsContentEnd = content.indexOf('</TabsContent>', tabsContentStart) + '</TabsContent>'.length;
  const innerTabsContent = content.substring(tabsContentStart, tabsContentEnd);
  console.log("Profile Tab Content Found");
  console.log(innerTabsContent.substring(0, 500) + '...');
} else {
  console.log("Profile Tab Content Not Found");
}

