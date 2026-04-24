import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { UserCircle, Menu, PlusCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/lib/language";
import { useState, useRef, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
    
    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
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

        <div className="hidden md:flex items-center gap-8">
          <Link href="/search?type=rent">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}`}>
              Rent
            </span>
          </Link>
          <Link href="/search?type=sale">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('sale') ? 'text-primary' : 'text-muted-foreground'}`}>
              Buy
            </span>
          </Link>
          <Link href="/bnb">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('bnb') ? 'text-primary' : 'text-muted-foreground'}`}>
              B&B
            </span>
          </Link>
          <Link href="/search?type=hotel">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('hotel') ? 'text-primary' : 'text-muted-foreground'}`}>
              Hotels
            </span>
          </Link>
          {user && (
            <Link href="/dashboard">
              <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
                Dashboard
              </span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex gap-2">
            <div className="w-[95px]">
              <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                <SelectTrigger className="h-9 text-xs border-gray-200 rounded-full bg-white shadow-sm hover:bg-gray-50 transition-colors">
                  <SelectValue placeholder="Lang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">🇺🇸 EN</SelectItem>
                  <SelectItem value="SW">🇰🇪 SW</SelectItem>
                  <SelectItem value="FR">🇫🇷 FR</SelectItem>
                  <SelectItem value="ZH">🇨🇳 ZH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[90px]">
              <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                <SelectTrigger className="h-9 text-xs border-gray-200 rounded-full bg-white shadow-sm hover:bg-gray-50 transition-colors">
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
          </div>

          <Link href={user ? "/dashboard" : "/login?role=owner"}>
            <Button variant="ghost" size="sm" className="hidden md:flex gap-2 text-black font-medium hover:bg-gray-100 rounded-full px-4 h-9">
              <PlusCircle className="h-4 w-4" />
              List Property
            </Button>
          </Link>

          {user ? (
            <>
              <span className="hidden md:inline text-sm font-medium text-muted-foreground">
                Hi, {user.name.split(' ')[0]}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden md:flex gap-2 rounded-full h-9"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <div className="hidden md:flex gap-2">
              <Link href="/login">
                <Button variant="outline" className="gap-2 rounded-full h-9 shadow-sm text-black">
                  <UserCircle className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
              <Link href="/login?signup=true">
                <Button className="gap-2 bg-black text-white hover:bg-gray-800 rounded-full h-9 shadow-sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
          <Button 
            variant="outline" 
            size="icon" 
            className="md:hidden flex items-center justify-center relative z-[100] cursor-pointer pointer-events-auto"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-white absolute top-20 left-0 w-full shadow-2xl flex flex-col p-4 gap-4 z-[90]">
          <Link href="/search?type=rent" onClick={() => setIsMobileMenuOpen(false)}>
            <span className={`block text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}`}>
              Rent
            </span>
          </Link>
          <Link href="/search?type=sale" onClick={() => setIsMobileMenuOpen(false)}>
            <span className={`block text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('sale') ? 'text-primary' : 'text-muted-foreground'}`}>
              Buy
            </span>
          </Link>
          <Link href="/bnb" onClick={() => setIsMobileMenuOpen(false)}>
            <span className={`block text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('bnb') ? 'text-primary' : 'text-muted-foreground'}`}>
              B&B
            </span>
          </Link>
          <Link href="/search?type=hotel" onClick={() => setIsMobileMenuOpen(false)}>
            <span className={`block text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('hotel') ? 'text-primary' : 'text-muted-foreground'}`}>
              Hotels
            </span>
          </Link>
          
          <div className="h-px bg-gray-100 my-2" />
          
          <div className="flex items-center justify-between mb-2">
             <span className="text-sm font-medium text-gray-500">Language</span>
             <Select value={language} onValueChange={(v: any) => { setLanguage(v); setIsMobileMenuOpen(false); }}>
               <SelectTrigger className="h-8 w-[100px] text-xs border-gray-200">
                 <SelectValue placeholder="Lang" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="EN">🇺🇸 EN</SelectItem>
                 <SelectItem value="SW">🇰🇪 SW</SelectItem>
                 <SelectItem value="FR">🇫🇷 FR</SelectItem>
                 <SelectItem value="ZH">🇨🇳 ZH</SelectItem>
               </SelectContent>
             </Select>
          </div>

          <div className="flex items-center justify-between mb-4">
             <span className="text-sm font-medium text-gray-500">Currency</span>
             <Select value={currency} onValueChange={(v: any) => { setCurrency(v); setIsMobileMenuOpen(false); }}>
               <SelectTrigger className="h-8 w-[100px] text-xs border-gray-200">
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
                <span className={`block text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
                  Dashboard
                </span>
              </Link>
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2 text-primary px-0 hover:bg-transparent">
                  <PlusCircle className="h-4 w-4" />
                  List Property
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login?role=owner" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2 text-primary px-0 hover:bg-transparent">
                  <PlusCircle className="h-4 w-4" />
                  List Property
                </Button>
              </Link>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <UserCircle className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
              <Link href="/login?signup=true" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full justify-start gap-2 bg-primary hover:bg-primary/90">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
