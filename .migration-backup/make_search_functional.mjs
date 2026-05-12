import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// I need to make the search bar functional like Uber.
// 1. Add a state for searchQuery.
// 2. Add an onChange handler to the Input.
// 3. Create a dropdown list for search results based on the locations available in PROPERTIES.
// 4. Update the filteredProperties based on the search query.

// First, check if there's already some state we can use.
const hasSearchQueryState = content.includes('const [searchQuery, setSearchQuery]');

if (!hasSearchQueryState) {
    // Add state for searchQuery and isSearchFocused
    const stateImportMatch = content.match(/const \[filteredProperties, setFilteredProperties\] = useState<Property\[\]>\(PROPERTIES\);/);
    if (stateImportMatch) {
        content = content.replace(
            'const [filteredProperties, setFilteredProperties] = useState<Property[]>(PROPERTIES);',
            `const [filteredProperties, setFilteredProperties] = useState<Property[]>(PROPERTIES);\n  const [searchQuery, setSearchQuery] = useState("");\n  const [isSearchFocused, setIsSearchFocused] = useState(false);`
        );
    }
    
    // Create a list of unique locations from mock data for autocomplete
    // We'll extract unique locations from PROPERTIES on the fly or just filter the properties directly.
}

const searchInputRegex = /<div className="relative w-full pointer-events-auto">[\s\S]*?<Input[\s\S]*?\/>\n\s*<\/div>/;

const newSearchInput = `<div className="relative w-full pointer-events-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <Input 
            placeholder={t('search.placeholder_location') || "Search locations..."} 
            className="w-full pl-12 pr-4 h-14 bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-lg rounded-full focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
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
          
          {/* Search Autocomplete Dropdown */}
          {isSearchFocused && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[500]">
              {filteredProperties.length > 0 ? (
                <div className="max-h-[60vh] overflow-y-auto py-2">
                  {filteredProperties.slice(0, 5).map(property => (
                    <div 
                      key={property.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                      onClick={() => {
                        setSearchQuery(property.location);
                        setFilteredProperties([property]);
                        setIsSearchFocused(false);
                      }}
                    >
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{property.location}</div>
                        <div className="text-sm text-gray-500 truncate">{property.title} • {property.type}</div>
                      </div>
                    </div>
                  ))}
                  {filteredProperties.length > 5 && (
                    <div className="px-4 py-3 text-center text-sm text-primary font-medium hover:bg-gray-50 cursor-pointer border-t border-gray-50">
                      See all {filteredProperties.length} results
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  No locations found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>`;

content = content.replace(searchInputRegex, newSearchInput);

fs.writeFileSync(path, content);
console.log("Added search functionality with autocomplete dropdown");
