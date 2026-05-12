import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the blue backgrounds with grey ones
content = content.replace(/bg-\[\#2E5C8A\]/g, 'bg-zinc-900');
content = content.replace(/bg-\[\#244b73\]/g, 'bg-zinc-800');
content = content.replace(/bg-\[\#3b73a8\]/g, 'bg-zinc-700');
content = content.replace(/bg-\[\#234A72\]/g, 'bg-zinc-800');
content = content.replace(/bg-\[\#f4f7f9\]/g, 'bg-gray-50');

// Update text colors for sidebar items
content = content.replace(/text-\[\#a0c4e8\]/g, 'text-zinc-400');
content = content.replace(/text-\[\#e0ecf8\]/g, 'text-zinc-300');

// Fix the logo area
const logoAreaRegex = /<div className="flex items-center gap-2 px-2 mb-8">\s*<div className="bg-white text-\[\#2E5C8A\] font-bold text-lg px-2 py-1 rounded shadow-sm">\s*in\s*<\/div>\s*<span className="text-white font-bold text-xl tracking-tight">inndos<\/span>\s*<\/div>/g;

const newLogoArea = `<div className="flex items-center gap-2 px-2 mb-8">
            <img src="/logo.png" alt="inndos" className="h-8 w-auto brightness-0 invert" />
          </div>`;

content = content.replace(logoAreaRegex, newLogoArea);

// Fix the mobile menu logo area
const mobileLogoAreaRegex = /<div className="flex items-center gap-2 px-2">\s*<div className="bg-white text-\[\#2E5C8A\] font-bold text-xl px-2\.5 py-1\.5 rounded shadow-sm">\s*in\s*<\/div>\s*<span className="text-white font-bold text-\[22px\] tracking-tight">inndos<\/span>\s*<\/div>/g;

const newMobileLogoArea = `<div className="flex items-center gap-2 px-2">
              <img src="/logo.png" alt="inndos" className="h-8 w-auto brightness-0 invert" />
            </div>`;

content = content.replace(mobileLogoAreaRegex, newMobileLogoArea);

fs.writeFileSync(path, content);
console.log("Updated Dashboard sidebar background to grey and fixed logo");
