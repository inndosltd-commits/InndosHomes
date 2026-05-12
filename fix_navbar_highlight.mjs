import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Currently, the highlighting uses location.includes('...'). 
// For exact highlighting, let's use exact match or better logic.
// The user says "lets have highlighting of menu item when you have selected that item on header menu."

content = content.replace(/location\.includes\('bnb'\)/g, "(location === '/search' && new URLSearchParams(window.location.search).get('type') === 'bnb') || location === '/bnb'");
content = content.replace(/location\.includes\('rent'\)/g, "(location === '/search' && new URLSearchParams(window.location.search).get('type')?.includes('rent'))");
content = content.replace(/location\.includes\('hostel'\)/g, "(location === '/search' && new URLSearchParams(window.location.search).get('type') === 'hostel') || location === '/hostel'");
content = content.replace(/location\.includes\('hotel'\)/g, "(location === '/search' && new URLSearchParams(window.location.search).get('type') === 'hotel') || location === '/hotel'");
content = content.replace(/location\.includes\('sale'\)/g, "(location === '/search' && new URLSearchParams(window.location.search).get('type') === 'sale') || location === '/sale'");

fs.writeFileSync(path, content);
console.log("Updated Navbar highlighting logic.");
