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
import { BrandWordmark } from "./BrandWordmark";
import { AccountUpgradeDialog } from "@/components/auth/AccountUpgradeDialog";
import { usePublicCmsGlobal } from "@/lib/cms-global";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage, t } = useLanguage();
  const global = usePublicCmsGlobal();
  const header = global.header;
  const headerSections = header.layoutSections ?? [];
  const headerSectionVisible = (type: "brand" | "navigation" | "actions") => headerSections.some((section) => section.type === type && section.visible);
  const headerSectionOrder = (type: "brand" | "navigation" | "actions") => {
    const index = headerSections.findIndex((section) => section.type === type);
    return index < 0 ? 0 : index;
  };
  const announcements = headerSections.filter((section) => section.type === "announcement" && section.visible);
  const [navHash, setNavHash] = useState(window.location.hash);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

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

  const handleListPropertyClick = () => {
    if (user?.role === "tenant" || user?.role === "guest") {
      setShowUpgradeDialog(true);
      return;
    }
    window.location.hash = "/add-listing";
    setIsMenuOpen(false);
  };
  
  
  return (
    <>
    {announcements.map((section) => (
      <div key={section.id} className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em]" style={{ backgroundColor: header.accentColor, color: header.backgroundColor }}>
        {section.label}
      </div>
    ))}
    <nav
      className="sticky top-0 z-[600] w-full border-b backdrop-blur supports-[backdrop-filter]:bg-white/60"
      style={{ backgroundColor: `${header.backgroundColor}f2`, borderColor: header.borderColor, color: header.textColor }}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
         {headerSectionVisible("brand") && <Link href="/" style={{ order: headerSectionOrder("brand") }} className="flex items-center gap-4">
            <div className="flex items-center cursor-pointer">
             <BrandWordmark />
           </div>
         </Link>}

         {headerSectionVisible("navigation") && <div className="hidden lg:flex items-center gap-6 xl:gap-8" style={{ order: headerSectionOrder("navigation") }}>
          {header.navItems.filter((item) => item.visible && (!item.requiresAuth || user)).map((item) => {
            const active = location === item.href.split("?")[0];
            const children = item.children.filter((child) => child.visible);
            return (
              <div key={item.id} className="relative group cursor-pointer">
                <Link href={item.href}>
                  <span
                    className={`text-sm font-medium transition-colors cursor-pointer whitespace-nowrap pb-1 ${active ? "border-b-2" : ""}`}
                    style={{ color: active ? header.accentColor : header.mutedTextColor, borderColor: active ? header.accentColor : "transparent" }}
                  >
                    {item.label}
                  </span>
                </Link>
                {children.length > 0 && (
                  <div
                    className="absolute top-full left-0 mt-2 min-w-52 bg-white border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] py-2"
                    style={{ borderColor: header.borderColor }}
                  >
                    {children.map((child) => (
                      <Link href={child.href} key={child.id}>
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">{child.label}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
           })}
          </div>}

         {headerSectionVisible("actions") && <div className="flex items-center gap-2 md:gap-4" style={{ order: headerSectionOrder("actions") }}>
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

          {header.showListProperty && <Link href={user ? "#" : header.listPropertyHref} className="hidden lg:block" onClick={user ? (e) => { e.preventDefault(); handleListPropertyClick(); } : undefined}>
               <Button variant="ghost" size="sm" className="gap-2 font-medium hover:bg-gray-100 rounded-full px-3 xl:px-4 h-9" style={{ color: header.textColor }}>
              <PlusCircle className="h-4 w-4" />
              <span>{header.listPropertyLabel}</span>
            </Button>
          </Link>}

          <NotificationBell />

          {header.showAuthActions && user ? (
            <>
              <span className="hidden lg:inline text-sm font-medium whitespace-nowrap" style={{ color: header.mutedTextColor }}>
                Hi, {user.name.split(' ')[0]}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                 className="hidden lg:flex gap-2 rounded-full h-9 shadow-sm text-black px-3 xl:px-4"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden xl:inline">{t('nav.signout')}</span>
              </Button>
            </>
          ) : header.showAuthActions ? (
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
          ) : null}
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
             <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col bg-[#f8f7f2]">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div
                 className="p-4 border-b flex items-center gap-3 cursor-pointer"
                 style={{ borderColor: header.borderColor }}
                onClick={() => { setIsMenuOpen(false); window.location.hash = "/"; }}
              >
                <BrandWordmark />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-4">
                 <div className="h-px bg-[#d7d2c7] my-2" />
                
                <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-medium text-gray-500">Language</span>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as any)}
                     className="h-10 w-[120px] text-sm border border-[#d7d2c7] rounded-none px-3 bg-[#fbfaf6] outline-none focus:ring-2 focus:ring-[#1b1b1b] appearance-none"
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
                     className="h-10 w-[120px] text-sm border border-[#d7d2c7] rounded-none px-3 bg-[#fbfaf6] outline-none focus:ring-2 focus:ring-[#1b1b1b] appearance-none"
                    style={{ WebkitAppearance: 'none' }}
                  >
                    <option value="KES">KES</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                {header.navItems.filter((item) => item.visible && (!item.requiresAuth || user)).map((item) => (
                  <div key={item.id}>
                    <Link href={item.href} onClick={() => setIsMenuOpen(false)}>
                       <span className="block text-lg font-medium transition-colors cursor-pointer py-1" style={{ color: header.textColor }}>
                        {item.label}
                      </span>
                    </Link>
                    {item.children.filter((child) => child.visible).map((child) => (
                      <Link href={child.href} key={child.id} onClick={() => setIsMenuOpen(false)}>
                         <span className="block pl-4 text-sm py-1.5" style={{ color: header.mutedTextColor }}>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                ))}
                {header.showListProperty && user && (
                  <Link href="#" onClick={(e) => { e.preventDefault(); handleListPropertyClick(); }}>
                       <Button variant="ghost" className="w-full justify-start gap-2 px-0 hover:bg-transparent text-lg h-auto py-2" style={{ color: header.accentColor }}>
                        <PlusCircle className="h-5 w-5" />
                        {header.listPropertyLabel}
                      </Button>
                  </Link>
                )}
                {header.showAuthActions && user ? (
                   <Button variant="outline" className="w-full justify-start gap-2 h-12 text-lg mt-2" onClick={() => logout()}>
                    <LogOut className="h-5 w-5" />
                    {t('nav.signout')}
                  </Button>
                ) : header.showAuthActions ? (
                  <>
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
                ) : null}
              </div>
            </SheetContent>
           </Sheet>
         </div>}
      </div>
    </nav>
    <MobileTopNav />
    <AccountUpgradeDialog
      open={showUpgradeDialog}
      onOpenChange={setShowUpgradeDialog}
      onSuccess={() => { window.location.hash = "/add-listing"; }}
    />
    </>
  );
}
