import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { UserCircle, Menu, PlusCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/lib/language";
import { useState, useRef, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      // Ignore clicks on Radix UI portals (like Select dropdowns)
      const target = event.target as Element;
      if (target.closest('[data-radix-portal]')) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
    
    // function handleScroll() {
    //   if (isMobileMenuOpen) {
    //     setIsMobileMenuOpen(false);
    //   }
    // }
    
    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      // window.addEventListener("scroll", handleScroll, { passive: true });
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      // window.removeEventListener("scroll", handleScroll);
    };
  }, [isMobileMenuOpen]);

  return (
    <nav ref={menuRef} className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer group">
            <img 
              src="/logo.png" 
              alt="INNDOS" 
              className="h-8 w-auto object-contain" 
            />
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          <Link href="/bnb">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer whitespace-nowrap ${location.includes('bnb') ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('nav.bnb')}
            </span>
          </Link>
          <div className="relative group cursor-pointer">
            <Link href="/search?type=rent">
              <span className={`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}`}>
                {t('nav.rent')}
              </span>
            </Link>
            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
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
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer whitespace-nowrap ${location.includes('hostel') ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('nav.hostels')}
            </span>
          </Link>
          <Link href="/search?type=hotel">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer whitespace-nowrap ${location.includes('hotel') ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('nav.hotels')}
            </span>
          </Link>
          <Link href="/search?type=sale">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer whitespace-nowrap ${location.includes('sale') ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('nav.buy')}
            </span>
          </Link>
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
                <SelectContent>
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
                <SelectContent>
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
          <Button 
            variant="outline" 
            size="icon" 
            className="lg:hidden flex items-center justify-center relative z-[100] cursor-pointer pointer-events-auto"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t bg-white absolute top-20 left-0 w-full shadow-2xl flex flex-col p-4 gap-4 z-[90]">
          <Link href="/bnb" onClick={() => setIsMobileMenuOpen(false)}>
            <span className={`block text-lg font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('bnb') ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('nav.bnb')}
            </span>
          </Link>
          <div>
            <Link href="/search?type=rent" onClick={() => setIsMobileMenuOpen(false)}>
              <span className={`block text-lg font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}`}>
                {t('nav.rent')}
              </span>
            </Link>
            <div className="pl-4 mt-2 flex flex-col gap-2 border-l-2 border-gray-100 ml-2">
              <Link href="/search?type=rent-business" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="block text-base text-gray-600 hover:text-primary">Business Spaces</span>
              </Link>
              <Link href="/search?type=rent-godown" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="block text-base text-gray-600 hover:text-primary">Godowns</span>
              </Link>
              <Link href="/search?type=rent-stall" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="block text-base text-gray-600 hover:text-primary">Stalls</span>
              </Link>
              <Link href="/search?type=rent-shop" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="block text-base text-gray-600 hover:text-primary">Shops</span>
              </Link>
            </div>
          </div>
          <Link href="/search?type=hostel" onClick={() => setIsMobileMenuOpen(false)}>
            <span className={`block text-lg font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('hostel') ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('nav.hostels')}
            </span>
          </Link>
          <Link href="/search?type=hotel" onClick={() => setIsMobileMenuOpen(false)}>
            <span className={`block text-lg font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('hotel') ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('nav.hotels')}
            </span>
          </Link>
          <Link href="/search?type=sale" onClick={() => setIsMobileMenuOpen(false)}>
            <span className={`block text-lg font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('sale') ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('nav.buy')}
            </span>
          </Link>
          
          <div className="h-px bg-gray-100 my-2" />
          
          <div className="flex items-center justify-between mb-2">
             <span className="text-base font-medium text-gray-500">Language</span>
             <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
               <SelectTrigger className="h-10 w-[120px] text-sm border-gray-200">
                 <SelectValue placeholder="Lang" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="EN">🇺🇸 EN</SelectItem>
                 <SelectItem value="FR">🇫🇷 FR</SelectItem>
                 <SelectItem value="DE">🇩🇪 DE</SelectItem>
               </SelectContent>
             </Select>
          </div>

          <div className="flex items-center justify-between mb-4">
             <span className="text-base font-medium text-gray-500">Currency</span>
             <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
               <SelectTrigger className="h-10 w-[120px] text-sm border-gray-200">
                 <SelectValue placeholder="Currency" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="KES">KES</SelectItem>
                 <SelectItem value="USD">USD</SelectItem>
                 <SelectItem value="EUR">EUR</SelectItem>
                 <SelectItem value="GBP">GBP</SelectItem>
               </SelectContent>
             </Select>
          </div>

          {user ? (
            <>
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <span className={`block text-lg font-medium transition-colors hover:text-primary cursor-pointer ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
                  {t('nav.dashboard')}
                </span>
              </Link>
              <Link href="/add-listing" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2 text-primary px-0 hover:bg-transparent text-lg h-auto py-2">
                  <PlusCircle className="h-5 w-5" />
                  {t('nav.list_property')}
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 h-12 text-lg mt-2"
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
              >
                <LogOut className="h-5 w-5" />
                {t('nav.signout')}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login?role=owner" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2 text-primary px-0 hover:bg-transparent text-lg h-auto py-2">
                  <PlusCircle className="h-5 w-5" />
                  {t('nav.list_property')}
                </Button>
              </Link>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2 h-12 text-lg mt-2">
                  <UserCircle className="h-5 w-5" />
                  {t('nav.signin')}
                </Button>
              </Link>
              <Link href="/login?signup=true" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 h-12 text-lg">
                  {t('nav.signup')}
                </Button>
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
