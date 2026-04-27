import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldBlockRegex = /<div className="flex flex-col lg:flex-row items-center gap-4 mb-6 w-full">[\s\S]*?<\/div>\s*<\/div>/;

const newBlock = `<div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full">
                 {/* Filter Pills - Scrollable on mobile */}
                 <div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0 flex-shrink-0">
                    <div className="flex items-center gap-2 md:gap-3 w-max">
                      <Link href="/search?type=bnb">
                        <Button variant="outline" className="rounded-full px-5 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[13px] md:text-sm whitespace-nowrap">{t('nav.bnb')}</Button>
                      </Link>
                      <Link href="/search?type=rent">
                        <Button variant="outline" className="rounded-full px-5 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[13px] md:text-sm whitespace-nowrap">{t('nav.rent')}</Button>
                      </Link>
                      <Link href="/search?type=hostel">
                        <Button variant="outline" className="rounded-full px-5 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[13px] md:text-sm whitespace-nowrap">{t('nav.hostels')}</Button>
                      </Link>
                      <Link href="/search?type=hotel">
                        <Button variant="outline" className="rounded-full px-5 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[13px] md:text-sm whitespace-nowrap">{t('nav.hotels')}</Button>
                      </Link>
                      <Link href="/search?type=sale">
                        <Button variant="outline" className="rounded-full px-5 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[13px] md:text-sm whitespace-nowrap">{t('nav.buy')}</Button>
                      </Link>
                      <Link href="/add-listing" className="hidden lg:block ml-2">
                        <Button className="rounded-full px-6 bg-gray-900 text-white hover:bg-gray-800 border-none shadow-sm font-medium h-10 md:h-12 text-[13px] md:text-sm whitespace-nowrap">{t('nav.list_property')}</Button>
                      </Link>
                    </div>
                 </div>
                 
                 {/* Search Bar */}
                 <div className="relative w-full flex-grow md:max-w-md lg:max-w-xl ml-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input 
                      placeholder={t('home.search_placeholder')} 
                      className="h-10 md:h-12 pl-11 rounded-full border-gray-200 bg-gray-50 hover:bg-white focus:bg-white shadow-sm text-[13px] md:text-base w-full transition-all" 
                    />
                 </div>
              </div>`;

if (oldBlockRegex.test(content)) {
  content = content.replace(oldBlockRegex, newBlock);
  fs.writeFileSync(path, content);
  console.log("Replaced filter pills layout successfully.");
} else {
  console.log("Could not match the old block regex. Let's do a fallback replacement.");
  // Fallback: match from `<div className="bg-white pt-4 pb-0">` up to Map Section
  const fallbackRegex = /<div className="bg-white pt-4 pb-0">[\s\S]*?\{ \/\* Map Section replacing Hero \*\/\}/;
  const fallbackNew = `<div className="bg-white pt-4 pb-0">
          <div className="container mx-auto px-4">
              ${newBlock}
          </div>
      </div>

      {/* Map Section replacing Hero */}`;
  
  if (fallbackRegex.test(content)) {
      content = content.replace(fallbackRegex, fallbackNew);
      fs.writeFileSync(path, content);
      console.log("Replaced filter pills using fallback regex.");
  } else {
      console.log("Fallback failed as well.");
  }
}
