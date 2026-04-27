import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace bg-blue-* with bg-zinc-* for the sidebar
content = content.replace(/className="w-64 bg-blue-[0-9]+ text-white/g, 'className="w-64 bg-zinc-900 text-white');

// For hovering links in sidebar
content = content.replace(/hover:bg-blue-[0-9]+\/50/g, 'hover:bg-zinc-800/50');
content = content.replace(/bg-blue-[0-9]+/g, 'bg-zinc-800');

// Replace logo structure
const logoRegex = /<div className="text-2xl font-bold text-white flex items-center gap-2 mb-8 px-2">\s*<span className="bg-white text-[^"]+ px-2 py-1 rounded text-lg">in<\/span>\s*inndos\s*<\/div>/g;

const newLogo = `<div className="text-2xl font-bold text-white flex items-center gap-2 mb-8 px-2">
            <img src="/logo.png" alt="inndos" className="h-8 w-auto brightness-0 invert" />
          </div>`;

content = content.replace(logoRegex, newLogo);

// Check if logo was replaced, if not let's find the exact string
if (!content.includes('logo.png')) {
    // Look for generic "in inndos" text
    content = content.replace(/<span className="bg-white text-zinc-900 px-2 py-1 rounded text-lg">in<\/span>\s*inndos/, newLogo);
    content = content.replace(/<span className="bg-white text-blue-900 px-2 py-1 rounded text-lg">in<\/span>\s*inndos/, newLogo);
    
    // Also look for TENANT PORTAL blue text
    content = content.replace(/text-blue-300/g, 'text-zinc-400');
}

fs.writeFileSync(path, content);
console.log("Applied grey sidebar and logo updates");
