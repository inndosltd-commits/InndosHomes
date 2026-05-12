import fs from 'fs';

const path = 'client/src/pages/AddListing.tsx';
let content = fs.readFileSync(path, 'utf8');

// Point 3: Remove tenant and guest from the switch on list property form.
// Actually, AddListing form shouldn't have a role switch. Usually the Login page has it.
// Let's check what AddListing has.
