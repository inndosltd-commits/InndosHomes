import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldSearchBlock = /\{\/\*\s*Floating Search Bar\s*\*\/\}\s*<div className="absolute top-4 left-1\/2 -translate-x-1\/2 z-\[400\] w-full max-w-2xl px-4 pointer-events-none">[\s\S]*?<div className="absolute inset-0 z-0">/;

const newSearchBlock = `{/* Floating Search Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] w-[90%] max-w-xl pointer-events-none">
        <div className="relative w-full pointer-events-auto">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-black rounded-full shadow-[0_0_0_2px_white,0_0_0_4px_black]"></div>
          <Input 
            placeholder={t('search.placeholder_location') || "Where to?"} 
            className="w-full pl-12 pr-6 h-14 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.1)] rounded-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg font-medium text-gray-900 placeholder:text-gray-500"
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
            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden z-[500] border border-gray-100">
              {filteredProperties.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto py-2">
                  {filteredProperties.slice(0, 5).map((property, index) => (
                    <div 
                      key={property.id}
                      className="px-4 hover:bg-gray-50 cursor-pointer flex items-start gap-4 transition-colors group"
                      onClick={() => {
                        setSearchQuery(property.location);
                        setFilteredProperties([property]);
                        setIsSearchFocused(false);
                      }}
                    >
                      <div className="mt-4 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-gray-400 group-hover:text-black transition-colors" />
                      </div>
                      <div className={\`flex-1 min-w-0 py-4 \${index !== Math.min(filteredProperties.length, 5) - 1 ? 'border-b border-gray-100' : ''}\`}>
                        <div className="font-medium text-gray-900 text-base truncate">{property.location}</div>
                        <div className="text-sm text-gray-500 truncate mt-0.5">{property.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  No locations found matching "{searchQuery}"
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
    console.log("Updated search to perfectly match Uber styling.");
} else {
    console.log("Could not find the search block to replace.");
}
