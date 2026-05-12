import fs from 'fs';

const path = 'client/src/pages/Login.tsx';
let content = fs.readFileSync(path, 'utf8');

// The user wants to remove tenant and guest from the switch, but the switch has: "tenant", "owner", "admin", "host", "guest".
// Wait, he said "on list proprty form where you have to switch from tenant, owner, host, guest and admin."
// He means the Login/Signup form which you use to authenticate before listing.
// Let's remove tenant and guest from the Tabs map in Login.tsx.

content = content.replace(/\{\["tenant", "owner", "host", "guest", "admin"\]\.map\(\(role\) => \(/g, 
  '{["owner", "host", "admin"].map((role) => (');

fs.writeFileSync(path, content);
console.log("Updated roles in Login.tsx");
