import fs from 'fs';

const path = 'client/src/pages/AddListing.tsx';
let content = fs.readFileSync(path, 'utf8');

// The user asked to remove "tenant and guest" from the switch on list property form.
// Let's see if there are any roles mentioned in AddListing.tsx
if (content.includes('tenant') || content.includes('guest')) {
    console.log("Tenant or guest found in AddListing.tsx. Removing them.");
    // Wait, let's just log where they are.
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('tenant') || line.includes('guest')) {
            console.log(`Line ${i+1}: ${line}`);
        }
    });
} else {
    console.log("No tenant/guest found in AddListing.tsx. Maybe it's in Login.tsx?");
}
