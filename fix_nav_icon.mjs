import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// The Navbar has a missing import for ChevronDown
if (!content.includes('import { ChevronDown } from "lucide-react";')) {
    content = content.replace('UserCircle, Menu, PlusCircle, LogOut', 'UserCircle, Menu, PlusCircle, LogOut, ChevronDown');
    fs.writeFileSync(path, content);
    console.log("Added ChevronDown import");
}
