import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// I can see the problem now. The replacement string `replacement` from my previous script replaced:
// regex = /<div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
// Let's count the divs in that old string that was matched by regex:
// 1. <div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full">
// ...
// </div>
// </div>
// </div>
// </div>
// That's 4 closing divs.
// But my `replacement` string only has 1 outer `div` and its children, and it only closes the `flex flex-col md:flex-row` div!
// It did NOT include the closing tags for `<div className="container mx-auto px-4">` and `<div className="bg-white pt-4 pb-0">`!

// So I need to add those two closing divs back exactly after the `</div>` of the `flex flex-col md:flex-row` container.
// Let's look for:
/*
                 {/* Right Side: List Property & Search Bar *\/}
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
              </div>
*/

const targetToReplace = `                 </div>
              </div>

      {/* Map Section replacing Hero */}`;

const replacementStr = `                 </div>
              </div>
          </div>
      </div>

      {/* Map Section replacing Hero */}`;

if (content.includes(targetToReplace)) {
    content = content.replace(targetToReplace, replacementStr);
    fs.writeFileSync(path, content);
    console.log("Successfully fixed the missing closing divs!");
} else {
    // Let's try regex if exact string is slightly different due to whitespace
    const regexFix = /                 <\/div>\s*<\/div>\s*\{\/\* Map Section replacing Hero \*\/\}/;
    if (regexFix.test(content)) {
        content = content.replace(regexFix, `                 </div>\n              </div>\n          </div>\n      </div>\n\n      {/* Map Section replacing Hero */}`);
        fs.writeFileSync(path, content);
        console.log("Successfully fixed the missing closing divs via regex!");
    } else {
        console.log("Could not find the target string to fix.");
    }
}
