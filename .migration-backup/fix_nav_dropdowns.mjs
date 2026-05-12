import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Point 1 & 2: Rent and Buy dropdowns
// I'll update the Navbar to have dropdowns for "Rent" and "Buy" just like it currently might have for Rent.

// Currently, Rent has a dropdown:
// <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
//   <Link href="/search?type=rent-business"><div ...>Business Spaces</div></Link>
//   ...
// </div>

const rentDropdownRegex = /<div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">[\s\S]*?<\/div>\s*<\/div>\s*<Link href="\/search\?type=hostel">/;

const newRentDropdown = `<div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
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
          <Link href="/search?type=hostel">`;

if (rentDropdownRegex.test(content)) {
    content = content.replace(rentDropdownRegex, newRentDropdown);
}

// Now Buy Dropdown
const buyLinkRegex = /<Link href="\/search\?type=sale">\s*<span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer whitespace-nowrap \$\{location\.includes\('sale'\) \? 'text-primary' : 'text-muted-foreground'\}`}>[\s\S]*?<\/span>\s*<\/Link>/;

const newBuyLink = `<div className="relative group cursor-pointer">
            <Link href="/search?type=sale">
              <span className={\`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap \${location.includes('sale') ? 'text-primary' : 'text-muted-foreground'}\`}>
                {t('nav.buy')}
              </span>
            </Link>
            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
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
          </div>`;

if (buyLinkRegex.test(content)) {
    content = content.replace(buyLinkRegex, newBuyLink);
}

fs.writeFileSync(path, content);
console.log("Updated Navbar with new Rent and Buy dropdowns");
