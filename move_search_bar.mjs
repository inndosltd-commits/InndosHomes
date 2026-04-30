import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// The goal is to move the Search Bar *inside* the map area, floating over it, without blocking the map interactions (so it needs pointer-events-auto while its container might have pointer-events-none if it covers the whole map).
// From the screenshot, the search bar is currently taking up a white block above the map.
// Let's remove the white block above the map and place the search bar inside the map section.

const searchBarBlockRegex = /<div className="bg-white pt-4 pb-0">[\s\S]*?\{\/\*\s*Search Bar\s*\*\/\}\s*<div className="flex w-full items-center justify-center py-2">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;

const searchBarHtml = `
      {/* Floating Search Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] w-full max-w-2xl px-4 pointer-events-none">
        <div className="relative w-full pointer-events-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <Input 
            placeholder={t('search.placeholder_location') || "Search locations..."} 
            className="w-full pl-12 pr-4 h-14 bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-lg rounded-full focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
          />
        </div>
      </div>`;

if (searchBarBlockRegex.test(content)) {
    // Remove the search bar block from above the map
    content = content.replace(searchBarBlockRegex, '');
    
    // Now we need to insert the floating search bar inside the Map Section
    const mapSectionStartRegex = /\{\/\*\s*Map Section replacing Hero\s*\*\/\}\s*<section className="relative h-\[70vh\] w-full bg-gray-100 border-t">/;
    
    if (mapSectionStartRegex.test(content)) {
        content = content.replace(mapSectionStartRegex, `{/* Map Section replacing Hero */}\n      <section className="relative h-[70vh] w-full bg-gray-100 border-t">\n${searchBarHtml}`);
        fs.writeFileSync(path, content);
        console.log("Moved search bar to float inside the map area.");
    } else {
        console.log("Could not find Map Section start.");
    }
} else {
    console.log("Could not find the Search Bar block to remove.");
}
