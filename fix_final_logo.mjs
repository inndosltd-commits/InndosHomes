import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// I can see the logo area is still there:
// <div className="w-8 h-8 bg-white rounded flex items-center justify-center font-bold text-[#2E5C8A]">in</div>
// <span className="text-white font-bold text-xl tracking-tight">inndos</span>

const logoRegex1 = /<div className="flex items-center gap-2 px-2 mb-8">\s*<div className="w-8 h-8 bg-white rounded flex items-center justify-center font-bold text-\[\#2E5C8A\]">in<\/div>\s*<span className="text-white font-bold text-xl tracking-tight">inndos<\/span>\s*<\/div>/g;

const newLogo1 = `<div className="flex items-center gap-2 px-2 mb-8">
            <img src="/logo.png" alt="inndos" className="h-8 w-auto brightness-0 invert" />
          </div>`;

content = content.replace(logoRegex1, newLogo1);

const logoRegex2 = /<div className="flex items-center gap-2 px-2">\s*<div className="w-9 h-9 bg-white rounded flex items-center justify-center font-bold text-\[\#2E5C8A\] text-lg">in<\/div>\s*<span className="text-white font-bold text-\[22px\] tracking-tight">inndos<\/span>\s*<\/div>/g;

const newLogo2 = `<div className="flex items-center gap-2 px-2">
              <img src="/logo.png" alt="inndos" className="h-8 w-auto brightness-0 invert" />
            </div>`;

content = content.replace(logoRegex2, newLogo2);

// Check if tenant portal text still has blue
content = content.replace(/text-blue-300/g, 'text-zinc-400');
content = content.replace(/text-\[\#a0c4e8\]/g, 'text-zinc-400');

fs.writeFileSync(path, content);
console.log("Fixed the final remaining logo variations");
