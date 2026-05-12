import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add Sheet imports
if (!content.includes('Sheet')) {
    content = content.replace('import { NotificationBell } from "@/components/notifications/NotificationBell";', 
    `import { NotificationBell } from "@/components/notifications/NotificationBell";\nimport { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";`);
}

// Remove isMobileMenuOpen state and menuRef
content = content.replace(/const \[isMobileMenuOpen, setIsMobileMenuOpen\] = useState\(false\);\n?/g, '');
content = content.replace(/const menuRef = useRef<HTMLElement>\(null\);\n?/g, '');

// Remove useEffect
const useEffectRegex = /useEffect\(\(\) => \{[\s\S]*?\}, \[isMobileMenuOpen\]\);\n/m;
content = content.replace(useEffectRegex, '');

// Find the <nav ref={menuRef} ... and change to <nav className="...
content = content.replace(/<nav ref=\{menuRef\} className="sticky/g, '<nav className="sticky');

// Replace the mobile button and everything after it up to </nav>
const triggerAndMenuRegex = /<Button\s+variant="outline"\s+size="icon"\s+className="lg:hidden flex items-center justify-center relative z-\[100\] cursor-pointer pointer-events-auto"[\s\S]*?<\/nav>/m;

const newMenu = `<Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="lg:hidden flex items-center justify-center"
                aria-label="Toggle menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col bg-white">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <img src="/logo.png" alt="INNDOS" className="h-8 w-auto object-contain" />
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                <Link href="/bnb">
                  <span className={\`block text-lg font-medium transition-colors hover:text-primary cursor-pointer \${location.includes('bnb') ? 'text-primary' : 'text-muted-foreground'}\`}>
                    {t('nav.bnb')}
                  </span>
                </Link>
                <div className="border-b border-gray-50 pb-2">
                  <div className="flex items-center justify-between cursor-pointer py-1" onClick={() => setIsRentExpanded(!isRentExpanded)}>
                    <span className={\`block text-lg font-medium transition-colors hover:text-primary \${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}\`}>
                      {t('nav.rent')}
                    </span>
                    <ChevronDown className={\`h-5 w-5 text-gray-400 transition-transform duration-200 \${isRentExpanded ? 'rotate-180' : ''}\`} />
                  </div>
                  
                  {isRentExpanded && (
                    <div className="pl-4 mt-3 flex flex-col gap-3 border-l-2 border-primary/20 ml-2 animate-in slide-in-from-top-2 duration-200">
                      <Link href="/search?type=rent">
                        <span className="block text-base font-medium text-gray-700 hover:text-primary">All Rentals</span>
                      </Link>
                      <Link href="/search?type=rent-business">
                        <span className="block text-base text-gray-600 hover:text-primary">Business Spaces</span>
                      </Link>
                      <Link href="/search?type=rent-godown">
                        <span className="block text-base text-gray-600 hover:text-primary">Godowns</span>
                      </Link>
                      <Link href="/search?type=rent-stall">
                        <span className="block text-base text-gray-600 hover:text-primary">Stalls</span>
                      </Link>
                      <Link href="/search?type=rent-shop">
                        <span className="block text-base text-gray-600 hover:text-primary">Shops</span>
                      </Link>
                    </div>
                  )}
                </div>
                <Link href="/search?type=hostel">
                  <span className={\`block text-lg font-medium transition-colors hover:text-primary cursor-pointer \${location.includes('hostel') ? 'text-primary' : 'text-muted-foreground'}\`}>
                    {t('nav.hostels')}
                  </span>
                </Link>
                <Link href="/search?type=hotel">
                  <span className={\`block text-lg font-medium transition-colors hover:text-primary cursor-pointer \${location.includes('hotel') ? 'text-primary' : 'text-muted-foreground'}\`}>
                    {t('nav.hotels')}
                  </span>
                </Link>
                <Link href="/search?type=sale">
                  <span className={\`block text-lg font-medium transition-colors hover:text-primary cursor-pointer \${location.includes('sale') ? 'text-primary' : 'text-muted-foreground'}\`}>
                    {t('nav.buy')}
                  </span>
                </Link>
                
                <div className="h-px bg-gray-100 my-2" />
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-medium text-gray-500">Language</span>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="h-10 w-[120px] text-sm border border-gray-200 rounded-md px-3 bg-white outline-none focus:ring-2 focus:ring-primary appearance-none"
                    style={{ WebkitAppearance: 'none' }}
                  >
                    <option value="EN">🇺🇸 EN</option>
                    <option value="FR">🇫🇷 FR</option>
                    <option value="DE">🇩🇪 DE</option>
                  </select>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-base font-medium text-gray-500">Currency</span>
                  <select 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="h-10 w-[120px] text-sm border border-gray-200 rounded-md px-3 bg-white outline-none focus:ring-2 focus:ring-primary appearance-none"
                    style={{ WebkitAppearance: 'none' }}
                  >
                    <option value="KES">KES</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                {user ? (
                  <>
                    <Link href="/dashboard">
                      <span className={\`block text-lg font-medium transition-colors hover:text-primary cursor-pointer \${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}\`}>
                        {t('nav.dashboard')}
                      </span>
                    </Link>
                    <Link href="/add-listing">
                      <Button variant="ghost" className="w-full justify-start gap-2 text-primary px-0 hover:bg-transparent text-lg h-auto py-2">
                        <PlusCircle className="h-5 w-5" />
                        {t('nav.list_property')}
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2 h-12 text-lg mt-2"
                      onClick={() => logout()}
                    >
                      <LogOut className="h-5 w-5" />
                      {t('nav.signout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login?role=owner">
                      <Button variant="ghost" className="w-full justify-start gap-2 text-primary px-0 hover:bg-transparent text-lg h-auto py-2">
                        <PlusCircle className="h-5 w-5" />
                        {t('nav.list_property')}
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button variant="outline" className="w-full justify-start gap-2 h-12 text-lg mt-2">
                        <UserCircle className="h-5 w-5" />
                        {t('nav.signin')}
                      </Button>
                    </Link>
                    <Link href="/login?signup=true">
                      <Button className="w-full justify-start gap-2 bg-black hover:bg-gray-800 text-white h-12 text-lg">
                        {t('nav.signup')}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>`;

if (triggerAndMenuRegex.test(content)) {
    content = content.replace(triggerAndMenuRegex, newMenu);
    fs.writeFileSync(path, content);
    console.log("Navbar updated with Sheet successfully.");
} else {
    // If exact regex fails, try a simpler replace
    const fallbackRegex = /<Button \n            variant="outline" \n            size="icon" \n            className="lg:hidden flex items-center justify-center relative z-\[100\] cursor-pointer pointer-events-auto"[\s\S]*?<\/nav>/m;
    
    if (fallbackRegex.test(content)) {
        content = content.replace(fallbackRegex, newMenu);
        fs.writeFileSync(path, content);
        console.log("Navbar updated with Sheet using fallback regex.");
    } else {
        console.log("Could not find the target string. The Regex failed. Looking for Button start");
        const buttonStart = content.indexOf('<Button \n            variant="outline" \n            size="icon" \n            className="lg:hidden flex');
        if (buttonStart !== -1) {
            content = content.substring(0, buttonStart) + newMenu;
            fs.writeFileSync(path, content);
            console.log("Navbar updated with substring replacement.");
        } else {
            console.log("Could not even find the button start.");
        }
    }
}
