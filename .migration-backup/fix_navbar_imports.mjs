import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('import { UserCircle, Menu, PlusCircle, LogOut, ChevronDown, ChevronDown } from "lucide-react";', 'import { UserCircle, Menu, PlusCircle, LogOut, ChevronDown } from "lucide-react";');
content = content.replace('import { UserCircle, Menu, PlusCircle, LogOut, ChevronDown } from "lucide-react";', 'import { UserCircle, Menu, PlusCircle, LogOut, ChevronDown } from "lucide-react";');

fs.writeFileSync(path, content);
