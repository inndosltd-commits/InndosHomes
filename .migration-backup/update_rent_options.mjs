import fs from 'fs';

// 1. Update AddListing.tsx
const pathAddListing = 'client/src/pages/AddListing.tsx';
let addListingContent = fs.readFileSync(pathAddListing, 'utf8');

const oldSelectOptions = `<SelectItem value="rent">For Rent</SelectItem>`;
const newSelectOptions = `<SelectItem value="rent">For Rent</SelectItem>
                          <SelectItem value="rent-business">For Rent - Business Space</SelectItem>
                          <SelectItem value="rent-godown">For Rent - Godown</SelectItem>
                          <SelectItem value="rent-stall">For Rent - Stall</SelectItem>
                          <SelectItem value="rent-shop">For Rent - Shop</SelectItem>`;

if (addListingContent.includes(oldSelectOptions)) {
    addListingContent = addListingContent.replace(oldSelectOptions, newSelectOptions);
    fs.writeFileSync(pathAddListing, addListingContent);
    console.log("Updated AddListing.tsx Select options.");
} else {
    console.log("Could not find old options in AddListing.tsx");
}

// 2. Update Navbar.tsx
const pathNavbar = 'client/src/components/layout/Navbar.tsx';
let navbarContent = fs.readFileSync(pathNavbar, 'utf8');

// The desktop "Rent" link
const oldDesktopRent = `<Link href="/search?type=rent">
            <span className={\`text-sm font-medium transition-colors hover:text-primary cursor-pointer whitespace-nowrap \${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}\`}>
              {t('nav.rent')}
            </span>
          </Link>`;

const newDesktopRent = `<div className="relative group cursor-pointer">
            <Link href="/search?type=rent">
              <span className={\`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap \${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}\`}>
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
          </div>`;

// Replace desktop rent
if (navbarContent.includes(oldDesktopRent)) {
    navbarContent = navbarContent.replace(oldDesktopRent, newDesktopRent);
    console.log("Updated Navbar.tsx desktop rent.");
}

// The mobile "Rent" link
const oldMobileRent = `<Link href="/search?type=rent" onClick={() => setIsMobileMenuOpen(false)}>
            <span className={\`block text-lg font-medium transition-colors hover:text-primary cursor-pointer \${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}\`}>
              {t('nav.rent')}
            </span>
          </Link>`;

const newMobileRent = `<div>
            <Link href="/search?type=rent" onClick={() => setIsMobileMenuOpen(false)}>
              <span className={\`block text-lg font-medium transition-colors hover:text-primary cursor-pointer \${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}\`}>
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
          </div>`;

if (navbarContent.includes(oldMobileRent)) {
    navbarContent = navbarContent.replace(oldMobileRent, newMobileRent);
    console.log("Updated Navbar.tsx mobile rent.");
}

fs.writeFileSync(pathNavbar, navbarContent);
