import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace blue backgrounds with grey in the sidebar
content = content.replace(/bg-blue-900/g, 'bg-zinc-900');
content = content.replace(/bg-blue-800/g, 'bg-zinc-800');
content = content.replace(/bg-blue-950/g, 'bg-zinc-950');

// Replace "(in)" logo text with just "inndos" keeping the logo icon
// It might look like: <div className="..."><span className="...">in</span> inndos</div>
// Or maybe it's just text: "in inndos"
content = content.replace(/<span className="[^"]*bg-white text-blue-900[^"]*">\s*in\s*<\/span>\s*inndos/gi, 'inndos');
content = content.replace(/<span className="[^"]*bg-white text-zinc-900[^"]*">\s*in\s*<\/span>\s*inndos/gi, 'inndos');

// If the logo is an image, let's make sure it's just the logo.png
const logoRegex = /<div className="text-2xl font-bold text-white flex items-center gap-2 mb-8 px-2">\s*<span className="bg-white text-blue-900 px-2 py-1 rounded text-lg">in<\/span>\s*inndos\s*<\/div>/;
const newLogo = `<div className="text-2xl font-bold text-white flex items-center gap-2 mb-8 px-2">
            <img src="/logo.png" alt="inndos" className="h-8 w-auto brightness-0 invert" />
          </div>`;

content = content.replace(logoRegex, newLogo);

// Let's also check if there's any other logo variation in Dashboard.tsx
const logoRegex2 = /<div className="text-2xl font-bold text-white flex items-center gap-2 mb-8 px-2">\s*<span className="bg-white text-zinc-900 px-2 py-1 rounded text-lg">in<\/span>\s*inndos\s*<\/div>/;
content = content.replace(logoRegex2, newLogo);

// For the "TENANT PORTAL" text
content = content.replace(
    /<div className="text-xs font-semibold text-blue-300 mb-4 px-2 uppercase tracking-wider">/g,
    '<div className="text-xs font-semibold text-zinc-400 mb-4 px-2 uppercase tracking-wider">'
);

fs.writeFileSync(path, content);
console.log("Updated Dashboard sidebar color and logo");
