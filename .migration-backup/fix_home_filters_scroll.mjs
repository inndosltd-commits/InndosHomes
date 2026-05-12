import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// I need to add CSS for hiding the scrollbar specifically or use standard tailwind classes
// Also I should ensure the flex layout allows horizontal scrolling of the pills but keeps the search bar accessible
// The current replacement looks like this:
const oldBlockRegex = /<div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;

const newBlock = `<div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 w-full">
                 {/* Filter Pills - Scrollable on mobile */}
                 <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 flex-shrink-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <div className="flex items-center gap-2 md:gap-3 w-max">
                      <Link href="/search?type=bnb">
                        <Button variant="outline" className="rounded-full px-4 sm:px-5 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-11 text-[13px] md:text-sm whitespace-nowrap">{t('nav.bnb')}</Button>
                      </Link>
                      <Link href="/search?type=rent">
                        <Button variant="outline" className="rounded-full px-4 sm:px-5 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-11 text-[13px] md:text-sm whitespace-nowrap">{t('nav.rent')}</Button>
                      </Link>
                      <Link href="/search?type=hostel">
                        <Button variant="outline" className="rounded-full px-4 sm:px-5 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-11 text-[13px] md:text-sm whitespace-nowrap">{t('nav.hostels')}</Button>
                      </Link>
                      <Link href="/search?type=hotel">
                        <Button variant="outline" className="rounded-full px-4 sm:px-5 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-11 text-[13px] md:text-sm whitespace-nowrap">{t('nav.hotels')}</Button>
                      </Link>
                      <Link href="/search?type=sale">
                        <Button variant="outline" className="rounded-full px-4 sm:px-5 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-11 text-[13px] md:text-sm whitespace-nowrap">{t('nav.buy')}</Button>
                      </Link>
                    </div>
                 </div>
                 
                 {/* Right Side: List Property & Search Bar */}
                 <div className="flex w-full md:w-auto items-center gap-3">
                    <Link href="/add-listing" className="hidden lg:block">
                      <Button className="rounded-full px-6 bg-gray-900 text-white hover:bg-gray-800 border-none shadow-sm font-medium h-11 text-sm whitespace-nowrap">{t('nav.list_property')}</Button>
                    </Link>
                    <div className="relative w-full md:w-64 lg:w-80 flex-shrink-0">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        placeholder={t('home.search_placeholder')} 
                        className="h-10 md:h-11 pl-10 rounded-full border-gray-200 bg-gray-50 hover:bg-white focus:bg-white shadow-sm text-[13px] md:text-sm w-full transition-all" 
                      />
                    </div>
                 </div>
              </div>`;

// Use fallback match since it's more reliable
const fallbackRegex = /<div className="bg-white pt-4 pb-0">[\s\S]*?\{ \/\* Map Section replacing Hero \*\/\}/;
const fallbackNew = `<div className="bg-white pt-4 pb-0 border-b border-gray-100">
          <div className="container mx-auto px-4">
              ${newBlock}
          </div>
      </div>

      {/* Map Section replacing Hero */}`;

if (fallbackRegex.test(content)) {
    content = content.replace(fallbackRegex, fallbackNew);
    
    // Add global CSS for hiding scrollbar to index.css if not there
    let cssContent = fs.readFileSync('client/src/index.css', 'utf8');
    if (!cssContent.includes('.no-scrollbar')) {
        cssContent += `\n\n/* Hide scrollbar for Chrome, Safari and Opera */\n.no-scrollbar::-webkit-scrollbar {\n  display: none;\n}\n\n/* Hide scrollbar for IE, Edge and Firefox */\n.no-scrollbar {\n  -ms-overflow-style: none;  /* IE and Edge */\n  scrollbar-width: none;  /* Firefox */\n}\n`;
        fs.writeFileSync('client/src/index.css', cssContent);
    }
    
    fs.writeFileSync(path, content);
    console.log("Replaced filter pills using fallback regex and improved scrolling.");
} else {
    console.log("Fallback failed.");
}
