import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// The screenshot shows the "List Property" button and search bar floating awkwardly in the center.
// I changed it to "justify-end" in my last edit, but it seems there's still a layout issue, or it looks out of place being the only thing there.
// Instead of having a dedicated sticky bar just for these two items, can we move the search bar to the center or make it full width?

// Let's check the current HTML for that section:
const searchSectionRegex = /\{\/\*\s*Right Side: List Property & Search Bar\s*\*\/\}\s*<div className="flex w-full items-center justify-end gap-3">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const match = content.match(searchSectionRegex);
if (match) {
    console.log("Current Search Section:\n", match[0]);
    
    // Instead of justify-end, let's make the search bar take up the full width, center it, and maybe hide the "List Property" button if it's redundant since there is already one in the Navbar.
    // The Navbar already has a "List Property" button: <Button variant="ghost" ...> <PlusCircle /> List Property </Button>
    
    // So we can remove the "List Property" button here and just have a nice, centered, wide search bar for locations.
    
    const newSearchSection = `{/* Search Bar */}
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
      
    content = content.replace(searchSectionRegex, newSearchSection);
    fs.writeFileSync(path, content);
    console.log("Updated search bar layout to be centered and wide, removing redundant List Property button.");
} else {
    console.log("Search section not found.");
}
