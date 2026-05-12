import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldSelectSection = `          <div className="flex items-center justify-between mb-2">
             <span className="text-base font-medium text-gray-500">Language</span>
             <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
               <SelectTrigger className="h-10 w-[120px] text-sm border-gray-200">
                 <SelectValue placeholder="Lang" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="EN">🇺🇸 EN</SelectItem>
                 <SelectItem value="FR">🇫🇷 FR</SelectItem>
                 <SelectItem value="DE">🇩🇪 DE</SelectItem>
               </SelectContent>
             </Select>
          </div>

          <div className="flex items-center justify-between mb-4">
             <span className="text-base font-medium text-gray-500">Currency</span>
             <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
               <SelectTrigger className="h-10 w-[120px] text-sm border-gray-200">
                 <SelectValue placeholder="Currency" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="KES">KES</SelectItem>
                 <SelectItem value="USD">USD</SelectItem>
                 <SelectItem value="EUR">EUR</SelectItem>
                 <SelectItem value="GBP">GBP</SelectItem>
               </SelectContent>
             </Select>
          </div>`;

const newSelectSection = `          <div className="flex items-center justify-between mb-2 z-[110] relative">
             <span className="text-base font-medium text-gray-500">Language</span>
             <select 
               value={language} 
               onChange={(e) => setLanguage(e.target.value)}
               className="h-10 w-[120px] text-sm border border-gray-200 rounded-md px-3 bg-white outline-none focus:ring-2 focus:ring-primary"
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
               className="h-10 w-[120px] text-sm border border-gray-200 rounded-md px-3 bg-white outline-none focus:ring-2 focus:ring-primary"
             >
               <option value="KES">KES</option>
               <option value="USD">USD</option>
               <option value="EUR">EUR</option>
               <option value="GBP">GBP</option>
             </select>
          </div>`;

if (content.includes(oldSelectSection)) {
    content = content.replace(oldSelectSection, newSelectSection);
    fs.writeFileSync(path, content);
    console.log("Successfully replaced Select with native select for mobile menu");
} else {
    console.log("Could not find the block to replace.");
}
