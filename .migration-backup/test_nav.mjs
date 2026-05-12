import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// The mobile menu container should be:
// className="lg:hidden fixed top-20 left-0 w-full h-[calc(100vh-80px)] bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto"

if (content.includes('h-[calc(100vh-80px)]')) {
    console.log("Mobile menu height is correctly set to full screen.");
} else {
    console.log("Mobile menu height is missing.");
}

