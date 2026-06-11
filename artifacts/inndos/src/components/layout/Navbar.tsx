import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { UserCircle, Menu, PlusCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/lib/language";
import { useState, useRef, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { MobileTopNav } from "./MobileTopNav";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage, t } = useLanguage();
  const [navHash, setNavHash] = useState(window.location.hash);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("nav-menu-change", { detail: isMenuOpen }));
  }, [isMenuOpen]);
  useEffect(() => {
    const handler = () => setNavHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navHashParts = navHash.split("?");
  const navType = navHashParts.length > 1
    ? new URLSearchParams(navHashParts[1]).get("type")
    : null;
  
  
  return (
    <>
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Neotech', sans-serif" }}>inndos</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          <Link href="/bnb">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer whitespace-nowrap pb-1 ${location === '/bnb' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
              {t('nav.bnb')}
            </span>
          </Link>
          <div className="relative group cursor-pointer">
            <Link href="/search?type=rent">
              <span className={`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap pb-1 ${location === '/search' && navType?.startsWith('rent') ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
                {t('nav.rent')}
              </span>
            </Link>
            <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[500] py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Apartments</div>
              <Link href="/search?type=rent&filter=studio">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Studio / Bedsitter</div>
              </Link>
              <Link href="/search?type=rent&filter=bedrooms">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">By Bedrooms</div>
              </Link>
              <Link href="/search?type=rent&filter=penthouse">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Penthouse</div>
              </Link>
              <Link href="/search?type=rent&filter=own-compound">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Own Compound</div>
              </Link>
              <Link href="/search?type=rent&filter=condominium">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Condominiums</div>
              </Link>
              <div className="h-px bg-gray-100 my-1" />
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Commercial</div>
              <Link href="/search?type=rent-business">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Business Spaces</div>
              </Link>
              <Link href="/search?type=rent-godown">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Godowns</div>
              </Link>
              <Link href="/search?type=rent-stall">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Stalls</div>
              </Link>
              <Link href="/search?type=rent-shop">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Shops</div>
              </Link>
            </div>
          </div>
          <Link href="/search?type=hostel">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer whitespace-nowrap pb-1 ${location === '/search' && navType === 'hostel' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
              {t('nav.hostels')}
            </span>
          </Link>
          <Link href="/search?type=hotel">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer whitespace-nowrap pb-1 ${location === '/search' && navType === 'hotel' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
              {t('nav.hotels')}
            </span>
          </Link>
          <div className="relative group cursor-pointer">
            <Link href="/search?type=sale">
              <span className={`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap pb-1 ${location === '/search' && navType === 'sale' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
                {t('nav.buy')}
              </span>
            </Link>
            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[500] py-2">
              <Link href="/search?type=sale&category=apartments">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Apartments</div>
              </Link>
              <Link href="/search?type=sale&category=homes">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Homes</div>
              </Link>
              <Link href="/search?type=sale&category=lands">
                <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Lands</div>
              </Link>
            </div>
          </div>
          {user && (
            <Link href="/dashboard">
              <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer whitespace-nowrap ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
                {t('nav.dashboard')}
              </span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden lg:flex gap-2">
            <div className="w-[85px] xl:w-[95px]">
              <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                <SelectTrigger className="h-9 text-xs border-gray-200 rounded-full bg-white shadow-sm hover:bg-gray-50 transition-colors">
                  <SelectValue placeholder="Lang" />
                </SelectTrigger>
                <SelectContent className="z-[500]">
                  <SelectItem value="EN">🇺🇸 EN</SelectItem>
                  <SelectItem value="FR">🇫🇷 FR</SelectItem>
                  <SelectItem value="DE">🇩🇪 DE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[85px] xl:w-[90px]">
              <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                <SelectTrigger className="h-9 text-xs border-gray-200 rounded-full bg-white shadow-sm hover:bg-gray-50 transition-colors">
                  <SelectValue placeholder="Cur" />
                </SelectTrigger>
                <SelectContent className="z-[500]">
                  <SelectItem value="KES">KES</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Link href={user ? "/add-listing" : "/login?role=owner"} className="hidden lg:block">
            <Button variant="ghost" size="sm" className="gap-2 text-black font-medium hover:bg-gray-100 rounded-full px-3 xl:px-4 h-9">
              <PlusCircle className="h-4 w-4" />
              <span>{t('nav.list_property')}</span>
            </Button>
          </Link>

          <NotificationBell />

          {user ? (
            <>
              <span className="hidden lg:inline text-sm font-medium text-muted-foreground whitespace-nowrap">
                Hi, {user.name.split(' ')[0]}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden lg:flex gap-2 rounded-full h-9"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden xl:inline">{t('nav.signout')}</span>
              </Button>
            </>
          ) : (
            <div className="hidden lg:flex gap-2">
              <Link href="/login">
                <Button variant="outline" className="gap-2 rounded-full h-9 shadow-sm text-black px-3 xl:px-4">
                  <UserCircle className="h-4 w-4 hidden xl:block" />
                  {t('nav.signin')}
                </Button>
              </Link>
              <Link href="/login?signup=true">
                <Button className="gap-2 bg-black text-white hover:bg-gray-800 rounded-full h-9 shadow-sm px-3 xl:px-4">
                  {t('nav.signup')}
                </Button>
              </Link>
            </div>
          )}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
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
              <div
                className="p-4 border-b border-gray-100 flex items-center gap-3 cursor-pointer"
                onClick={() => { setIsMenuOpen(false); window.location.hash = "/"; }}
              >
                <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Neotech', sans-serif" }}>inndos</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
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
                      <span className={`block text-lg font-medium transition-colors hover:text-primary cursor-pointer ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
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
    </nav>
    <MobileTopNav />
    </>
  );
}
