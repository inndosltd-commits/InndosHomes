import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldSelects = `          <div className="flex items-center justify-between mb-2">
             <span className="text-base font-medium text-gray-500">Language</span>
             <div className="w-[120px]">
               <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                 <SelectTrigger className="h-10 text-sm border-gray-200 bg-white">
                   <SelectValue placeholder="Lang" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="EN">🇺🇸 EN</SelectItem>
                   <SelectItem value="FR">🇫🇷 FR</SelectItem>
                   <SelectItem value="DE">🇩🇪 DE</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>

          <div className="flex items-center justify-between mb-4">
             <span className="text-base font-medium text-gray-500">Currency</span>
             <div className="w-[120px]">
               <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                 <SelectTrigger className="h-10 text-sm border-gray-200 bg-white">
                   <SelectValue placeholder="Currency" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="KES">KES</SelectItem>
                   <SelectItem value="USD">USD</SelectItem>
                   <SelectItem value="EUR">EUR</SelectItem>
                   <SelectItem value="GBP">GBP</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>`;

const newSelects = `          <div className="flex items-center justify-between mb-2 z-[110] relative">
             <span className="text-base font-medium text-gray-500">Language</span>
             <select 
               value={language} 
               onChange={(e) => setLanguage(e.target.value)}
               className="h-10 w-[120px] text-sm border border-gray-200 rounded-md px-3 bg-white outline-none focus:ring-2 focus:ring-primary appearance-none"
               style={{ WebkitAppearance: 'none' }}
             >
               <option value="EN">🇺🇸 EN</option>
               <option value="FR">🇫🇷 FR</option>
               <option value="DE">🇩🇪 DE</option>
             </select>
          </div>

          <div className="flex items-center justify-between mb-4 z-[110] relative">
             <span className="text-base font-medium text-gray-500">Currency</span>
             <select 
               value={currency} 
               onChange={(e) => setCurrency(e.target.value)}
               className="h-10 w-[120px] text-sm border border-gray-200 rounded-md px-3 bg-white outline-none focus:ring-2 focus:ring-primary appearance-none"
               style={{ WebkitAppearance: 'none' }}
             >
               <option value="KES">KES</option>
               <option value="USD">USD</option>
               <option value="EUR">EUR</option>
               <option value="GBP">GBP</option>
             </select>
          </div>`;

if (content.includes(oldSelects)) {
    content = content.replace(oldSelects, newSelects);
    fs.writeFileSync(path, content);
    console.log("Successfully reverted to native selects to fix iOS ghost clicks");
} else {
    console.log("Could not find the Shadcn select block. Here is what is there:");
    console.log(content.substring(content.indexOf('Language</span>'), content.indexOf('</nav>')));
}

