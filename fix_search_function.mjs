import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// I need to ensure the search functionality is visually similar to Uber
// which means:
// 1. The input has a clear, prominent styling (done).
// 2. When clicked (focused), it shows a dropdown with autocomplete suggestions (done).
// 3. The suggestions show locations.

// Let's refine the styling to make it look even more like Uber's search.
// Uber search is typically a clean white rounded rectangle with a shadow, and the dropdown is seamless.

const oldInputBlock = /<Input[\s\S]*?onBlur=\{\(\) => setTimeout\(\(\) => setIsSearchFocused\(false\), 200\)\}\s*\/>/;

const newInputBlock = `<Input 
            placeholder={t('search.placeholder_location') || "Where to?"} 
            className="w-full pl-12 pr-4 h-14 bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl focus:ring-2 focus:ring-black focus:border-black transition-all text-lg font-medium text-gray-900 placeholder:text-gray-500 placeholder:font-normal"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              const query = e.target.value.toLowerCase();
              if (query) {
                setFilteredProperties(PROPERTIES.filter(p => 
                  p.title.toLowerCase().includes(query) || 
                  p.location.toLowerCase().includes(query) ||
                  p.type.toLowerCase().includes(query)
                ));
              } else {
                setFilteredProperties(PROPERTIES);
              }
            }}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          />`;

content = content.replace(oldInputBlock, newInputBlock);

// Also let's update the dropdown style
const oldDropdown = /<div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-\[500\]">/;
const newDropdown = `<div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden z-[500] pointer-events-auto">`;

content = content.replace(oldDropdown, newDropdown);

fs.writeFileSync(path, content);
console.log("Uber style search refinements applied.");
