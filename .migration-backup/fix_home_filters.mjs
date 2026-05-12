import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldBlock = `              <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                 {/* Filter Pills */}
                 <div className="grid grid-cols-5 gap-2 pb-2 w-full md:flex md:flex-wrap md:justify-between md:gap-3">
                    <Link href="/search?type=bnb" className="block w-full">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[11px] sm:text-[13px] md:text-sm whitespace-nowrap">{t('nav.bnb')}</Button>
                    </Link>
                    <Link href="/search?type=rent" className="block w-full">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[11px] sm:text-[13px] md:text-sm whitespace-nowrap">{t('nav.rent')}</Button>
                    </Link>
                    <Link href="/search?type=hostel" className="block w-full">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[11px] sm:text-[13px] md:text-sm whitespace-nowrap">{t('nav.hostels')}</Button>
                    </Link>
                    <Link href="/search?type=hotel" className="block w-full">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[11px] sm:text-[13px] md:text-sm whitespace-nowrap">{t('nav.hotels')}</Button>
                    </Link>
                    <Link href="/search?type=sale" className="block w-full">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[11px] sm:text-[13px] md:text-sm whitespace-nowrap">{t('nav.buy')}</Button>
                    </Link>
                    <Link href="/add-listing" className="hidden lg:block flex-shrink-0">
                      <Button className="rounded-full px-6 bg-gray-900 text-white hover:bg-gray-800 border-none shadow-sm font-medium h-12 text-sm">{t('nav.list_property')}</Button>
                    </Link>
                 </div>
                 
                 {/* Search Bar */}
                 <div className="relative flex-grow w-full md:w-auto">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <Input 
                      placeholder={t('home.search_placeholder')} 
                      className="h-12 pl-11 rounded-full border-gray-200 bg-gray-50 hover:bg-white focus:bg-white shadow-sm text-base w-full transition-all" 
                    />
                 </div>
              </div>`;

const newBlock = `              <div className="flex flex-col lg:flex-row items-center gap-4 mb-6 w-full">
                 {/* Filter Pills */}
                 <div className="grid grid-cols-5 gap-2 pb-2 w-full lg:w-auto lg:flex lg:flex-nowrap lg:gap-3 flex-shrink-0">
                    <Link href="/search?type=bnb" className="w-full lg:w-auto block">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 lg:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 lg:h-12 text-[11px] sm:text-[13px] lg:text-sm whitespace-nowrap">{t('nav.bnb')}</Button>
                    </Link>
                    <Link href="/search?type=rent" className="w-full lg:w-auto block">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 lg:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 lg:h-12 text-[11px] sm:text-[13px] lg:text-sm whitespace-nowrap">{t('nav.rent')}</Button>
                    </Link>
                    <Link href="/search?type=hostel" className="w-full lg:w-auto block">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 lg:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 lg:h-12 text-[11px] sm:text-[13px] lg:text-sm whitespace-nowrap">{t('nav.hostels')}</Button>
                    </Link>
                    <Link href="/search?type=hotel" className="w-full lg:w-auto block">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 lg:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 lg:h-12 text-[11px] sm:text-[13px] lg:text-sm whitespace-nowrap">{t('nav.hotels')}</Button>
                    </Link>
                    <Link href="/search?type=sale" className="w-full lg:w-auto block">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 lg:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 lg:h-12 text-[11px] sm:text-[13px] lg:text-sm whitespace-nowrap">{t('nav.buy')}</Button>
                    </Link>
                 </div>
                 
                 <div className="hidden xl:block flex-shrink-0">
                    <Link href="/add-listing">
                      <Button className="rounded-full px-6 bg-gray-900 text-white hover:bg-gray-800 border-none shadow-sm font-medium h-12 text-sm">{t('nav.list_property')}</Button>
                    </Link>
                 </div>

                 {/* Search Bar */}
                 <div className="relative flex-grow w-full max-w-2xl ml-auto">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <Input 
                      placeholder={t('home.search_placeholder')} 
                      className="h-12 pl-11 rounded-full border-gray-200 bg-gray-50 hover:bg-white focus:bg-white shadow-sm text-base w-full transition-all" 
                    />
                 </div>
              </div>`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(path, content);
  console.log("Successfully fixed Home filters responsiveness");
} else {
  console.log("Could not find the exact old block, attempting targeted regex replacement...");
  
  // Alternative replacement if exact string match fails
  const replaced = content.replace(/<div className="flex flex-col md:flex-row items-center gap-4 mb-6">[\s\S]*?<\/div>\s*<\/div>/, newBlock);
  if (replaced !== content) {
      fs.writeFileSync(path, replaced);
      console.log("Successfully fixed Home filters responsiveness via regex");
  } else {
      console.log("Failed to replace block");
  }
}
