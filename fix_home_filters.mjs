import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldString = `                 {/* Filter Pills */}
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide justify-start w-full md:flex-wrap md:overflow-visible">
                    <Link href="/search?type=bnb" className="flex-shrink-0">
                      <Button variant="outline" className="rounded-full px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-9 md:h-12 text-[13px] md:text-sm">{t('nav.bnb')}</Button>
                    </Link>
                    <Link href="/search?type=rent" className="flex-shrink-0">
                      <Button variant="outline" className="rounded-full px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-9 md:h-12 text-[13px] md:text-sm">{t('nav.rent')}</Button>
                    </Link>
                    <Link href="/search?type=hostel" className="flex-shrink-0">
                      <Button variant="outline" className="rounded-full px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-9 md:h-12 text-[13px] md:text-sm">{t('nav.hostels')}</Button>
                    </Link>
                    <Link href="/search?type=hotel" className="flex-shrink-0">
                      <Button variant="outline" className="rounded-full px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-9 md:h-12 text-[13px] md:text-sm">{t('nav.hotels')}</Button>
                    </Link>
                    <Link href="/search?type=sale" className="flex-shrink-0">
                      <Button variant="outline" className="rounded-full px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-9 md:h-12 text-[13px] md:text-sm">{t('nav.buy')}</Button>
                    </Link>
                    <Link href="/add-listing" className="hidden md:block flex-shrink-0">
                      <Button className="rounded-full px-6 bg-gray-900 text-white hover:bg-gray-800 border-none shadow-sm font-medium h-12 text-sm">{t('nav.list_property')}</Button>
                    </Link>
                 </div>`;

const newString = `                 {/* Filter Pills */}
                 <div className="flex gap-1.5 sm:gap-2 pb-2 justify-between w-full md:flex-wrap">
                    <Link href="/search?type=bnb" className="block flex-1 min-w-0">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[11px] sm:text-[13px] md:text-sm whitespace-nowrap">{t('nav.bnb')}</Button>
                    </Link>
                    <Link href="/search?type=rent" className="block flex-1 min-w-0">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[11px] sm:text-[13px] md:text-sm whitespace-nowrap">{t('nav.rent')}</Button>
                    </Link>
                    <Link href="/search?type=hostel" className="block flex-1 min-w-0">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[11px] sm:text-[13px] md:text-sm whitespace-nowrap">{t('nav.hostels')}</Button>
                    </Link>
                    <Link href="/search?type=hotel" className="block flex-1 min-w-0">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[11px] sm:text-[13px] md:text-sm whitespace-nowrap">{t('nav.hotels')}</Button>
                    </Link>
                    <Link href="/search?type=sale" className="block flex-1 min-w-0">
                      <Button variant="outline" className="w-full rounded-full px-0 sm:px-3 md:px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-10 md:h-12 text-[11px] sm:text-[13px] md:text-sm whitespace-nowrap">{t('nav.buy')}</Button>
                    </Link>
                    <Link href="/add-listing" className="hidden lg:block flex-shrink-0">
                      <Button className="rounded-full px-6 bg-gray-900 text-white hover:bg-gray-800 border-none shadow-sm font-medium h-12 text-sm">{t('nav.list_property')}</Button>
                    </Link>
                 </div>`;

content = content.replace(oldString, newString);
fs.writeFileSync(path, content);
console.log('Updated Home.tsx filters');
