import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;

const replacement = `<div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 w-full">
                 {/* Filter Pills - Scrollable on mobile */}
                 <div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0 flex-shrink-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <div className="flex items-center gap-2 w-max pr-4 md:pr-0">
                      <Link href="/search?type=bnb">
                        <Button variant="outline" className="rounded-full px-5 bg-white border-gray-200 hover:bg-primary/5 hover:border-primary hover:text-primary shadow-sm font-medium h-10 md:h-11 text-[13px] md:text-sm whitespace-nowrap transition-colors">{t('nav.bnb')}</Button>
                      </Link>
                      <Link href="/search?type=rent">
                        <Button variant="outline" className="rounded-full px-5 bg-white border-gray-200 hover:bg-primary/5 hover:border-primary hover:text-primary shadow-sm font-medium h-10 md:h-11 text-[13px] md:text-sm whitespace-nowrap transition-colors">{t('nav.rent')}</Button>
                      </Link>
                      <Link href="/search?type=hostel">
                        <Button variant="outline" className="rounded-full px-5 bg-white border-gray-200 hover:bg-primary/5 hover:border-primary hover:text-primary shadow-sm font-medium h-10 md:h-11 text-[13px] md:text-sm whitespace-nowrap transition-colors">{t('nav.hostels')}</Button>
                      </Link>
                      <Link href="/search?type=hotel">
                        <Button variant="outline" className="rounded-full px-5 bg-white border-gray-200 hover:bg-primary/5 hover:border-primary hover:text-primary shadow-sm font-medium h-10 md:h-11 text-[13px] md:text-sm whitespace-nowrap transition-colors">{t('nav.hotels')}</Button>
                      </Link>
                      <Link href="/search?type=sale">
                        <Button variant="outline" className="rounded-full px-5 bg-white border-gray-200 hover:bg-primary/5 hover:border-primary hover:text-primary shadow-sm font-medium h-10 md:h-11 text-[13px] md:text-sm whitespace-nowrap transition-colors">{t('nav.buy')}</Button>
                      </Link>
                    </div>
                 </div>
                 
                 {/* Right Side: List Property & Search Bar */}
                 <div className="flex w-full md:w-auto items-center gap-3 ml-auto">
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

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(path, content);
    console.log("Successfully updated the filters via regex match 1");
} else {
    // Try simpler replace
    const oldStr = `              <div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full">`;
    if (content.includes(oldStr)) {
        const start = content.indexOf(oldStr);
        const endStr = `              </div>\n          </div>\n      </div>`;
        const end = content.indexOf(endStr, start);
        if (end !== -1) {
            content = content.substring(0, start) + replacement + content.substring(end);
            fs.writeFileSync(path, content);
            console.log("Successfully updated the filters via string split");
        } else {
            console.log("Failed to find end string");
        }
    } else {
        console.log("Could not find old string");
    }
}
