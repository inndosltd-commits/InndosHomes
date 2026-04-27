import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// I need to ensure ChevronDown was imported correctly.
// Also, in my last fix, I did this:
// content.replace('UserCircle, Menu, PlusCircle, LogOut', 'UserCircle, Menu, PlusCircle, LogOut, ChevronDown');
// Let's verify it actually worked.
if (content.includes('ChevronDown')) {
    console.log("ChevronDown is present.");
} else {
    console.log("ChevronDown is MISSING.");
}
