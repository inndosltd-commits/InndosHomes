import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// The error is: Adjacent JSX elements must be wrapped in an enclosing tag. Did you want a JSX fragment <>...</>? (59:6)
// This is because of the replacement I did earlier. Let's fix the structure.

const searchSectionRegex = /\{\/\*\s*Search Bar\s*\*\/\}\s*<div className="flex w-full items-center justify-center py-2">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;

const match = content.match(searchSectionRegex);
if (match) {
    // Looks like I added too many closing tags
    const newSection = `{/* Search Bar */}
                 <div className="flex w-full items-center justify-center py-2">
                    <div className="relative w-full max-w-2xl">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        placeholder={t('search.placeholder_location') || "Search locations..."} 
                        className="w-full pl-10 pr-4 h-12 bg-white border-gray-200 rounded-full shadow-sm focus:ring-primary focus:border-primary transition-all text-base"
                      />
                    </div>
                 </div>
              </div>
          </div>
      </div>`;
    content = content.replace(searchSectionRegex, newSection);
}

// Let's just fix it by looking at lines 57-61 from the error log:
//   57 |       </div>
//   58 |           </div>
// > 59 |       </div>
//      |       ^
//   60 |
//   61 |       {/* Map Section replacing Hero */}

const badStructure = /<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Map Section replacing Hero \*\/\}/;
if (badStructure.test(content)) {
    content = content.replace(badStructure, '</div>\n          </div>\n\n      {/* Map Section replacing Hero */}');
    fs.writeFileSync(path, content);
    console.log("Fixed JSX structure.");
} else {
    // More aggressive fix if exact match fails
    console.log("Applying regex fix");
    content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, '</div>\n          </div>\n      </div>');
    fs.writeFileSync(path, content);
}
