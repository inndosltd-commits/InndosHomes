import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// If the search bar triggers a form submission (which is default behavior of Input component if it's somehow seen as a form, or maybe wouter's Link is wrapping the whole header?), we need to prevent default or ensure it's not a form.
// Or wait... there is a `<Link>` tag that might be wrapping the search bar?
// Looking at the snippet:
// <div className="min-h-screen bg-gray-50">
//   <Navbar />
//   {/* Map Section replacing Hero */}
// There's no Link wrapper around the map section.

// What if the autocomplete dropdown results are causing the issue?
// The dropdown results have onClick={() => {...}}. But they are NOT Links.
// They do NOT have href.

// Maybe the "opens new tab and reloads forever" is caused by a different part of the search bar?
// Does the Input have an onKeyDown handler? Let's add one to prevent form submission.

const searchInputRegex = /<Input\s+placeholder=\{t\('search\.placeholder_location'\) \|\| "Where to\?"\}\s+className="[^"]+"\s+value=\{searchQuery\}\s+onChange=\{\(e\) => \{[\s\S]*?\}\}\s+onFocus=\{\(\) => setIsSearchFocused\(true\)\}\s+onBlur=\{\(\) => setTimeout\(\(\) => setIsSearchFocused\(false\), 200\)\}\s*\/>/;

const newInput = `<Input 
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                // If they hit enter, select the first result if available
                if (filteredProperties.length > 0 && searchQuery) {
                  setSearchQuery(filteredProperties[0].location);
                  setFilteredProperties([filteredProperties[0]]);
                  setIsSearchFocused(false);
                }
              }
            }}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          />`;

if (searchInputRegex.test(content)) {
    content = content.replace(searchInputRegex, newInput);
    fs.writeFileSync(path, content);
    console.log("Added onKeyDown handler to prevent form submission and select first result.");
} else {
    console.log("Regex didn't match.");
}
