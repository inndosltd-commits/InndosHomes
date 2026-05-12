import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// The user is asking "search not working... can it work perfecty the way search on uber while searching for tax works"
// And the screenshot shows the search bar is located over the map, but it's cut off, or maybe the autocomplete dropdown isn't showing properly over the map, or the absolute positioning is causing issues.
// Let's refine the search bar to look exactly like the screenshot:
// The screenshot shows a very clean white rounded pill with "kasarani" typed in, and NO icon visible on the left in the screenshot (or maybe it's just very clean).
// Let's make sure the autocomplete works and is positioned perfectly.

const oldSearchBlock = /{/\*\s*Floating Search Bar\s*\*\/}[\s\S]*?<div className="absolute inset-0 z-0">/;

const newSearchBlock = `{/* Floating Search Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] w-[90%] max-w-2xl pointer-events-none">
        <div className="relative w-full pointer-events-auto">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input 
            placeholder={t('search.placeholder_location') || "Enter pickup location"} 
            className="w-full pl-14 pr-6 h-14 bg-white shadow-lg rounded-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg font-medium text-gray-900 placeholder:text-gray-500"
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
          />
          
          {/* Uber-style Autocomplete Dropdown */}
          {isSearchFocused && searchQuery && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-xl overflow-hidden z-[500] border border-gray-100">
              {filteredProperties.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto py-2">
                  {filteredProperties.slice(0, 5).map(property => (
                    <div 
                      key={property.id}
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4 transition-colors"
                      onClick={() => {
                        setSearchQuery(property.location);
                        setFilteredProperties([property]);
                        setIsSearchFocused(false);
                      }}
                    >
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0 border-b border-gray-100 pb-4 -mb-4">
                        <div className="font-medium text-gray-900 text-lg truncate">{property.location}</div>
                        <div className="text-sm text-gray-500 truncate">{property.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        <div className="absolute inset-0 z-0">`;

if (oldSearchBlock.test(content)) {
    content = content.replace(oldSearchBlock, newSearchBlock);
    fs.writeFileSync(path, content);
    console.log("Updated search to match Uber styling.");
} else {
    console.log("Could not find the search block to replace.");
}

