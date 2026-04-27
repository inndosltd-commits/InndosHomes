import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace first occurrence
const oldLogo1 = `<div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center font-bold text-[#2E5C8A]">in</div>
          <span className="text-white font-bold text-xl tracking-tight">inndos</span>
        </div>`;
        
const newLogo1 = `<div className="flex items-center gap-2">
          <img src="/logo.png" alt="inndos" className="h-8 w-auto brightness-0 invert" />
        </div>`;

content = content.replace(oldLogo1, newLogo1);

// Replace second occurrence
const oldLogo2 = `<div className="flex items-center gap-2 cursor-pointer mb-6">
                <div className="w-9 h-9 bg-white rounded flex items-center justify-center font-bold text-[#2E5C8A] text-lg">in</div>
                <span className="text-white font-bold text-[22px] tracking-tight">inndos</span>
            </div>`;

const newLogo2 = `<div className="flex items-center gap-2 cursor-pointer mb-6">
                <img src="/logo.png" alt="inndos" className="h-8 w-auto brightness-0 invert" />
            </div>`;

content = content.replace(oldLogo2, newLogo2);

fs.writeFileSync(path, content);
console.log("Successfully replaced the text logos with the image logo.");
