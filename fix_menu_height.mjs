import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Also make sure overflow works properly and background covers everything
const oldMenuContainer = `className="lg:hidden fixed top-20 left-0 w-full h-[calc(100vh-5rem)] bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto"`;
const newMenuContainer = `className="lg:hidden fixed top-20 left-0 w-full h-[calc(100vh-80px)] bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto"`;

if (content.includes(oldMenuContainer)) {
    content = content.replace(oldMenuContainer, newMenuContainer);
    fs.writeFileSync(path, content);
    console.log("Updated calc height in menu");
}

