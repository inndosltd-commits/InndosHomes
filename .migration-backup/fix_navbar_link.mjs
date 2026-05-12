import fs from 'fs';

const pathNavbar = 'client/src/components/layout/Navbar.tsx';
let navbarContent = fs.readFileSync(pathNavbar, 'utf8');

// Fix the desktop List Property button link
const oldDesktopLink = `<Link href={user ? "/dashboard" : "/login?role=owner"} className="hidden lg:block">
            <Button variant="ghost" size="sm" className="gap-2 text-black font-medium hover:bg-gray-100 rounded-full px-3 xl:px-4 h-9">
              <PlusCircle className="h-4 w-4" />
              <span>{t('nav.list_property')}</span>
            </Button>
          </Link>`;

const newDesktopLink = `<Link href={user ? "/add-listing" : "/login?role=owner"} className="hidden lg:block">
            <Button variant="ghost" size="sm" className="gap-2 text-black font-medium hover:bg-gray-100 rounded-full px-3 xl:px-4 h-9">
              <PlusCircle className="h-4 w-4" />
              <span>{t('nav.list_property')}</span>
            </Button>
          </Link>`;

if (navbarContent.includes(oldDesktopLink)) {
    navbarContent = navbarContent.replace(oldDesktopLink, newDesktopLink);
    console.log("Fixed desktop List Property link in Navbar");
}

// Fix the mobile List Property button link (if user is logged in)
// Looking at my previous cat output for Navbar:
/*
          {user ? (
            <>
              ...
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2 text-primary px-0 hover:bg-transparent text-lg h-auto py-2">
                  <PlusCircle className="h-5 w-5" />
                  {t('nav.list_property')}
                </Button>
              </Link>
*/

const oldMobileLink = `<Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2 text-primary px-0 hover:bg-transparent text-lg h-auto py-2">
                  <PlusCircle className="h-5 w-5" />
                  {t('nav.list_property')}
                </Button>
              </Link>`;

const newMobileLink = `<Link href="/add-listing" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2 text-primary px-0 hover:bg-transparent text-lg h-auto py-2">
                  <PlusCircle className="h-5 w-5" />
                  {t('nav.list_property')}
                </Button>
              </Link>`;

if (navbarContent.includes(oldMobileLink)) {
    navbarContent = navbarContent.replace(oldMobileLink, newMobileLink);
    console.log("Fixed mobile List Property link in Navbar");
}

fs.writeFileSync(pathNavbar, navbarContent);
