import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// I need to add a "Profile completion" progress bar above the profile form fields
// like the screenshot. 
// "Welcome back, {name}"
// "{role} portal"
// Profile completion [====     ] 78%

const tabsContentStart = content.indexOf('<TabsContent value="settings"');
const tabsContentEnd = content.indexOf('</TabsContent>', tabsContentStart) + '</TabsContent>'.length;
let profileTabContent = content.substring(tabsContentStart, tabsContentEnd);

// Calculate profile completion logic directly in the UI for mockup
const profileCompletionUI = `
            {/* Profile Completion Header */}
            <div className="bg-white border rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-[#2E5C8A] flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-600">Profile completion:</span>
                  <span className="text-[#2E5C8A]">78%</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2E5C8A] rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>

            <Card className="border-none shadow-sm">
              <CardHeader className="border-b bg-gray-50/50 rounded-t-xl pb-4">
                <div className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-gray-500" />
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                {/* Profile Picture */}
`;

profileTabContent = profileTabContent.replace(
  /<Card>\s*<CardHeader>\s*<CardTitle>My Profile<\/CardTitle>\s*<CardDescription>Manage your personal information and documents<\/CardDescription>\s*<\/CardHeader>\s*<CardContent className="space-y-8">/g,
  profileCompletionUI
);

// We need to also adjust the fields inside to match a 2-column layout like the screenshot
// The screenshot has:
// Full Name | Email
// Phone | Availability
// Professional Headline | 
// Preferred Location | Salary Expectation

profileTabContent = profileTabContent.replace(
  /<div className="space-y-2">\s*<Label>Full Name<\/Label>\s*<Input defaultValue=\{user\.name\} \/>\s*<\/div>\s*<div className="space-y-2">\s*<Label>Email Address<\/Label>\s*<Input defaultValue=\{user\.email \|\| `\$\{user\.role\}@inndos\.com`\} \/>\s*<\/div>\s*<div className="space-y-2">\s*<Label>Phone No<\/Label>\s*<Input placeholder="\+254 700 000000" \/>\s*<\/div>/g,
  `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-600">Full Name</Label>
                    <Input defaultValue={user.name} className="bg-gray-50/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">Email</Label>
                    <Input defaultValue={user.email || \`\${user.role}@inndos.com\`} className="bg-gray-50/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">Phone</Label>
                    <Input placeholder="+254 700 000000" className="bg-gray-50/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">Availability</Label>
                    <Input placeholder="Immediately" className="bg-gray-50/50" />
                  </div>
                </div>`
);

content = content.substring(0, tabsContentStart) + profileTabContent + content.substring(tabsContentEnd);

fs.writeFileSync(path, content);
console.log("Updated profile tab with progress bar and layout");
